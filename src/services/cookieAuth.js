import { supabase } from './supabase.js'

/**
 * Cookie-based authentication service for cross-subdomain session management
 * Handles session persistence across mailsfinder.com and app.mailsfinder.com
 */

const COOKIE_NAME = 'supabase-auth-token'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

// Determine the appropriate domain based on environment
function getCookieDomain() {
  const hostname = window.location.hostname
  
  // For localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null // Don't set domain for localhost
  }
  
  // For production - works for both mailsfinder.com and app.mailsfinder.com
  if (hostname.includes('mailsfinder.com')) {
    return '.mailsfinder.com'
  }
  
  // Fallback for other domains
  return null
}

/**
 * Set a secure cookie for cross-subdomain authentication
 */
export function setAuthCookie(session) {
  if (!session?.access_token) {
    console.error('Invalid session provided to setAuthCookie')
    return false
  }

  try {
    const cookieData = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: {
        id: session.user.id,
        email: session.user.email,
        user_metadata: session.user.user_metadata
      }
    }

    const cookieValue = btoa(JSON.stringify(cookieData))
    const expires = new Date(Date.now() + COOKIE_MAX_AGE)
    const domain = getCookieDomain()
    
    // Set cookie with proper flags for cross-subdomain and security
    const cookieString = [
      `${COOKIE_NAME}=${cookieValue}`,
      `expires=${expires.toUTCString()}`,
      ...(domain ? [`domain=${domain}`] : []), // Only set domain if not localhost
      'path=/',
      'SameSite=Lax',
      // Only set Secure flag in production (HTTPS)
      ...(window.location.protocol === 'https:' ? ['Secure'] : [])
    ].join('; ')

    document.cookie = cookieString
    console.log('Auth cookie set successfully')
    return true
  } catch (error) {
    console.error('Error setting auth cookie:', error)
    return false
  }
}

/**
 * Get authentication data from cookie
 */
export function getAuthCookie() {
  try {
    console.log('🍪 Reading auth cookie...')
    console.log('📍 Current domain:', window.location.hostname)
    console.log('🍪 All cookies:', document.cookie)
    
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${COOKIE_NAME}=`)
    )

    if (!authCookie) {
      console.log('❌ Auth cookie not found')
      return null
    }

    console.log('✅ Auth cookie found')
    
    const cookieValue = authCookie.split('=')[1]
    const cookieData = JSON.parse(atob(cookieValue))

    // Check if token is expired
    if (cookieData.expires_at && cookieData.expires_at * 1000 < Date.now()) {
      console.log('⏰ Auth cookie expired, removing')
      removeAuthCookie()
      return null
    }

    console.log('✅ Valid auth cookie data retrieved')
    return cookieData
  } catch (error) {
    console.error('❌ Error reading auth cookie:', error)
    removeAuthCookie() // Remove corrupted cookie
    return null
  }
}

/**
 * Remove authentication cookie
 */
export function removeAuthCookie() {
  try {
    const expiredDate = new Date(0).toUTCString()
    const domain = getCookieDomain()
    
    const cookieString = [
      `${COOKIE_NAME}=`,
      `expires=${expiredDate}`,
      ...(domain ? [`domain=${domain}`] : []), // Only set domain if not localhost
      'path=/'
    ].join('; ')
    
    document.cookie = cookieString
    console.log('Auth cookie removed')
  } catch (error) {
    console.error('Error removing auth cookie:', error)
  }
}

/**
 * Initialize Supabase session from cookie
 */
export async function initializeSessionFromCookie() {
  try {
    console.log('🍪 Attempting to initialize session from cookie...')
    
    const cookieData = getAuthCookie()
    
    if (!cookieData?.access_token) {
      console.log('❌ No valid auth cookie found')
      return null
    }

    console.log('✅ Valid auth cookie found, setting Supabase session...')
    
    // Set the session in Supabase
    const { data, error } = await supabase.auth.setSession({
      access_token: cookieData.access_token,
      refresh_token: cookieData.refresh_token
    })

    if (error) {
      console.error('❌ Error setting session from cookie:', error)
      removeAuthCookie() // Remove invalid cookie
      return null
    }

    console.log('✅ Session initialized successfully from cookie')
    return data.session
  } catch (error) {
    console.error('❌ Error initializing session from cookie:', error)
    removeAuthCookie()
    return null
  }
}

/**
 * Handle successful authentication by setting cookie and Supabase session
 */
export async function handleAuthSuccess(session) {
  try {
    // Set the cookie for cross-subdomain access
    const cookieSet = setAuthCookie(session)
    
    if (!cookieSet) {
      throw new Error('Failed to set auth cookie')
    }

    // Set the session in Supabase for immediate use
    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    })

    if (error) {
      throw new Error(`Failed to set Supabase session: ${error.message}`)
    }

    console.log('Authentication handled successfully')
    return true
  } catch (error) {
    console.error('Error handling auth success:', error)
    return false
  }
}

/**
 * Handle logout by clearing cookie and Supabase session
 */
export async function handleLogout() {
  try {
    // Clear Supabase session
    await supabase.auth.signOut()
    
    // Remove auth cookie
    removeAuthCookie()
    
    console.log('Logout handled successfully')
    return true
  } catch (error) {
    console.error('Error handling logout:', error)
    return false
  }
}

/**
 * Check if user is authenticated (has valid session)
 */
export async function isAuthenticated() {
  try {
    console.log('🔍 Checking authentication status...')
    
    // First try to get current session from Supabase
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      console.log('✅ Found existing Supabase session')
      return true
    }

    console.log('❌ No Supabase session found, checking cookie...')
    
    // If no Supabase session, try to initialize from cookie
    const cookieSession = await initializeSessionFromCookie()
    const isAuth = !!cookieSession
    
    console.log(`🍪 Cookie authentication result: ${isAuth}`)
    return isAuth
  } catch (error) {
    console.error('❌ Error checking authentication:', error)
    return false
  }
}

/**
 * Get current user with session validation
 */
export async function getCurrentUser() {
  try {
    console.log('👤 Getting current user...')
    
    // Try to get current user from Supabase
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.log('❌ No user from Supabase, trying cookie initialization...')
      
      // Try to initialize from cookie and get user again
      const cookieSession = await initializeSessionFromCookie()
      
      if (cookieSession) {
        console.log('✅ Cookie session initialized, getting user...')
        
        const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser()
        
        if (cookieError || !cookieUser) {
          console.error('❌ Failed to get user after cookie initialization:', cookieError)
          throw new Error('Failed to get user after cookie initialization')
        }
        
        console.log('✅ User retrieved from cookie session')
        return cookieUser
      }
      
      console.log('❌ No cookie session available')
      return null
    }

    console.log('✅ User retrieved from existing session')
    return user
  } catch (error) {
    console.error('❌ Error getting current user:', error)
    return null
  }
}

/**
 * Refresh session and update cookie
 */
export async function refreshSession() {
  try {
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error || !data.session) {
      console.error('Error refreshing session:', error)
      removeAuthCookie()
      return null
    }

    // Update cookie with new session
    setAuthCookie(data.session)
    
    console.log('Session refreshed successfully')
    return data.session
  } catch (error) {
    console.error('Error refreshing session:', error)
    removeAuthCookie()
    return null
  }
}

export default {
  setAuthCookie,
  getAuthCookie,
  removeAuthCookie,
  initializeSessionFromCookie,
  handleAuthSuccess,
  handleLogout,
  isAuthenticated,
  getCurrentUser,
  refreshSession
}