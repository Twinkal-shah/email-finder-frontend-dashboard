import React, { useState } from 'react'
import { useAuth } from '../contexts/auth.jsx'
import { getUserProfile } from '../api/user.js'

export function TestCredits() {
  const { user, isAuthenticated } = useAuth()
  const [testResult, setTestResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const testGetProfile = async () => {
    if (!user?.id) {
      setTestResult('No user ID available')
      return
    }

    setLoading(true)
    try {
      console.log('🧪 Testing getUserProfile for user:', user.id)
      const profile = await getUserProfile(user.id)
      console.log('🧪 Profile result:', profile)
      setTestResult(JSON.stringify(profile, null, 2))
    } catch (error) {
      console.error('🧪 Profile error:', error)
      setTestResult(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-md z-50">
      <h3 className="font-bold text-sm mb-2">🧪 Test Credits</h3>
      
      <div className="text-xs space-y-2">
        <div><strong>User ID:</strong> {user?.id || 'None'}</div>
        <div><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</div>
        
        <button 
          onClick={testGetProfile}
          disabled={loading || !user?.id}
          className="bg-green-500 text-white px-3 py-1 rounded text-xs disabled:bg-gray-400"
        >
          {loading ? 'Testing...' : 'Test getUserProfile'}
        </button>
        
        {testResult && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs max-h-32 overflow-y-auto">
            <pre>{testResult}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default TestCredits