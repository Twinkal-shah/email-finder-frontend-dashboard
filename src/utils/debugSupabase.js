import { supabase } from '../services/supabase'

/**
 * Timeout wrapper for async operations
 */
function withTimeout(promise, timeoutMs = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

/**
 * Debug Supabase connection and session issues
 */
export async function debugSupabaseConnection() {
  console.log('🔍 Starting Supabase debug session...')
  
  try {
    console.log('Checking Supabase client...')
    if (!supabase) {
      throw new Error('Supabase client is not initialized')
    }
    
    console.log('Supabase client:', supabase)
    console.log('Supabase URL:', supabase.supabaseUrl)
    console.log('Supabase Key:', supabase.supabaseKey ? 'Present' : 'Missing')
    
    console.log('Environment variables:')
    console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
    console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing')
    // 1. Check basic connection
    console.log('1. Testing basic connection...')
    const { data: connectionTest, error: connectionError } = await withTimeout(
      supabase.auth.getSession(),
      5000
    )
    
    if (connectionError) {
      console.error('❌ Connection failed:', connectionError)
      return { success: false, error: 'Connection failed', details: connectionError }
    }
    console.log('✅ Basic connection successful')
    
    // 2. Check session
    console.log('2. Checking session...')
    const { data: { session }, error: sessionError } = await withTimeout(
      supabase.auth.getSession(),
      5000
    )
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError)
      return { success: false, error: 'Session error', details: sessionError }
    }
    
    if (!session) {
      console.log('❌ No active session found')
      return { success: false, error: 'No active session' }
    }
    
    console.log('✅ Session found:', {
      userId: session.user.id,
      email: session.user.email,
      expiresAt: session.expires_at
    })
    
    // 3. Test direct profile query
    console.log('3. Testing direct profile query...')
    const { data: profileData, error: profileError } = await withTimeout(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single(),
      5000
    )
    
    if (profileError) {
      console.error('❌ Profile query failed:', profileError)
      
      // Check if it's a missing profile issue
      if (profileError.code === 'PGRST116') {
        console.log('🔍 Profile not found, checking if user exists in auth.users...')
        
        // Try to create profile manually
        console.log('🔧 Attempting to create profile...')
        const { data: insertData, error: insertError } = await withTimeout(
          supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || '',
              plan: 'free',
              credits: 25,
              credits_find: 25,
              credits_verify: 25
            })
            .select()
            .single(),
          5000
        )
        
        if (insertError) {
          console.error('❌ Profile creation failed:', insertError)
          return { 
            success: false, 
            error: 'Profile creation failed', 
            details: { profileError, insertError },
            recommendation: 'Check RLS policies and trigger function'
          }
        }
        
        console.log('✅ Profile created successfully:', insertData)
        return {
          success: true,
          message: 'Profile created successfully',
          data: insertData,
          action: 'created_profile'
        }
      }
      
      return { 
        success: false, 
        error: 'Profile query failed', 
        details: profileError,
        recommendation: 'Check RLS policies'
      }
    }
    
    console.log('✅ Profile query successful:', profileData)
    
    // 4. Test session persistence
    console.log('4. Testing session persistence...')
    const { data: { user }, error: userError } = await withTimeout(
      supabase.auth.getUser(),
      5000
    )
    
    if (userError) {
      console.error('❌ User fetch failed:', userError)
      return { success: false, error: 'User fetch failed', details: userError }
    }
    
    console.log('✅ User fetch successful:', {
      userId: user.id,
      email: user.email
    })
    
    return {
      success: true,
      message: 'All Supabase tests passed',
      data: {
        session: {
          userId: session.user.id,
          email: session.user.email,
          expiresAt: session.expires_at
        },
        profile: profileData,
        user: {
          userId: user.id,
          email: user.email
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug session failed:', error)
    console.error('Error stack:', error.stack)
    console.error('Error message:', error.message)
    return { 
      success: false, 
      error: 'Debug session failed', 
      details: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    }
  }
}

/**
 * Quick session check
 */
export async function quickSessionCheck() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      hasSession: !!session,
      userId: session?.user?.id || null,
      email: session?.user?.email || null,
      expiresAt: session?.expires_at || null
    }
  } catch (error) {
    return {
      hasSession: false,
      error: error.message
    }
  }
}