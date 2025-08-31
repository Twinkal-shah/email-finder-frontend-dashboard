import React, { useState } from 'react'
import { useAuth } from '../contexts/auth.jsx'
import { getUserProfile } from '../api/user.js'
import { supabase } from '../services/supabase.js'

export function TestCredits() {
  const { user, isAuthenticated } = useAuth()
  const [testResult, setTestResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [directResult, setDirectResult] = useState('')
  const [directLoading, setDirectLoading] = useState(false)

  const testGetProfile = async () => {
    console.log('🧪 Testing getUserProfile...')
    try {
      if (!user?.id) {
        console.log('❌ No user ID available')
        setTestResult('No user ID available')
        return
      }
      
      console.log('🔍 Calling getUserProfile for user:', user.id)
      console.log('🔍 User object:', user)
      console.log('🔍 Auth state:', { isAuthenticated })
      
      setLoading(true)
      const profile = await getUserProfile(user.id)
      console.log('✅ Profile result:', profile)
      console.log('✅ Profile credits_find:', profile?.credits_find)
      console.log('✅ Profile credits_verify:', profile?.credits_verify)
      
      setTestResult(JSON.stringify(profile, null, 2))
    } catch (error) {
      console.error('💥 Error in testGetProfile:', error)
      console.error('💥 Error stack:', error.stack)
      setTestResult(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testDirectQuery = async () => {
    console.log('🔍 Testing direct Supabase query...')
    try {
      if (!user?.id) {
        console.log('❌ No user ID available')
        setDirectResult('No user ID available')
        return
      }
      
      console.log('🔍 Direct query for user:', user.id)
      setDirectLoading(true)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      console.log('✅ Direct query result:', { data, error })
      
      if (error) {
        setDirectResult(`Error: ${error.message}`)
      } else {
        setDirectResult(JSON.stringify(data, null, 2))
      }
    } catch (error) {
      console.error('💥 Error in direct query:', error)
      setDirectResult(`Error: ${error.message}`)
    } finally {
      setDirectLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 left-4 bg-yellow-50 border border-yellow-300 rounded-lg p-4 shadow-lg max-w-md z-50">
      <h3 className="font-bold text-sm mb-2">🧪 Test Credits</h3>
      
      <div className="space-y-2">
        <button 
          onClick={testGetProfile}
          disabled={loading || !user?.id}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50 w-full"
        >
          {loading ? 'Testing...' : 'Test getUserProfile'}
        </button>
        
        <button 
          onClick={testDirectQuery}
          disabled={directLoading || !user?.id}
          className="bg-green-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50 w-full"
        >
          {directLoading ? 'Testing...' : 'Test Direct Query'}
        </button>
      </div>
      
      {testResult && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
          <strong>getUserProfile Result:</strong>
          <pre className="whitespace-pre-wrap">{testResult}</pre>
        </div>
      )}
      
      {directResult && (
        <div className="mt-2 p-2 bg-blue-100 rounded text-xs">
          <strong>Direct Query Result:</strong>
          <pre className="whitespace-pre-wrap">{directResult}</pre>
        </div>
      )}
    </div>
  )
}

export default TestCredits