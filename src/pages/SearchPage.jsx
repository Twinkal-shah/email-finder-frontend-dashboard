import { useState, useEffect } from 'react'
import { useFindResults } from '../contexts/findResults.jsx'
import { useMutation } from '@tanstack/react-query'
import Papa from 'papaparse'
import { useEmailService } from '../services/emailService.js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx'

function normalizeConfidence(raw, statusLike, validLike) {
  if (raw == null) {
    if (typeof statusLike === 'string') {
      const s = statusLike.toLowerCase()
      if (s.includes('valid')) return 95
      if (s.includes('catch-all')) return 60
      if (s.includes('risky')) return 40
      if (s.includes('invalid')) return 5
    }
    if (typeof validLike === 'boolean') return validLike ? 95 : 5
    return null
  }
  if (typeof raw === 'string') {
    const s = raw.toLowerCase()
    if (s.includes('%')) {
      const n = parseFloat(s.replace('%',''))
      return isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null
    }
    if (s.includes('high')) return 90
    if (s.includes('medium')) return 65
    if (s.includes('low')) return 35
    const n = Number(s)
    if (!Number.isNaN(n)) return n <= 1 ? Math.round(n * 100) : Math.round(n)
    return null
  }
  if (typeof raw === 'number') return raw <= 1 ? Math.round(raw * 100) : Math.round(raw)
  return null
}

function pickName(record, fallbackName) {
  const joined = [record?.first_name, record?.last_name].filter(Boolean).join(' ').trim()
  const candidate = record?.name ?? record?.full_name ?? joined
  if (typeof candidate === 'string') return candidate || (fallbackName || '-')
  if (candidate && typeof candidate === 'object') {
    // Attempt common shapes, else stringify
    const composed = [candidate.first_name, candidate.last_name, candidate.value]
      .filter(Boolean)
      .join(' ')
      .trim()
    return composed || JSON.stringify(candidate)
  }
  return fallbackName || '-'
}

function ConfidencePill({ value }) {
  const v = value ?? 0
  const color = v >= 80 ? 'bg-green-600' : v >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="min-w-24">
      <div className="text-xs mb-1 text-gray-600">{value == null ? '-' : `${v}%`}</div>
      <div className="h-2 w-full bg-gray-200 rounded">
        <div className={`h-2 ${color} rounded`} style={{ width: `${Math.min(Math.max(v,0),100)}%` }} />
      </div>
    </div>
  )
}

export default function SearchPage() {
  const [domainOrCompany, setDomainOrCompany] = useState('')
  const [domain, setDomain] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState('Person')
  const [formError, setFormError] = useState('')
  const { rows: accumulatedRows, appendRows } = useFindResults()
  const { findEmail } = useEmailService()

  const findMutation = useMutation({
    mutationFn: (payload) => findEmail(payload),
    onSuccess: (res) => {
      const payload = res?.data
      const rows = Array.isArray(payload) ? payload : (payload ? [payload] : [])
      const normalizedRows = rows.map((r) => {
        const confidenceRaw = r.confidence ?? r.confidence_score ?? r.score ?? r.probability ?? r.confidencePercent
        const statusLike = r.status ?? r.result ?? r.verdict
        const validLike = r.valid ?? r.is_valid
        return {
          ...r,
          _name: pickName(r, name),
          _confidence: normalizeConfidence(confidenceRaw, statusLike, validLike),
        }
      })
      appendRows(normalizedRows)
    },
    onSettled: () => setFormError(''),
  })

  const parseNames = (value) => value.split(',').map(n => n.trim()).filter(Boolean)

  const onSubmit = (e) => {
    e.preventDefault()
    setFormError('')

    if (mode === 'Company') {
      if (!domainOrCompany.trim()) {
        setFormError('Please enter a company or domain.')
        return
      }
      const isDomain = /\./.test(domainOrCompany)
      findMutation.mutate({ domain: isDomain ? domainOrCompany.trim() : undefined, company: !isDomain ? domainOrCompany.trim() : undefined, all: true })
    } else {
      if (!domain.trim()) {
        setFormError('Please enter a domain or company.')
        return
      }
      const names = parseNames(name)
      if (!names.length) {
        setFormError('Names must be a non-empty list (comma-separated for multiple).')
        return
      }
      findMutation.mutate({ domain: domain.trim(), names, role: mode })
    }
  }

  const payload = findMutation.data?.data
  const rows = Array.isArray(payload) ? payload : (payload ? [payload] : [])
  const normalizedRows = rows.map((r) => {
    const confidenceRaw = r.confidence ?? r.confidence_score ?? r.score ?? r.probability ?? r.confidencePercent
    const statusLike = r.status ?? r.result ?? r.verdict
    const validLike = r.valid ?? r.is_valid
    return {
      ...r,
      _name: pickName(r, name),
      _confidence: normalizeConfidence(confidenceRaw, statusLike, validLike),
    }
  })
  const top = normalizedRows[0]
  const tableRows = accumulatedRows

  const exportCsv = () => {
    const forCsv = tableRows.map((r) => ({
      Name: r._name,
      Email: r.email || '-',
      catch_all: r.catch_all ?? '',
      connections: Array.isArray(r.connections) ? r.connections.join(', ') : (r.connections ?? ''),
      domain: r.domain ?? '',
      mx: Array.isArray(r.mx) ? r.mx.join(', ') : (typeof r.mx === 'object' && r.mx !== null ? JSON.stringify(r.mx) : (r.mx ?? '')),
      status: r.status ?? '',
      time_exec: r.time_exec ?? '',
      user_name: r.user_name ?? '',
      ver_ops: Array.isArray(r.ver_ops) ? r.ver_ops.join(', ') : (typeof r.ver_ops === 'object' && r.ver_ops !== null ? JSON.stringify(r.ver_ops) : (r.ver_ops ?? '')),
    }))
    const csv = Papa.unparse(forCsv)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'search-results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="text-[13px] text-center py-2 bg-accent/50 border border-border rounded-md">Start your 3 days trial today.</div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <h2 className="text-2xl font-semibold text-center lg:text-left">Start your Search</h2>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium mb-4">Search</div>
            <div className="flex flex-col gap-2">
              {/* <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="mode" checked={mode==='Company'} onChange={()=>setMode('Company')} />
                <span>Company search</span>
              </label> */}
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="mode" checked={mode==='Person'} onChange={()=>setMode('Person')} />
                <span>Person search</span>
              </label>
            </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={onSubmit} className="space-y-3">
                {mode === 'Company' ? (
                  <div>
                    <div className="text-sm mb-1">Company or domain:</div>
                    <input value={domainOrCompany} onChange={(e)=>setDomainOrCompany(e.target.value)} placeholder="company.com or Company Inc" className="border border-input rounded-md px-3 py-2 w-full bg-background" />
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="text-sm mb-1">Domain (recommended) or company name:</div>
                      <input value={domain} onChange={(e)=>setDomain(e.target.value)} placeholder="company.com" className="border border-input rounded-md px-3 py-2 w-full bg-background" />
                    </div>
                    <div>
                      <div className="text-sm mb-1">Full name(s):</div>
                      <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Jane Doe, John Doe" className="border border-input rounded-md px-3 py-2 w-full bg-background" />
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 disabled:opacity-60 transition-colors" disabled={findMutation.isPending}>
                    {findMutation.isPending ? 'Searching...' : 'Search'}
                  </button>
                  <button type="button" onClick={()=>{ setDomain(''); setName(''); setDomainOrCompany(''); setFormError('') }} className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-4 py-2 transition-colors">
                    Clear
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {(formError || findMutation.isError) && (
            <div className="text-red-600 text-sm">{formError || findMutation.error?.message || 'Error'}</div>
          )}

          {top && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Top match</div>
                    <div className="text-base font-medium">{top._name}</div>
                    <div className="text-sm text-foreground">{top.email || '-'}</div>
                  </div>
                  {/* <ConfidencePill value={top._confidence} /> */}
                </div>
              </CardContent>
            </Card>
          )}

          {/* {payload && (
            <details className="text-xs text-gray-600">
              <summary className="cursor-pointer">Raw response</summary>
              <pre className="bg-gray-50 border rounded p-3 overflow-auto max-h-64">{JSON.stringify(payload, null, 2)}</pre>
            </details>
          )} */}
        </div>

        <div className="hidden lg:flex items-center justify-center">
          <div className="w-48 h-48 rounded-full border-2 border-dashed text-gray-300 flex items-center justify-center">⏱️</div>
        </div>
      </div>

      {!!tableRows.length && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Search Results</CardTitle>
              <button onClick={exportCsv} className="px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Export CSV</button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 border border-border">Name</th>
                    <th className="text-left p-2 border border-border">Email</th>
                    <th className="text-left p-2 border border-border">catch_all</th>
                    <th className="text-left p-2 border border-border">domain</th>
                    <th className="text-left p-2 border border-border">mx</th>
                    <th className="text-left p-2 border border-border">status</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="p-2 border border-border">{r._name}</td>
                      <td className="p-2 border border-border">{r.email || '-'}</td>
                      <td className="p-2 border border-border">{r.catch_all == null ? '-' : String(r.catch_all)}</td>
                      <td className="p-2 border border-border">{r.domain || '-'}</td>
                      <td className="p-2 border border-border">{Array.isArray(r.mx) ? r.mx.join(', ') : (r.mx && typeof r.mx === 'object' ? JSON.stringify(r.mx) : (r.mx == null ? '-' : String(r.mx)))}</td>
                      <td className="p-2 border border-border">{(r.status && typeof r.status === 'object') ? JSON.stringify(r.status) : (r.status || '-')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}