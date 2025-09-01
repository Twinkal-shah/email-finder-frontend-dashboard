import { createContext, useEffect, useMemo, useState } from 'react'
import { STORAGE_KEY } from '../constants/storage.js'

export const FindResultsContext = createContext(null)

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
    } catch (error) {
      console.error('Failed to load find results from localStorage:', error)
    }
  }, [])

  // Persist to localStorage whenever rows change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
    } catch (error) {
      console.error('Failed to save find results to localStorage:', error)
    }
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


