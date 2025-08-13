import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { findEmail } from '../services/api.js'

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
      <div className="text-[13px] text-center py-2 bg-green-50 border border-green-100 rounded">Start your 3 days trial today.</div>

      <div className="border rounded-lg p-6 bg-white">
        <h2 className="text-2xl font-semibold mb-3">Bulk Email Finder</h2>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <label className="inline-block">
            <span className="sr-only">Upload List</span>
            <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={(e)=> e.target.files?.[0] && handleFile(e.target.files[0])} />
            <div className="px-4 py-2 rounded-md bg-blue-600 text-white cursor-pointer inline-flex items-center">Upload CSV/XLSX</div>
          </label>
          <div className="text-sm text-gray-600">Expected columns: <span className="font-medium">Full Name</span> and <span className="font-medium">Domain</span>. Optional: <span className="font-medium">Role</span>.</div>
        </div>
        <div className="text-gray-500 text-xs mt-2">You can also add rows manually below.</div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setRows(prev => [...prev, { name: '', domain: '', role: '' }])} className="px-3 py-2 rounded-md border">Add Row</button>
          <button onClick={runBatches} disabled={!mapped.length || isRunning} className="px-3 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60">
            {isRunning ? 'Running...' : 'Run Bulk Search'}
          </button>
          <button onClick={exportCsv} disabled={!normalized.length} className="px-3 py-2 rounded-md bg-gray-900 text-white disabled:opacity-60">Export CSV</button>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded">
          <div className="h-2 bg-blue-600 rounded" style={{ width: `${progress.total ? (progress.done/progress.total)*100 : 0}%` }} />
        </div>
        <div className="text-sm text-gray-600">Rows ready: {mapped.length}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2 border" style={{minWidth:'180px'}}>Full Name</th>
              <th className="text-left p-2 border" style={{minWidth:'160px'}}>Domain</th>
              {/* <th className="text-left p-2 border">Role (optional)</th> */}
              <th className="text-left p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="p-2 border"><input className="w-full border rounded px-2 py-1" value={r.name || ''} onChange={(e)=> setRows(prev => prev.map((x,idx)=> idx===i? { ...x, name: e.target.value }: x))} placeholder="e.g., Jane Doe" /></td>
                <td className="p-2 border"><input className="w-full border rounded px-2 py-1" value={r.domain || ''} onChange={(e)=> setRows(prev => prev.map((x,idx)=> idx===i? { ...x, domain: e.target.value }: x))} placeholder="company.com" /></td>
                {/* <td className="p-2 border"><input className="w-full border rounded px-2 py-1" value={r.role || ''} onChange={(e)=> setRows(prev => prev.map((x,idx)=> idx===i? { ...x, role: e.target.value }: x))} placeholder="e.g., SDR" /></td> */}
                <td className="p-2 border"><button className="text-red-600" onClick={()=> setRows(prev => prev.filter((_,idx)=> idx!==i))}>Remove</button></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-2 border text-gray-500" colSpan={4}>Upload a file or click "Add Row" to start building your list.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!!normalized.length && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border bg-white mt-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Name</th>
                <th className="text-left p-2 border">Email</th>
                <th className="text-left p-2 border">catch_all</th>
                <th className="text-left p-2 border">domain</th>
                <th className="text-left p-2 border">mx</th>
                <th className="text-left p-2 border">status</th>
              </tr>
            </thead>
            <tbody>
              {normalized.map((r, i) => (
                <tr key={i}>
                  <td className="p-2 border">{r.name}</td>
                  <td className="p-2 border">{r.email || '-'}</td>
                  <td className="p-2 border">{r.catch_all == null ? '-' : String(r.catch_all)}</td>
                  <td className="p-2 border">{r.domain || '-'}</td>
                  <td className="p-2 border">{Array.isArray(r.mx) ? r.mx.join(', ') : (r.mx && typeof r.mx === 'object' ? JSON.stringify(r.mx) : (r.mx == null ? '-' : String(r.mx)))}</td>
                  <td className="p-2 border">{r.status || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 