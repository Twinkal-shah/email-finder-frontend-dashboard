// Authentication Diagnostics Utility
// This script helps diagnose cross-domain auth and profile fetching issues

import { supabase } from '../services/supabase'

/**
 * Utility function to add timeout to async operations
 */
function withTimeout(promise, timeoutMs = 10000, timeoutMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ])
}

/**
 * Test basic Supabase connectivity
 */
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...')
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
    console.log('Anon Key (first 20 chars):', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
    
    // Test basic connectivity by making a simple REST API call
    const response = await withTimeout(
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      }),
      5000,
      'Connection test timed out'
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase connection error:', response.status, errorText)
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        details: { status: response.status, statusText: response.statusText }
      }
    }
    
    console.log('Supabase connection successful')
    return {
      success: true,
      message: 'Connection established',
      details: { status: response.status }
    }
  } catch (error) {
    console.error('Connection test failed:', error)
    return {
      success: false,
      error: error.message || 'Connection test timed out',
      details: error
    }
  }
}

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
      // First try a direct auth endpoint test
      console.log('Testing auth endpoint directly...')
      const authResponse = await withTimeout(
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`, {
          method: 'GET',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }),
        3000,
        'Auth endpoint test timed out'
      )
      
      console.log('Auth endpoint response status:', authResponse.status)
      
      // Now try the Supabase client session check
      console.log('Testing Supabase client session...')
      const sessionPromise = supabase.auth.getSession()
      const { data: { session }, error } = await withTimeout(
        sessionPromise, 
        3000, 
        'Session check timed out'
      )
      
      const result = {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        hasAccessToken: !!session?.access_token,
        tokenExpiry: session?.expires_at || null,
        error: error?.message || null,
        domain: window.location.hostname,
        authEndpointStatus: authResponse.status
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
      const queryPromise = supabase
        .from('profiles')
        .select('id')
        .limit(1)
      
      const { data, error } = await withTimeout(
        queryPromise,
        3000,
        'Profiles table check timed out'
      )
      
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
      const sessionPromise = supabase.auth.getSession()
      const { data: { session } } = await withTimeout(
        sessionPromise,
        3000,
        'Session fetch timed out during profile test'
      )
      
      if (!session?.user?.id) {
        const result = { error: 'No authenticated user found' }
        this.results.profileFetchTest = result
        return result
      }
      
      console.log('Attempting to fetch profile for user:', session.user.id)
      
      // Test direct profile fetch
      const profilePromise = supabase
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
      
      const { data: profile, error } = await withTimeout(
        profilePromise,
        5000,
        'Profile fetch timed out'
      )
      
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
      const sessionPromise = supabase.auth.getSession()
      const { data: { session } } = await withTimeout(
        sessionPromise,
        5000,
        'Session fetch timed out during profile row check'
      )
      
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'No authenticated user found',
          hasSession: false
        }
      }
      
      // Count rows for this user
      const countPromise = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('id', session.user.id)
      
      const { count, error } = await withTimeout(
        countPromise,
        5000,
        'Profile row count timed out'
      )
      
      const result = {
        success: !error,
        hasSession: true,
        userId: session.user.id,
        userEmail: session.user.email,
        userCreatedAt: session.user.created_at,
        profileRowCount: count,
        profileExists: count > 0,
        error: error?.message || null,
        errorCode: error?.code || null,
        errorDetails: error?.details || null
      }
      
      console.log('Profile row exists check result:', result)
      this.results.profileRowExists = result
      
      return result
    } catch (error) {
      console.error('Profile row exists check failed:', error)
      this.results.profileRowExists = { error: error.message }
      return { error: error.message }
    }
  }

  /**
   * Step 5: Test profile creation trigger
   */
  async testProfileCreationTrigger() {
    console.log('🔍 Step 5: Testing profile creation trigger...')
    
    try {
      const sessionPromise = supabase.auth.getSession()
      const { data: { session } } = await withTimeout(
        sessionPromise,
        5000,
        'Session fetch timed out during trigger test'
      )
      
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'No authenticated user found',
          hasSession: false
        }
      }
      
      // Check if user exists in auth.users (should always be true if we have a session)
      console.log('User ID:', session.user.id)
      console.log('User Email:', session.user.email)
      console.log('User Created At:', session.user.created_at)
      
      // Try to manually trigger profile creation if it doesn't exist
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('id', session.user.id)
      
      if (count === 0) {
        console.log('No profile found, attempting manual creation...')
        
        // Try to insert profile manually (this should work if RLS allows it)
        const insertPromise = supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
            plan: 'free',
            credits: 25,
            credits_find: 25,
            credits_verify: 25
          })
        
        const { data: insertData, error: insertError } = await withTimeout(
          insertPromise,
          5000,
          'Profile insertion timed out'
        )
        
        const result = {
          success: !insertError,
          hasSession: true,
          userId: session.user.id,
          userEmail: session.user.email,
          profileExistedBefore: false,
          manualInsertAttempted: true,
          manualInsertSuccess: !insertError,
          insertData: insertData,
          error: insertError?.message || null,
          errorCode: insertError?.code || null,
          errorDetails: insertError?.details || null
        }
        
        console.log('Profile creation trigger test result:', result)
        this.results.profileCreationTest = result
        return result
      } else {
        const result = {
          success: true,
          hasSession: true,
          userId: session.user.id,
          userEmail: session.user.email,
          profileExistedBefore: true,
          manualInsertAttempted: false,
          error: null
        }
        
        console.log('Profile creation trigger test result:', result)
        this.results.profileCreationTest = result
        return result
      }
    } catch (error) {
      console.error('Profile creation trigger test failed:', error)
      this.results.profileCreationTest = { error: error.message }
      return { error: error.message }
    }
  }

  /**
   * Test basic Supabase connectivity
   */
  async testSupabaseConnection() {
    return await testSupabaseConnection()
  }

  /**
   * Step 6: Test cross-domain auth bridge communication
   */
  async testCrossDomainAuth() {
    console.log('🔍 Step 6: Testing cross-domain auth bridge...')
    
    try {
      // Check current domain and expected domains
      const currentDomain = window.location.hostname
      const expectedDomains = ['app.mailsfinder.com', 'mailsfinder.com', 'localhost']
      
      console.log('Current domain:', currentDomain)
      console.log('Expected domains:', expectedDomains)
      
      // Test if we can access the auth bridge
      const authBridgeUrl = 'https://mailsfinder.com/auth-bridge.html'
      const bridgeTest = await fetch(authBridgeUrl, { 
        method: 'HEAD',
        mode: 'no-cors'
      }).then(() => true).catch(() => false)
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ 
            error: 'Cross-domain auth test timed out',
            currentDomain,
            expectedDomains,
            bridgeAccessible: bridgeTest
          })
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
              currentDomain,
              expectedDomains,
              bridgeAccessible: bridgeTest,
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
        iframe.src = authBridgeUrl
        
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
    } catch (error) {
      return {
        success: false,
        message: 'Cross-domain auth bridge test failed',
        error: error.message
      }
    }
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
    results.tests.profileCreationTest = await this.testProfileCreationTrigger()
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

// Export individual functions for convenience
export {
  testSupabaseConnection
}

/**
 * Check Supabase auth configuration
 */
export async function checkAuthConfiguration() {
  console.log('🔍 Step 7: Checking Supabase auth configuration...');
  
  try {
    const currentDomain = window.location.hostname;
    const currentUrl = window.location.origin;
    const supabaseUrl = supabase.supabaseUrl;
    const supabaseKey = supabase.supabaseKey;
    
    console.log('Current domain:', currentDomain);
    console.log('Current URL:', currentUrl);
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Key (first 20 chars):', supabaseKey?.substring(0, 20) + '...');
    
    // Test auth settings endpoint (this will likely fail with 403, but gives us info)
    const authSettingsUrl = `${supabaseUrl}/auth/v1/settings`;
    let authSettings = null;
    let authSettingsError = null;
    
    try {
      const response = await fetch(authSettingsUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      
      if (response.ok) {
        authSettings = await response.json();
      } else {
        authSettingsError = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error) {
      authSettingsError = error.message;
    }
    
    // Check if current domain matches expected patterns
    const expectedDomains = ['app.mailsfinder.com', 'mailsfinder.com', 'localhost'];
    const domainMatch = expectedDomains.some(domain => 
      currentDomain === domain || currentDomain.endsWith('.' + domain)
    );
    
    return {
      success: true,
      message: 'Auth configuration check completed',
      details: {
        currentDomain,
        currentUrl,
        supabaseUrl,
        supabaseKeyPrefix: supabaseKey?.substring(0, 20) + '...',
        expectedDomains,
        domainMatch,
        authSettings,
        authSettingsError,
        recommendations: [
          !domainMatch ? 'Current domain may not be in Supabase redirect URL allowlist' : null,
          authSettingsError ? 'Cannot access auth settings - check if site URL is configured correctly' : null,
          'Verify Site URL and Redirect URLs in Supabase Dashboard > Authentication > URL Configuration'
        ].filter(Boolean)
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Auth configuration check failed',
      error: error.message
    };
  }
}

/**
 * Standalone cross-domain auth test function
 */
export async function testCrossDomainAuth() {
  console.log('🔍 Step 6: Testing cross-domain auth bridge...');
  
  try {
    // Test auth bridge communication
    const authBridgeUrl = 'https://www.mailsfinder.com/auth-bridge.html';
    
    // Check current domain and expected domains
    const currentDomain = window.location.hostname;
    const expectedDomains = ['app.mailsfinder.com', 'mailsfinder.com', 'localhost'];
    
    console.log('Current domain:', currentDomain);
    console.log('Expected domains:', expectedDomains);
    
    // Test if we can access the auth bridge with proper error handling
    let bridgeAccessible = false;
    let bridgeError = null;
    
    try {
      console.log('Testing auth bridge accessibility at:', authBridgeUrl);
      const response = await fetch(authBridgeUrl, { 
        method: 'GET',
        mode: 'cors'
      });
      bridgeAccessible = response.ok;
      console.log('Auth bridge response status:', response.status, response.statusText);
      if (!response.ok) {
        bridgeError = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (fetchError) {
      bridgeAccessible = false;
      bridgeError = fetchError.message;
      console.error('Auth bridge fetch error:', fetchError);
    }
    
    // Test actual cross-domain communication
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ 
          success: false,
          error: 'Cross-domain auth test timed out - auth bridge may not be properly deployed',
          details: {
            currentDomain,
            expectedDomains,
            bridgeUrl: authBridgeUrl,
            bridgeAccessible,
            bridgeError,
            issue: bridgeAccessible ? 'Bridge accessible but not responding to postMessage' : 'Bridge not accessible - needs to be deployed to mailsfinder.com',
            solution: bridgeAccessible ? 'Check browser console for postMessage errors' : 'Deploy auth-bridge.html to https://mailsfinder.com/auth-bridge.html'
          }
        });
      }, 5000); // Reduced timeout for faster feedback
      
      if (!bridgeAccessible) {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: 'Auth bridge not accessible',
          details: {
            currentDomain,
            expectedDomains,
            bridgeUrl: authBridgeUrl,
            bridgeAccessible: false,
            bridgeError,
            issue: 'Auth bridge file not deployed to mailsfinder.com',
            solution: 'Deploy the auth-bridge.html file from /public folder to https://mailsfinder.com/auth-bridge.html'
          }
        });
        return;
      }
      
      // Listen for auth bridge response
      const handleMessage = (event) => {
        if (event.data && event.data.type === 'USER_AUTH') {
          clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
          
          resolve({
            success: true,
            message: 'Cross-domain auth bridge communication successful',
            details: {
              receivedResponse: true,
              hasUser: !!event.data.user,
              hasTokens: !!event.data.tokens,
              userData: event.data.user ? { email: event.data.user.email, id: event.data.user.id } : null,
              origin: event.origin,
              currentDomain,
              expectedDomains,
              bridgeAccessible: true,
              error: event.data.error || null
            }
          });
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Create iframe to test auth bridge
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = authBridgeUrl;
      
      iframe.onload = () => {
        console.log('Auth bridge iframe loaded successfully');
        console.log('Iframe URL:', iframe.src);
        console.log('Iframe contentWindow available:', !!iframe.contentWindow);
        console.log('Current origin:', window.location.origin);
        console.log('Target origin for postMessage:', 'https://www.mailsfinder.com');
        
        // Check if iframe is actually accessible
        try {
          console.log('Testing iframe contentWindow access...');
          const testAccess = iframe.contentWindow.location;
          console.log('Iframe contentWindow accessible');
        } catch (accessError) {
          console.log('Iframe contentWindow access blocked (expected for cross-origin):', accessError.message);
        }
        
        // Wait a bit for the auth bridge JavaScript to fully load and set up listeners
        setTimeout(() => {
          try {
            console.log('Sending REQUEST_AUTH_DATA message to auth bridge...');
            console.log('Current window origin:', window.location.origin);
            console.log('Target origin for postMessage:', 'https://www.mailsfinder.com');
            console.log('Iframe contentWindow:', iframe.contentWindow);
            console.log('Iframe src:', iframe.src);
            iframe.contentWindow.postMessage(
              { type: 'REQUEST_AUTH_DATA' },
              'https://www.mailsfinder.com'
            );
            console.log('PostMessage sent successfully to https://www.mailsfinder.com');
          } catch (postError) {
            clearTimeout(timeout);
            window.removeEventListener('message', handleMessage);
            resolve({
              success: false,
              error: 'Failed to send postMessage to auth bridge',
              details: {
                currentDomain,
                expectedDomains,
                bridgeUrl: authBridgeUrl,
                bridgeAccessible: true,
                postMessageError: postError.message,
                issue: 'PostMessage communication failed',
                solution: 'Check CORS settings and iframe sandbox restrictions'
              }
            });
          }
        }, 1000); // Wait 1 second for auth bridge to initialize
      };
      
      iframe.onerror = () => {
        clearTimeout(timeout);
        window.removeEventListener('message', handleMessage);
        resolve({
          success: false,
          error: 'Auth bridge iframe failed to load',
          details: {
            currentDomain,
            expectedDomains,
            bridgeUrl: authBridgeUrl,
            bridgeAccessible: true,
            issue: 'Iframe failed to load auth bridge',
            solution: 'Check if auth bridge has proper HTML structure and no JavaScript errors'
          }
        });
      };
      
      document.body.appendChild(iframe);
      
      // Clean up iframe after test
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 6000);
    });
  } catch (error) {
    return {
      success: false,
      message: 'Cross-domain auth bridge test failed',
      error: error.message,
      details: {
        issue: 'Unexpected error during cross-domain test',
        solution: 'Check browser console for detailed error information'
      }
    };
  }
}

// Convenience function to run diagnostics from console
window.runAuthDiagnostics = () => authDiagnostics.runAllTests()

export default authDiagnostics