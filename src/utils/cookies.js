// Cookie utilities for cross-subdomain authentication

/**
 * Set a secure cross-subdomain cookie
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Expiration in days (default: 7)
 * @param {string} domain - Domain for the cookie (default: .mailsfinder.com)
 */
export function setCrossDomainCookie(name, value, days = 7, domain = '.mailsfinder.com') {
  try {
    const expires = new Date()
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
    
    // Create secure cookie with cross-domain settings
    const cookieString = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; domain=${domain}; path=/; SameSite=None; Secure`
    
    document.cookie = cookieString
    console.log(`Set cross-domain cookie: ${name}`)
    return true
  } catch (error) {
    console.error('Error setting cross-domain cookie:', error)
    return false
  }
}

/**
 * Get a cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null if not found
 */
export function getCookie(name) {
  try {
    const nameEQ = name + '='
    const cookies = document.cookie.split(';')
    
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i]
      while (cookie.charAt(0) === ' ') {
        cookie = cookie.substring(1, cookie.length)
      }
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length))
      }
    }
    return null
  } catch (error) {
    console.error('Error getting cookie:', error)
    return null
  }
}

/**
 * Delete a cookie
 * @param {string} name - Cookie name
 * @param {string} domain - Domain for the cookie (default: .mailsfinder.com)
 */
export function deleteCookie(name, domain = '.mailsfinder.com') {
  try {
    // Set cookie with past expiration date to delete it
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${domain}; path=/; SameSite=None; Secure`
    console.log(`Deleted cross-domain cookie: ${name}`)
    return true
  } catch (error) {
    console.error('Error deleting cookie:', error)
    return false
  }
}

/**
 * Store Supabase session data in cross-domain cookies
 * @param {Object} session - Supabase session object
 * @param {Object} user - User data object
 */
export function storeSessionInCookies(session, user) {
  try {
    if (!session || !session.access_token) {
      console.warn('No valid session to store in cookies')
      return false
    }

    // Store access token (expires in 1 hour by default)
    setCrossDomainCookie('supabase_access_token', session.access_token, 1/24) // 1 hour
    
    // Store refresh token (expires in 7 days)
    if (session.refresh_token) {
      setCrossDomainCookie('supabase_refresh_token', session.refresh_token, 7)
    }
    
    // Store user data (expires in 7 days)
    if (user) {
      setCrossDomainCookie('supabase_user_data', JSON.stringify(user), 7)
    }
    
    // Store session expiration time
    if (session.expires_at) {
      setCrossDomainCookie('supabase_expires_at', session.expires_at.toString(), 7)
    }
    
    console.log('Session data stored in cross-domain cookies')
    return true
  } catch (error) {
    console.error('Error storing session in cookies:', error)
    return false
  }
}

/**
 * Retrieve Supabase session data from cross-domain cookies
 * @returns {Object|null} Session data or null if not found/invalid
 */
export function getSessionFromCookies() {
  try {
    const accessToken = getCookie('supabase_access_token')
    const refreshToken = getCookie('supabase_refresh_token')
    const userDataStr = getCookie('supabase_user_data')
    const expiresAtStr = getCookie('supabase_expires_at')
    
    if (!accessToken) {
      console.log('No access token found in cookies')
      return null
    }
    
    // Parse user data
    let userData = null
    if (userDataStr) {
      try {
        userData = JSON.parse(userDataStr)
      } catch (parseError) {
        console.warn('Error parsing user data from cookie:', parseError)
      }
    }
    
    // Parse expiration time
    let expiresAt = null
    if (expiresAtStr) {
      expiresAt = parseInt(expiresAtStr)
      
      // Check if token is expired
      if (expiresAt && expiresAt * 1000 < Date.now()) {
        console.log('Access token in cookies is expired')
        clearSessionCookies() // Clean up expired cookies
        return null
      }
    }
    
    console.log('Retrieved session data from cookies')
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      user: userData
    }
  } catch (error) {
    console.error('Error retrieving session from cookies:', error)
    return null
  }
}

/**
 * Clear all Supabase session cookies
 */
export function clearSessionCookies() {
  try {
    deleteCookie('supabase_access_token')
    deleteCookie('supabase_refresh_token')
    deleteCookie('supabase_user_data')
    deleteCookie('supabase_expires_at')
    console.log('Cleared all session cookies')
    return true
  } catch (error) {
    console.error('Error clearing session cookies:', error)
    return false
  }
}

/**
 * Check if user is authenticated based on cookies
 * @returns {boolean} True if valid session exists in cookies
 */
export function isAuthenticatedFromCookies() {
  const sessionData = getSessionFromCookies()
  return sessionData && sessionData.access_token && sessionData.user
}