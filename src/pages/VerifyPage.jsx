import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { verifyEmail } from '../services/api.js'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// function normalizeVerifyStatus(payload) {
//   if (!payload) return '-'
//   if (typeof payload === 'string') return payload
//   if (typeof payload.status === 'string' && payload.status) return payload.status
//   if (typeof payload.result === 'string' && payload.result) return payload.result
//   if (typeof payload.verdict === 'string' && payload.verdict) return payload.verdict
//   if (typeof payload.valid === 'boolean') return payload.valid ? 'valid' : 'invalid'
//   if (typeof payload.is_valid === 'boolean') return payload.is_valid ? 'valid' : 'invalid'
//   return '-'
// }

function normalizeVerifyStatus(payload) {
  if (!payload) return '-'
  if (typeof payload === 'string') return payload
  if (typeof payload.status === 'string' && payload.status) return payload.status
  if (typeof payload.result === 'string' && payload.result) return payload.result
  if (typeof payload.verdict === 'string' && payload.verdict) return payload.verdict
  if (typeof payload.valid === 'boolean') return payload.valid ? 'valid' : 'invalid'
  if (payload.valid && typeof payload.valid.status === 'string') return payload.valid.status
  if (typeof payload.is_valid === 'boolean') return payload.is_valid ? 'valid' : 'invalid'
  return '-'
}


export default function VerifyPage() {
  const [email, setEmail] = useState('')
  const [bulkRows, setBulkRows] = useState([])
  const [bulkResults, setBulkResults] = useState([])

  const verifyMutation = useMutation({ mutationFn: (payload) => verifyEmail(payload) })

  const onVerify = (e) => {
    e.preventDefault()
    if (!email) return
    verifyMutation.mutate({ email })
  }

  const handleFile = async (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const text = ext === 'csv' ? await file.text() : null
    if (ext === 'csv') {
      const parsed = Papa.parse(text, { header: true })
      setBulkRows(parsed.data.filter(Boolean))
    } else if (ext === 'xlsx' || ext === 'xls') {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json(sheet)
      setBulkRows(json)
    }
  }

  const onBulkVerify = async () => {
    const emails = bulkRows.map((r) => r.email || r.Email || r.EMail || r.eMail).filter(Boolean)
    if (!emails.length) return

    setBulkResults([])
    for (const e of emails) {
      try {
        const resp = await verifyEmail({ email: e })
        const data = resp.data || {}
        const status = normalizeVerifyStatus(data)
        setBulkResults(prev => [...prev, { email: e, status, _raw: data }])
      } catch (err) {
        setBulkResults(prev => [...prev, { email: e, status: 'error' }])
      }
    }
  }

  const single = verifyMutation.data?.data
  const singleStatus = normalizeVerifyStatus(single)

  const exportBulkCsv = () => {
    if (!bulkResults.length) return
    const csv = Papa.unparse(bulkResults.map(r => ({ Email: r.email, Status: r.status })))
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'verify-results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="text-[13px] text-center py-2 bg-green-50 border border-green-100 rounded">Emails found by Anymail Finder are already verified. You only need to use the Verifier for emails found elsewhere.</div>

      <div className="border rounded-lg p-5 bg-white">
        <h3 className="text-xl font-semibold mb-4">Single Email Verification</h3>
        <form onSubmit={onVerify} className="flex gap-3">
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="matt@example.com" className="border rounded-md px-3 py-2 w-full max-w-md" />
          <button type="submit" className="bg-blue-600 text-white rounded-md px-4 py-2 disabled:opacity-60" disabled={verifyMutation.isPending}>
            {verifyMutation.isPending ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        {verifyMutation.isError && (
          <div className="text-red-600 text-sm mt-3">{verifyMutation.error?.message || 'Error'}</div>
        )}

        {single && (
          <div className="text-sm space-y-2 mt-4">
            <div className="font-medium">Status: <span className="px-2 py-1 rounded bg-gray-100">{singleStatus}</span></div>
            <div>
              <div className="text-gray-600 mb-1">Details</div>
              <pre className="bg-gray-50 border rounded p-3 overflow-auto max-h-64 text-xs">{JSON.stringify(single, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>

      <div className="border rounded-lg p-5 bg-white">
        <h3 className="text-xl font-semibold mb-4">Verify Your List</h3>
        <div className="space-y-3">
          <input type="file" accept=".csv,.xlsx,.xls" onChange={(e)=> e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div className="flex gap-2">
            <button onClick={onBulkVerify} className="bg-gray-900 text-white px-3 py-2 rounded-md" disabled={!bulkRows.length}>Start Bulk Verify</button>
            <button onClick={exportBulkCsv} className="bg-blue-600 text-white px-3 py-2 rounded-md disabled:opacity-60" disabled={!bulkResults.length}>Export CSV</button>
            <div className="text-sm text-gray-600">Rows loaded: {bulkRows.length}</div>
          </div>
        </div>
      </div>

      {!!bulkResults.length && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Email</th>
                <th className="text-left p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {bulkResults.map((r, i) => (
                <tr key={i}>
                  <td className="p-2 border">{r.email}</td>
                  <td className="p-2 border">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 