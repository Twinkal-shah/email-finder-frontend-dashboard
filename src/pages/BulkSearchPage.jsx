import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { findEmail } from '../services/api.js'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx'
import useRealTimeCredits from '../hooks/useRealTimeCredits.js'

function normalizeConfidence(raw) {
  if (raw == null) return null
  if (typeof raw === 'string') {
    const s = raw.toLowerCase()
    if (s.includes('%')) {
      const n = parseFloat(s.replace('%',''))
      return isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null
    }
    if (s.includes('valid')) return 95
    if (s.includes('catch-all')) return 60
    if (s.includes('risky')) return 40
    if (s.includes('invalid')) return 5
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

export default function BulkSearchPage() {
  const [rows, setRows] = useState([])
  const [results, setResults] = useState([])
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [isRunning, setIsRunning] = useState(false)
  const { hasCredits, useCredits } = useRealTimeCredits()

  const pickFrom = (obj, keys) => {
    for (const key of keys) {
      const found = Object.keys(obj || {}).find(k => k.toLowerCase().replace(/\s+/g,'') === key.toLowerCase().replace(/\s+/g,''))
      if (found && obj[found] != null && String(obj[found]).trim() !== '') return String(obj[found]).trim()
    }
    return ''
  }

  const handleFile = async (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const text = ext === 'csv' ? await file.text() : null
    if (ext === 'csv') {
      const parsed = Papa.parse(text, { header: true })
      const cleaned = (parsed.data || []).filter(Boolean).map(r => ({
        name: pickFrom(r, ['Full Name', 'FullName', 'Name', 'full_name', 'name']),
        domain: pickFrom(r, ['Domain', 'Company Domain', 'company', 'Company', 'domain']),
        role: pickFrom(r, ['Role', 'Title', 'role'])
      }))
      setRows(cleaned.filter(r => r.name || r.domain))
    } else if (ext === 'xlsx' || ext === 'xls') {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json(sheet)
      const cleaned = (json || []).map(r => ({
        name: pickFrom(r, ['Full Name', 'FullName', 'Name', 'full_name', 'name']),
        domain: pickFrom(r, ['Domain', 'Company Domain', 'company', 'Company', 'domain']),
        role: pickFrom(r, ['Role', 'Title', 'role'])
      }))
      setRows(cleaned.filter(r => r.name || r.domain))
    }
  }

  const mapped = useMemo(() => rows.map(r => ({
    domain: (r.domain || '').trim(),
    name: (r.name || '').trim(),
    role: (r.role || '').trim(),
  })).filter(r => r.domain && r.name), [rows])

  const runBatches = async () => {
    // Check if user has credits for bulk email finding
    if (!hasCredits('find')) {
      alert('Insufficient credits for bulk email finding. Please upgrade your plan.')
      return
    }

    const concurrency = 5
    setIsRunning(true)
    setResults([])
    setProgress({ done: 0, total: mapped.length })

    let index = 0
    const next = async () => {
      if (index >= mapped.length) return
      const current = mapped[index++]
      try {
        const resp = await findEmail({ domain: current.domain, name: current.name, role: current.role })
        const payload = resp.data
        const items = Array.isArray(payload) ? payload : (payload ? [payload] : [])
        setResults(prev => [
          ...prev,
          ...items.map(it => ({
            ...it,
            name: it.name || it.full_name || current.name,
            domain: current.domain
          }))
        ])
        
        // Deduct credits for successful email finding
        if (items.length > 0) {
          await useCredits('find', items.length)
        }
      } catch (e) {
        setResults(prev => [...prev, { name: current.name, domain: current.domain, email: '-', confidence: '-', error: e.message }])
      } finally {
        setProgress(prev => ({ ...prev, done: prev.done + 1 }))
        await next()
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, mapped.length) }, () => next()))

    setIsRunning(false)
  }

  const exportCsv = () => {
    const forCsv = results.map((r) => ({
      Name: r.name,
      Email: r.email || '-',
      catch_all: r.catch_all ?? '',
      domain: r.domain ?? '',
      mx: Array.isArray(r.mx) ? r.mx.join(', ') : (typeof r.mx === 'object' && r.mx !== null ? JSON.stringify(r.mx) : (r.mx ?? '')) ,
      status: r.status ?? ''
    }))
    const csv = Papa.unparse(forCsv)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk-search-results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const normalized = results.map((r) => {
    const c = normalizeConfidence(r.confidence ?? r.confidence_score ?? r.score ?? r.probability ?? r.status)
    return { ...r, _confidence: c }
  })

  return (
    <div className="space-y-6">
      <div className="text-[13px] text-center py-2 bg-accent/50 border border-border rounded-md">Start your 3 days trial today.</div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Bulk Email Finder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <label className="inline-block">
              <span className="sr-only">Upload List</span>
              <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={(e)=> e.target.files?.[0] && handleFile(e.target.files[0])} />
              <div className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer inline-flex items-center transition-colors">Upload CSV/XLSX</div>
            </label>
            <div className="text-sm text-muted-foreground">Expected columns: <span className="font-medium text-foreground">Full Name</span> and <span className="font-medium text-foreground">Domain</span>. Optional: <span className="font-medium text-foreground">Role</span>.</div>
          </div>
          <div className="text-muted-foreground text-xs mt-2">You can also add rows manually below.</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <button onClick={() => setRows(prev => [...prev, { name: '', domain: '', role: '' }])} className="px-3 py-2 rounded-md border border-border hover:bg-accent hover:text-accent-foreground transition-colors">Add Row</button>
              <button onClick={runBatches} disabled={!mapped.length || isRunning} className="px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {isRunning ? 'Running...' : 'Run Bulk Search'}
              </button>
              <button onClick={exportCsv} disabled={!normalized.length} className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-60 transition-colors">Export CSV</button>
            </div>
            <div className="w-full h-2 bg-muted rounded">
              <div className="h-2 bg-primary rounded transition-all duration-300" style={{ width: `${progress.total ? (progress.done/progress.total)*100 : 0}%` }} />
            </div>
            <div className="text-sm text-muted-foreground">Rows ready: {mapped.length}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left p-3 text-foreground font-medium" style={{minWidth:'180px'}}>Full Name</th>
                  <th className="text-left p-3 text-foreground font-medium" style={{minWidth:'160px'}}>Domain</th>
                  <th className="text-left p-3 text-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3"><input className="w-full border border-input rounded-md px-2 py-1 bg-background text-foreground" value={r.name || ''} onChange={(e)=> setRows(prev => prev.map((x,idx)=> idx===i? { ...x, name: e.target.value }: x))} placeholder="e.g., Jane Doe" /></td>
                    <td className="p-3"><input className="w-full border border-input rounded-md px-2 py-1 bg-background text-foreground" value={r.domain || ''} onChange={(e)=> setRows(prev => prev.map((x,idx)=> idx===i? { ...x, domain: e.target.value }: x))} placeholder="company.com" /></td>
                    <td className="p-3"><button className="text-destructive hover:text-destructive/80 transition-colors" onClick={()=> setRows(prev => prev.filter((_,idx)=> idx!==i))}>Remove</button></td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="p-3 text-muted-foreground text-center" colSpan={3}>Upload a file or click "Add Row" to start building your list.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {!!normalized.length && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left p-3 text-foreground font-medium">Name</th>
                    <th className="text-left p-3 text-foreground font-medium">Email</th>
                    <th className="text-left p-3 text-foreground font-medium">Catch All</th>
                    <th className="text-left p-3 text-foreground font-medium">Domain</th>
                    <th className="text-left p-3 text-foreground font-medium">MX</th>
                    <th className="text-left p-3 text-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {normalized.map((r, i) => (
                    <tr key={i} className="border-b border-border hover:bg-muted/30">
                       <td className="p-3 text-foreground">{(r.name && typeof r.name === 'object') ? JSON.stringify(r.name) : (r.name || '-')}</td>
                      <td className="p-3 text-foreground">{r.email || '-'}</td>
                      <td className="p-3 text-foreground">{r.catch_all == null ? '-' : String(r.catch_all)}</td>
                      <td className="p-3 text-foreground">{r.domain || '-'}</td>
                      <td className="p-3 text-foreground">{Array.isArray(r.mx) ? r.mx.join(', ') : (r.mx && typeof r.mx === 'object' ? JSON.stringify(r.mx) : (r.mx == null ? '-' : String(r.mx)))}</td>
                       <td className="p-3 text-foreground">{(r.status && typeof r.status === 'object') ? JSON.stringify(r.status) : (r.status || '-')}</td>
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