import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/auth.jsx'
import { getUserProfile } from '../api/user.js'
import useRealTimeCredits from '../hooks/useRealTimeCredits.js'

export default function CreditDebugger() {
  const { user, isAuthenticated, tokens } = useAuth()
  const { credits, loading, error, refreshCredits } = useRealTimeCredits()
  const [debugInfo, setDebugInfo] = useState({})
  const [manualProfile, setManualProfile] = useState(null)
  const [manualError, setManualError] = useState(null)

  // Manual profile fetch for debugging
  const fetchManualProfile = async () => {
    if (!user?.id) {
      setManualError('No user ID available')
      return
    }

    try {
      setManualError(null)
      console.log('🔍 Manually fetching profile for user ID:', user.id)
      const profile = await getUserProfile(user.id)
      console.log('✅ Manual profile fetch result:', profile)
      setManualProfile(profile)
    } catch (error) {
      console.error('❌ Manual profile fetch error:', error)
      setManualError(error.message)
    }
  }

  // Collect debug information
  useEffect(() => {
    const info = {
      timestamp: new Date().toISOString(),
      authentication: {
        isAuthenticated,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.name,
        hasTokens: !!tokens
      },
      credits: {
        find: credits.find,
        verify: credits.verify,
        loading,
        error
      },
      localStorage: {
        authUser: localStorage.getItem('auth_user'),
        authTokens: localStorage.getItem('auth_tokens')
      },
      environment: {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
      }
    }
    
    setDebugInfo(info)
    console.log('🔧 Credit Debug Info:', info)
  }, [user, isAuthenticated, tokens, credits, loading, error])

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900">Credit Debugger</h3>
        <button
          onClick={() => document.getElementById('credit-debugger').style.display = 'none'}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
      
      {/* Authentication Status */}
      <div className="mb-3">
        <h4 className="font-medium text-sm text-gray-700 mb-1">Authentication</h4>
        <div className="text-xs space-y-1">
          <div className={`${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
            Status: {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </div>
          <div className="text-gray-600">
            User ID: {user?.id || 'None'}
          </div>
          <div className="text-gray-600">
            Email: {user?.email || 'None'}
          </div>
          <div className="text-gray-600">
            Tokens: {tokens ? 'Present' : 'None'}
          </div>
        </div>
      </div>

      {/* Credit Status */}
      <div className="mb-3">
        <h4 className="font-medium text-sm text-gray-700 mb-1">Credits</h4>
        <div className="text-xs space-y-1">
          <div className="text-gray-600">
            Find: {credits.find}
          </div>
          <div className="text-gray-600">
            Verify: {credits.verify}
          </div>
          <div className={`${loading ? 'text-yellow-600' : 'text-gray-600'}`}>
            Loading: {loading ? 'Yes' : 'No'}
          </div>
          {error && (
            <div className="text-red-600">
              Error: {error}
            </div>
          )}
        </div>
      </div>

      {/* Manual Profile Test */}
      <div className="mb-3">
        <h4 className="font-medium text-sm text-gray-700 mb-1">Manual Profile Test</h4>
        <button
          onClick={fetchManualProfile}
          className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          disabled={!user?.id}
        >
          Fetch Profile
        </button>
        {manualProfile && (
          <div className="text-xs mt-1 text-green-600">
            ✅ Find: {manualProfile.credits_find}, Verify: {manualProfile.credits_verify}
          </div>
        )}
        {manualError && (
          <div className="text-xs mt-1 text-red-600">
            ❌ {manualError}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={refreshCredits}
          className="w-full text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
        >
          Refresh Credits
        </button>
        <button
          onClick={() => console.log('🔧 Full Debug Info:', debugInfo)}
          className="w-full text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
        >
          Log Debug Info
        </button>
      </div>

      {/* Quick Info */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Last Updated: {new Date(debugInfo.timestamp || Date.now()).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

// Add to window for easy access
if (typeof window !== 'undefined') {
  window.showCreditDebugger = () => {
    const debuggerElement = document.getElementById('credit-debugger')
    if (debuggerElement) {
      debuggerElement.style.display = 'block'
    }
  }
}