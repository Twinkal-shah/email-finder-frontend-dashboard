import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { getUserProfile } from '../api/user.js'
import { supabase } from '../services/supabase.js'

export function TestCredits() {
  const { user, isAuthenticated } = useAuth()
  const [testResult, setTestResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [directResult, setDirectResult] = useState('')
  const [directLoading, setDirectLoading] = useState(false)
  const [authTest, setAuthTest] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)

  const testGetProfile = async () => {
    console.log('🧪 Testing getUserProfile...')
    try {
      setLoading(true)
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((resolve, reject) => 
        setTimeout(() => reject(new Error('Operation timed out after 10 seconds')), 10000)
      )
      
      // Get current user with timeout
      const userResult = await Promise.race([
        supabase.auth.getUser(),
        timeoutPromise
      ])
      
      const { data: { user: currentUser } } = userResult
      console.log('👤 Current user:', currentUser)
      
      if (!currentUser?.id) {
        console.log('❌ No user ID available')
        setTestResult('No user ID available')
        return
      }
      
      console.log('🔍 Calling getUserProfile for user:', currentUser.id)
      console.log('🔍 User object:', currentUser)
      console.log('🔍 Auth state:', { isAuthenticated })
      
      const profile = await Promise.race([
        getUserProfile(currentUser.id),
        timeoutPromise
      ])
      
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

  const testAuth = async () => {
    setAuthLoading(true)
    setAuthTest(null)
    
    try {
      console.log('🔐 Testing basic authentication...')
      
      // Test 1: Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('📋 Session check:', { session: !!session, error: sessionError })
      
      // Test 2: Check user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('👤 User check:', { user: !!user, userId: user?.id, error: userError })
      
      setAuthTest({
        hasSession: !!session,
        hasUser: !!user,
        userId: user?.id,
        sessionError: sessionError?.message,
        userError: userError?.message
      })
    } catch (err) {
      console.error('❌ Auth test failed:', err)
      setAuthTest({ error: err.message })
    } finally {
      setAuthLoading(false)
    }
  }

  const testDirectQuery = async () => {
    console.log('🔍 Testing direct Supabase query...')
    try {
      setDirectLoading(true)
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((resolve, reject) => 
        setTimeout(() => reject(new Error('Direct query timed out after 10 seconds')), 10000)
      )
      
      // Get current user with timeout
      const userResult = await Promise.race([
        supabase.auth.getUser(),
        timeoutPromise
      ])
      
      const { data: { user: currentUser } } = userResult
      
      if (!currentUser?.id) {
        console.log('❌ No user ID available')
        setDirectResult('No user ID available')
        return
      }
      
      console.log('🔍 Direct query for user:', currentUser.id)
      
      const queryResult = await Promise.race([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single(),
        timeoutPromise
      ])
      
      const { data, error } = queryResult
      
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
          onClick={testAuth}
          disabled={authLoading}
          className="bg-green-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50 w-full"
        >
          {authLoading ? 'Testing...' : 'Test Authentication'}
        </button>
        
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
          className="bg-purple-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50 w-full"
        >
          {directLoading ? 'Testing...' : 'Test Direct Query'}
        </button>
      </div>
      
      {authTest && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
          <strong>Auth Test Result:</strong>
          <pre className="whitespace-pre-wrap">{JSON.stringify(authTest, null, 2)}</pre>
        </div>
      )}
      
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