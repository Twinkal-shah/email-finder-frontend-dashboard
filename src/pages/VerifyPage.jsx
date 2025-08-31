import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { verifyEmail } from '../services/api.js'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx'
import { useCredits } from '../services/creditManager.jsx'

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
  const { hasCredits, useCredits } = useCredits()

  const verifyMutation = useMutation({ 
    mutationFn: (payload) => verifyEmail(payload),
    onSuccess: async (res) => {
      // Deduct credits for successful email verification
      if (res?.data) {
        await useCredits('verify', 1)
      }
    }
  })

  const onVerify = (e) => {
    e.preventDefault()
    if (!email) return
    
    // Check if user has credits for email verification
    if (!hasCredits('verify')) {
      alert('Insufficient credits for email verification. Please upgrade your plan.')
      return
    }
    
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
      <div className="text-[13px] text-center py-2 bg-accent/50 border border-border rounded-md">Emails found by Email Finder are already verified. You only need to use the Verifier for emails found elsewhere.</div>

      <Card>
        <CardHeader>
          <CardTitle>Single Email Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onVerify} className="flex flex-col sm:flex-row gap-3">
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="matt@example.com" className="border border-input rounded-md px-3 py-2 w-full max-w-md bg-background" />
          <button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 disabled:opacity-60 transition-colors" disabled={verifyMutation.isPending}>
              {verifyMutation.isPending ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          {verifyMutation.isError && (
            <div className="text-destructive text-sm mt-3">{verifyMutation.error?.message || 'Error'}</div>
          )}

          {single && (
            <div className="text-sm space-y-2 mt-4">
              <div className="font-medium">Status: <span className="px-2 py-1 rounded bg-muted">{singleStatus}</span></div>
              <div>
                <div className="text-muted-foreground mb-1">Details</div>
                <pre className="bg-muted/50 border border-border rounded p-3 overflow-auto max-h-64 text-xs">{JSON.stringify(single, null, 2)}</pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verify Your List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={(e)=> e.target.files?.[0] && handleFile(e.target.files[0])} className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <button onClick={onBulkVerify} className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 rounded-md transition-colors" disabled={!bulkRows.length}>Start Bulk Verify</button>
              <button onClick={exportBulkCsv} className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-2 rounded-md disabled:opacity-60 transition-colors" disabled={!bulkResults.length}>Export CSV</button>
              <div className="text-sm text-muted-foreground">Rows loaded: {bulkRows.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!!bulkResults.length && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Verification Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border px-4 py-2 text-left text-foreground">Email</th>
                    <th className="border border-border px-4 py-2 text-left text-foreground">Status</th>
                    <th className="border border-border px-4 py-2 text-left text-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResults.map((result, index) => (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="border border-border px-4 py-2 text-foreground">{result.email}</td>
                      <td className="border border-border px-4 py-2">
                        <span className="px-2 py-1 rounded bg-muted text-sm text-foreground">{result.status}</span>
                      </td>
                      <td className="border border-border px-4 py-2">
                        <pre className="text-xs overflow-auto max-h-20 text-muted-foreground">{JSON.stringify(result._raw, null, 2)}</pre>
                      </td>
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