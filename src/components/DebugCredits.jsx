import React from 'react'
import { useAuth } from '../contexts/auth.jsx'
import { useRealTimeCredits } from '../hooks/useRealTimeCredits.js'

export function DebugCredits() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { creditData, refetch } = useRealTimeCredits(user)
  const { find, verify, loading: creditsLoading } = creditData

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-sm z-50">
      <h3 className="font-bold text-sm mb-2">🐛 Debug Info</h3>
      
      <div className="text-xs space-y-1">
        <div><strong>Auth Loading:</strong> {authLoading ? 'Yes' : 'No'}</div>
        <div><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</div>
        <div><strong>User ID:</strong> {user?.id || 'None'}</div>
        <div><strong>User Email:</strong> {user?.email || 'None'}</div>
        
        <hr className="my-2" />
        
        <div><strong>Credits Loading:</strong> {creditsLoading ? 'Yes' : 'No'}</div>
        <div><strong>Find Credits:</strong> {find}</div>
        <div><strong>Verify Credits:</strong> {verify}</div>
        <div><strong>Plan:</strong> Free (default)</div>
        <div><strong>Full Name:</strong> {user?.email?.split('@')[0] || 'User'}</div>
      </div>
      
      <button 
        onClick={() => {
          console.log('🔍 Current Auth State:', { user, isAuthenticated, authLoading })
          console.log('🔍 Current Credits State:', { find, verify, plan, fullName, creditsLoading, error })
        }}
        className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded"
      >
        Log to Console
      </button>
    </div>
  )
}

export default DebugCredits