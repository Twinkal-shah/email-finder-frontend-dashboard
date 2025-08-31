// Authentication Diagnostics Utility
// This script helps diagnose cross-domain auth and profile fetching issues

import { supabase } from '../services/supabase'

/**
 * Comprehensive authentication diagnostics
 * Run this to identify where the auth/profile fetch is failing
 */
export class AuthDiagnostics {
  constructor() {
    this.results = {
      sessionCheck: null,
      profilesTableCheck: null,
      rlsPolicyCheck: null,
      profileFetchTest: null,
      crossDomainTest: null
    }
  }

  /**
   * Step 1: Check session consistency across domains
   */
  async checkSession() {
    console.log('🔍 Step 1: Checking session consistency...')
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      const result = {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        hasAccessToken: !!session?.access_token,
        tokenExpiry: session?.expires_at || null,
        error: error?.message || null,
        domain: window.location.hostname
      }
      
      console.log('Session check result:', result)
      this.results.sessionCheck = result
      
      return result
    } catch (error) {
      console.error('Session check failed:', error)
      this.results.sessionCheck = { error: error.message }
      return { error: error.message }
    }
  }

  /**
   * Step 2: Verify profiles table exists and has correct structure
   */
  async checkProfilesTable() {
    console.log('🔍 Step 2: Checking profiles table structure...')
    
    try {
      // Try to query the table structure
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
      
      const result = {
        tableExists: !error || !error.message.includes('relation "public.profiles" does not exist'),
        canQuery: !error,
        error: error?.message || null,
        sampleData: data || null
      }
      
      console.log('Profiles table check result:', result)
      this.results.profilesTableCheck = result
      
      return result
    } catch (error) {
      console.error('Profiles table check failed:', error)
      this.results.profilesTableCheck = { error: error.message }
      return { error: error.message }
    }
  }

  /**
   * Step 3: Test RLS policies by attempting to fetch current user's profile
   */
  async testProfileFetch() {
    console.log('🔍 Step 3: Testing profile fetch with current session...')
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user?.id) {
        const result = { error: 'No authenticated user found' }
        this.results.profileFetchTest = result
        return result
      }
      
      console.log('Attempting to fetch profile for user:', session.user.id)
      
      // Test direct profile fetch
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          display_name,
          phone,
          company,
          plan,
          credits,
          credits_find,
          credits_verify,
          created_at,
          updated_at
        `)
        .eq('id', session.user.id)
        .single()
      
      const result = {
        userId: session.user.id,
        profileFound: !!profile,
        profileData: profile,
        error: error?.message || null,
        errorCode: error?.code || null,
        errorDetails: error?.details || null,
        errorHint: error?.hint || null
      }
      
      console.log('Profile fetch test result:', result)
      this.results.profileFetchTest = result
      
      return result
    } catch (error) {
      console.error('Profile fetch test failed:', error)
      this.results.profileFetchTest = { error: error.message }
      return { error: error.message }
    }
  }

  /**
   * Step 4: Check if profile row exists for current user
   */
  async checkProfileRowExists() {
    console.log('🔍 Step 4: Checking if profile row exists for current user...')
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user?.id) {
        return { error: 'No authenticated user found' }
      }
      
      // Use service role to check if row exists (bypassing RLS)
      // Note: This would require service role key, so we'll try a different approach
      
      // Try to count rows for this user
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('id', session.user.id)
      
      const result = {
        userId: session.user.id,
        rowExists: count > 0,
        rowCount: count,
        error: error?.message || null
      }
      
      console.log('Profile row existence check:', result)
      return result
    } catch (error) {
      console.error('Profile row check failed:', error)
      return { error: error.message }
    }
  }

  /**
   * Step 5: Test cross-domain auth bridge communication
   */
  async testCrossDomainAuth() {
    console.log('🔍 Step 5: Testing cross-domain auth bridge...')
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ error: 'Cross-domain auth test timed out' })
      }, 10000) // 10 second timeout
      
      // Listen for auth bridge response
      const handleMessage = (event) => {
        if (event.data && event.data.type === 'USER_AUTH') {
          clearTimeout(timeout)
          window.removeEventListener('message', handleMessage)
          
          const result = {
            receivedResponse: true,
            hasUser: !!event.data.user,
            hasTokens: !!event.data.tokens,
            userData: event.data.user,
            origin: event.origin,
            error: event.data.error || null
          }
          
          console.log('Cross-domain auth test result:', result)
          this.results.crossDomainTest = result
          resolve(result)
        }
      }
      
      window.addEventListener('message', handleMessage)
      
      // Create iframe to test auth bridge
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = 'https://mailsfinder.com/auth-bridge.html'
      
      iframe.onload = () => {
        // Request auth data from bridge
        iframe.contentWindow.postMessage(
          { type: 'REQUEST_AUTH_DATA' },
          'https://mailsfinder.com'
        )
      }
      
      document.body.appendChild(iframe)
      
      // Clean up iframe after test
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
      }, 11000)
    })
  }

  /**
   * Run all diagnostic tests
   */
  async runAllTests() {
    console.log('🚀 Starting comprehensive auth diagnostics...')
    console.log('Domain:', window.location.hostname)
    console.log('URL:', window.location.href)
    
    const results = {
      domain: window.location.hostname,
      timestamp: new Date().toISOString(),
      tests: {}
    }
    
    // Run tests sequentially
    results.tests.sessionCheck = await this.checkSession()
    results.tests.profilesTableCheck = await this.checkProfilesTable()
    results.tests.profileFetchTest = await this.testProfileFetch()
    results.tests.profileRowExists = await this.checkProfileRowExists()
    results.tests.crossDomainTest = await this.testCrossDomainAuth()
    
    // Generate summary
    const summary = this.generateSummary(results.tests)
    results.summary = summary
    
    console.log('🎯 Diagnostic Results Summary:')
    console.log(summary)
    
    return results
  }

  /**
   * Generate a summary of the diagnostic results
   */
  generateSummary(tests) {
    const issues = []
    const successes = []
    
    // Check session
    if (tests.sessionCheck?.hasSession) {
      successes.push('✅ Session exists on domain')
    } else {
      issues.push('❌ No session found on domain')
    }
    
    // Check profiles table
    if (tests.profilesTableCheck?.tableExists) {
      successes.push('✅ Profiles table exists')
    } else {
      issues.push('❌ Profiles table does not exist or is inaccessible')
    }
    
    // Check profile fetch
    if (tests.profileFetchTest?.profileFound) {
      successes.push('✅ Profile data fetched successfully')
    } else if (tests.profileFetchTest?.error) {
      if (tests.profileFetchTest.error.includes('RLS')) {
        issues.push('❌ RLS policy blocking profile access')
      } else if (tests.profileFetchTest.error.includes('No rows')) {
        issues.push('❌ No profile row exists for user')
      } else {
        issues.push(`❌ Profile fetch failed: ${tests.profileFetchTest.error}`)
      }
    }
    
    // Check cross-domain auth
    if (tests.crossDomainTest?.receivedResponse && tests.crossDomainTest?.hasUser) {
      successes.push('✅ Cross-domain auth bridge working')
    } else {
      issues.push('❌ Cross-domain auth bridge not working')
    }
    
    return {
      status: issues.length === 0 ? 'ALL_GOOD' : 'ISSUES_FOUND',
      issues,
      successes,
      recommendations: this.generateRecommendations(issues)
    }
  }

  /**
   * Generate recommendations based on found issues
   */
  generateRecommendations(issues) {
    const recommendations = []
    
    if (issues.some(issue => issue.includes('No session'))) {
      recommendations.push('1. Check cross-domain auth bridge configuration')
      recommendations.push('2. Verify Supabase auth settings and redirect URLs')
    }
    
    if (issues.some(issue => issue.includes('RLS policy'))) {
      recommendations.push('3. Add or fix RLS policies on profiles table')
      recommendations.push('4. Ensure SELECT policy allows auth.uid() = id')
    }
    
    if (issues.some(issue => issue.includes('No profile row'))) {
      recommendations.push('5. Check if signup trigger creates profile rows')
      recommendations.push('6. Manually create profile row for test user')
    }
    
    if (issues.some(issue => issue.includes('Cross-domain auth bridge'))) {
      recommendations.push('7. Check auth-bridge.html files on both domains')
      recommendations.push('8. Verify postMessage origin allowlists')
    }
    
    return recommendations
  }
}

// Export singleton instance
export const authDiagnostics = new AuthDiagnostics()

// Convenience function to run diagnostics from console
window.runAuthDiagnostics = () => authDiagnostics.runAllTests()

export default authDiagnostics