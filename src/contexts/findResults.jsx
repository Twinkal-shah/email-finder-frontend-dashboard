import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'find_results'

const FindResultsContext = createContext(null)

export function FindResultsProvider({ children }) {
  const [rows, setRows] = useState([])

  // Hydrate from localStorage on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setRows(parsed)
      }
    } catch {}
  }, [])

  // Persist to localStorage whenever rows change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
    } catch {}
  }, [rows])

  const value = useMemo(() => ({
    rows,
    setRows,
    appendRows: (newRows) => setRows((prev) => [...prev, ...newRows]),
    clearRows: () => setRows([]),
  }), [rows])

  return (
    <FindResultsContext.Provider value={value}>
      {children}
    </FindResultsContext.Provider>
  )
}

export function useFindResults() {
  const ctx = useContext(FindResultsContext)
  if (!ctx) throw new Error('useFindResults must be used within FindResultsProvider')
  return ctx
}


