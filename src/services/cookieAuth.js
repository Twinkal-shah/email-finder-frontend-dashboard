import { supabase } from './supabase.js'

/**
 * Cookie-based authentication service for cross-subdomain session management
 * Handles session persistence across mailsfinder.com and app.mailsfinder.com
 */

const COOKIE_NAME = 'supabase-auth-token'
const DOMAIN = '.mailsfinder.com' // Works for both subdomains
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

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
    
    // Set cookie with proper flags for cross-subdomain and security
    const cookieString = [
      `${COOKIE_NAME}=${cookieValue}`,
      `expires=${expires.toUTCString()}`,
      `domain=${DOMAIN}`,
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
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${COOKIE_NAME}=`)
    )

    if (!authCookie) {
      return null
    }

    const cookieValue = authCookie.split('=')[1]
    const cookieData = JSON.parse(atob(cookieValue))

    // Check if token is expired
    if (cookieData.expires_at && cookieData.expires_at * 1000 < Date.now()) {
      console.log('Auth cookie expired, removing')
      removeAuthCookie()
      return null
    }

    return cookieData
  } catch (error) {
    console.error('Error reading auth cookie:', error)
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
    const cookieString = [
      `${COOKIE_NAME}=`,
      `expires=${expiredDate}`,
      `domain=${DOMAIN}`,
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
    const cookieData = getAuthCookie()
    
    if (!cookieData?.access_token) {
      console.log('No valid auth cookie found')
      return null
    }

    console.log('Initializing session from cookie')
    
    // Set the session in Supabase
    const { data, error } = await supabase.auth.setSession({
      access_token: cookieData.access_token,
      refresh_token: cookieData.refresh_token
    })

    if (error) {
      console.error('Error setting session from cookie:', error)
      removeAuthCookie() // Remove invalid cookie
      return null
    }

    console.log('Session initialized successfully from cookie')
    return data.session
  } catch (error) {
    console.error('Error initializing session from cookie:', error)
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
    // First try to get current session from Supabase
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      return true
    }

    // If no Supabase session, try to initialize from cookie
    const cookieSession = await initializeSessionFromCookie()
    return !!cookieSession
  } catch (error) {
    console.error('Error checking authentication:', error)
    return false
  }
}

/**
 * Get current user with session validation
 */
export async function getCurrentUser() {
  try {
    // Try to get current user from Supabase
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      // Try to initialize from cookie and get user again
      const cookieSession = await initializeSessionFromCookie()
      
      if (cookieSession) {
        const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser()
        
        if (cookieError || !cookieUser) {
          throw new Error('Failed to get user after cookie initialization')
        }
        
        return cookieUser
      }
      
      return null
    }

    return user
  } catch (error) {
    console.error('Error getting current user:', error)
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