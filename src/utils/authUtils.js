import { authService } from '../services/supabase'
import { TOKEN_STORAGE_KEY } from '../constants/auth.js'

export function getUrlParams() {
  try {
    // Log the current URL for debugging
    console.log('Current URL:', window.location.href)
    console.log('Search params:', window.location.search)
    
    // Return empty params if no search parameters
    if (!window.location.search) {
      return {
        name: null,
        email: null,
        token: null,
        access_token: null,
        refresh_token: null,
        user_id: null,
        expires_at: null
      }
    }
    
    // Use window.location.search directly instead of constructing a new URL
    const params = new URLSearchParams(window.location.search)
    return {
      name: params.get('name') ? decodeURIComponent(params.get('name')) : null,
      email: params.get('email') ? decodeURIComponent(params.get('email')) : null,
      token: params.get('token') ? decodeURIComponent(params.get('token')) : null,
      access_token: params.get('access_token') ? decodeURIComponent(params.get('access_token')) : null,
      refresh_token: params.get('refresh_token') ? decodeURIComponent(params.get('refresh_token')) : null,
      user_id: params.get('user_id') ? decodeURIComponent(params.get('user_id')) : null,
      expires_at: params.get('expires_at') ? decodeURIComponent(params.get('expires_at')) : null
    }
  } catch (error) {
    console.error('Error parsing URL parameters:', error)
    console.error('URL that caused error:', window.location.href)
    return {
      name: null,
      email: null,
      token: null,
      access_token: null,
      refresh_token: null,
      user_id: null,
      expires_at: null
    }
  }
}

// Helper function to validate access token with Supabase
export async function validateAccessToken(accessToken, refreshToken = null) {
  try {
    console.log('🔍 Validating access token...')
    
    // Set the session with the provided tokens
    const { data: sessionData, error: sessionError } = await authService.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError)
      return { user: null, error: sessionError }
    }
    
    if (!sessionData?.session) {
      console.error('❌ No session data returned')
      return { user: null, error: new Error('No session data') }
    }
    
    console.log('✅ Session validated successfully')
    console.log('Session user:', sessionData.session.user)
    
    // Store the tokens
    storeTokens({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_at: sessionData.session.expires_at
    })
    
    return { 
      user: sessionData.session.user, 
      tokens: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at
      },
      error: null 
    }
  } catch (error) {
    console.error('❌ Error validating access token:', error)
    return { user: null, error }
  }
}

export function storeTokens(tokens) {
  try {
    if (tokens && typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
      console.log('✅ Tokens stored successfully')
    }
  } catch (error) {
    console.error('❌ Error storing tokens:', error)
  }
}

export function getStoredTokens() {
  try {
    if (typeof window === 'undefined') return null
    
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!stored) return null
    
    const tokens = JSON.parse(stored)
    
    // Check if tokens are expired
    if (tokens.expires_at && new Date(tokens.expires_at * 1000) <= new Date()) {
      console.log('🕐 Stored tokens are expired, clearing...')
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      return null
    }
    
    return tokens
  } catch (error) {
    console.error('❌ Error getting stored tokens:', error)
    return null
  }
}

export function cleanUrlParams() {
  try {
    // Get current URL without search params
    const url = new URL(window.location)
    const hasParams = url.searchParams.toString().length > 0
    
    if (hasParams) {
      // Clear all search parameters
      url.search = ''
      
      // Update the URL without triggering a page reload
      window.history.replaceState({}, document.title, url.toString())
      console.log('✅ URL parameters cleaned')
    }
  } catch (error) {
    console.error('❌ Error cleaning URL parameters:', error)
  }
}

export function setupCrossDomainListener(setUser, setTokens, setIsLoading, clearAuthTimeout) {
  const handleMessage = async (event) => {
    // Only accept messages from our auth domain
    const allowedOrigins = [
      'https://auth.emaildashboard.ai',
      'https://emaildashboard.ai',
      'http://localhost:3000',
      'http://localhost:5173'
    ]
    
    if (!allowedOrigins.includes(event.origin)) {
      console.log('❌ Message from unauthorized origin:', event.origin)
      return
    }
    
    console.log('📨 Received cross-domain message:', event.data)
    
    if (event.data.type === 'AUTH_SUCCESS') {
      console.log('🎉 Authentication successful!')
      
      const { user, tokens } = event.data
      
      if (user && tokens) {
        console.log('👤 Setting user from cross-domain auth:', user)
        console.log('🔑 Setting tokens from cross-domain auth')
        
        // Store tokens
        storeTokens(tokens)
        
        // Update state
        setUser(user)
        setTokens(tokens)
        setIsLoading(false)
        
        // Clear any existing auth timeout
        clearAuthTimeout()
        
        // Clean URL parameters
        cleanUrlParams()
      } else {
        console.error('❌ Invalid auth data received')
        setIsLoading(false)
      }
    } else if (event.data.type === 'AUTH_ERROR') {
      console.error('❌ Authentication error:', event.data.error)
      setIsLoading(false)
    }
  }
  
  // Add event listener
  window.addEventListener('message', handleMessage)
  
  // Return cleanup function
  return () => {
    window.removeEventListener('message', handleMessage)
  }
}