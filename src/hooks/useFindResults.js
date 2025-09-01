import { useContext } from 'react'
import { FindResultsContext } from '../contexts/findResults'

export function useFindResults() {
  const ctx = useContext(FindResultsContext)
  if (!ctx) throw new Error('useFindResults must be used within FindResultsProvider')
  return ctx
}