import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authService, dbService } from '../services/supabase'

const STORAGE_KEY = 'auth_user'
const TOKEN_STORAGE_KEY = 'auth_tokens'

const AuthContext = createContext(null)

// Helper function to parse URL parameters
function getUrlParams() {
  try {
    // Log the current URL for debugging
    console.log('Current URL:', window.location.href)
    console.log('Search params:', window.location.search)
    
    // Temporarily disable URL parsing to isolate the error
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
async function validateAccessToken(accessToken, refreshToken = null) {
  try {
    console.log('Validating token:', accessToken.substring(0, 50) + '...')
    
    // Import supabase directly to avoid circular dependency
    const { supabase } = await import('../services/supabase')
    
    // Try to decode the JWT token first to check if it's valid
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      console.log('Token payload:', payload)
      
      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        const expiredDate = new Date(payload.exp * 1000)
        console.error(`Token is expired. Expired at: ${expiredDate.toISOString()}, Current time: ${new Date().toISOString()}`)
        return null
      }
      
      console.log('Token is valid and not expired')
    } catch (decodeError) {
      console.error('Failed to decode token:', decodeError)
      return null
    }
    
    // Set the session with the provided tokens
    const sessionData = {
      access_token: accessToken,
      refresh_token: refreshToken || 'dummy_refresh_token' // Supabase requires a refresh token
    }
    
    const { data, error } = await supabase.auth.setSession(sessionData)
    
    console.log('Session set result:', { data, error })
    
    if (error) {
      console.error('Token validation error:', error)
      return null
    }
    
    // Get the user from the session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('User fetch result:', { user, userError })
    
    if (userError) {
      console.error('User fetch error:', userError)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Token validation failed:', error)
    return null
  }
}

// Helper function to store tokens securely
function storeTokens(tokens) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      stored_at: Date.now()
    }))
  } catch (error) {
    console.error('Failed to store tokens:', error)
  }
}

// Helper function to retrieve stored tokens
function getStoredTokens() {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!stored) return null
    
    const tokens = JSON.parse(stored)
    
    // Check if tokens are expired
    if (tokens.expires_at && new Date(tokens.expires_at) <= new Date()) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      return null
    }
    
    return tokens
  } catch (error) {
    console.error('Failed to retrieve tokens:', error)
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    return null
  }
}

// Helper function to clean URL parameters
function cleanUrlParams() {
  try {
    console.log('Cleaning URL parameters from:', window.location.href)
    
    // Use URLSearchParams directly with window.location.search
    const params = new URLSearchParams(window.location.search)
    const paramsToRemove = ['name', 'email', 'token', 'access_token', 'refresh_token', 'user_id', 'expires_at']
    
    paramsToRemove.forEach(param => params.delete(param))
    
    // Construct the new URL without using new URL()
    const baseUrl = window.location.origin + window.location.pathname
    const newUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl
    
    window.history.replaceState({}, '', newUrl)
    console.log('URL cleaned to:', newUrl)
  } catch (error) {
    console.error('Error cleaning URL parameters:', error)
    console.error('URL that caused error:', window.location.href)
    // Fallback: just remove the search params entirely
    const baseUrl = window.location.origin + window.location.pathname
    window.history.replaceState({}, '', baseUrl)
  }
}

// Helper function to listen for cross-domain messages
function setupCrossDomainListener(setUser, setTokens) {
  const handleMessage = (event) => {
    // Only accept messages from mailsfinder.com domain
    if (event.origin !== 'https://mailsfinder.com' && event.origin !== 'http://mailsfinder.com') {
      return
    }
    
    if (event.data && event.data.type === 'USER_AUTH') {
      if (event.data.user) {
        setUser(event.data.user)
      }
      if (event.data.tokens) {
        storeTokens(event.data.tokens)
        setTokens(event.data.tokens)
      }
    }
  }
  
  window.addEventListener('message', handleMessage)
  return () => window.removeEventListener('message', handleMessage)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [tokens, setTokens] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  // Initialize authentication on mount
  useEffect(() => {
    let cleanup = null
    
    const initializeAuth = async () => {
      try {
        setAuthError(null)
        
        // 1. Extract URL parameters when the page loads
        const urlParams = getUrlParams()
        console.log('URL Params:', urlParams)
        
        if (urlParams.access_token || urlParams.token) {
          console.log('Found token, attempting validation...')
          // 2. Validate the access token with Supabase
          const tokenToValidate = urlParams.access_token || urlParams.token
          console.log('Token to validate:', tokenToValidate.substring(0, 50) + '...')
          const validatedUser = await validateAccessToken(tokenToValidate, urlParams.refresh_token)
          console.log('Validation result:', validatedUser)
          
          if (validatedUser) {
            console.log('User validated successfully:', validatedUser.email)
            // 3. Initialize the user session in your dashboard
            const userData = {
              id: validatedUser.id,
              name: urlParams.name || validatedUser.user_metadata?.name || validatedUser.email?.split('@')[0] || 'User',
              email: urlParams.email || validatedUser.email,
              user_id: urlParams.user_id || validatedUser.id
            }
            setUser(userData)
            
            // 4. Store tokens for API calls
            if (urlParams.access_token) {
              const tokenData = {
                access_token: urlParams.access_token,
                refresh_token: urlParams.refresh_token,
                expires_at: urlParams.expires_at
              }
              storeTokens(tokenData)
              setTokens(tokenData)
            }
            
            // Clean URL parameters after extracting user data
            cleanUrlParams()
            
            // Try to fetch additional user data from database
            try {
              const dbUser = await dbService.getUserByEmail(userData.email)
              if (dbUser) {
                setUser({
                  ...userData,
                  ...dbUser,
                  name: dbUser.name || userData.name
                })
              }
            } catch (error) {
              console.error('Error fetching user from database:', error)
            }
          } else {
            // Token validation failed
            setAuthError('Invalid or expired authentication token')
            cleanUrlParams()
          }
        } else if (urlParams.name || urlParams.email) {
          // Fallback for legacy URL parameter flow
          const userData = {
            name: urlParams.name || 'User',
            email: urlParams.email || '',
            user_id: urlParams.user_id || ''
          }
          setUser(userData)
          cleanUrlParams()
        } else {
          // Check for existing Supabase session
          try {
            const currentUser = await authService.getCurrentUser()
            if (currentUser) {
              const userProfile = await authService.getUserProfile(currentUser.id)
              if (userProfile) {
                setUser({
                  id: currentUser.id,
                  email: userProfile.email || currentUser.email,
                  name: userProfile.user_metadata?.display_name || userProfile.user_metadata?.name || userProfile.email?.split('@')[0] || 'User',
                  phone: userProfile.phone,
                  created_at: userProfile.created_at,
                  last_sign_in_at: userProfile.last_sign_in_at,
                  ...userProfile
                })
              } else {
                setUser({
                  id: currentUser.id,
                  email: currentUser.email,
                  name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User'
                })
              }
            } else {
              // Check for stored tokens
              const storedTokens = getStoredTokens()
              if (storedTokens) {
                const validatedUser = await validateAccessToken(storedTokens.access_token)
                if (validatedUser) {
                  setUser({
                    id: validatedUser.id,
                    email: validatedUser.email,
                    name: validatedUser.user_metadata?.name || validatedUser.email?.split('@')[0] || 'User'
                  })
                  setTokens(storedTokens)
                } else {
                  // Stored tokens are invalid
                  localStorage.removeItem(TOKEN_STORAGE_KEY)
                }
              } else {
                // Check localStorage as final fallback
                const raw = localStorage.getItem(STORAGE_KEY)
                if (raw) {
                  const parsed = JSON.parse(raw)
                  if (parsed && typeof parsed === 'object') {
                    setUser(parsed)
                  }
                }
                
                // Set up cross-domain message listener
                cleanup = setupCrossDomainListener(setUser, setTokens)
              }
            }
          } catch (error) {
            console.error('Error checking existing session:', error)
            setAuthError('Failed to verify existing session')
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setAuthError('Authentication initialization failed')
      }
      
      setIsLoading(false)
    }
    
    initializeAuth()
    
    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const userProfile = await authService.getUserProfile(session.user.id)
        if (userProfile) {
          setUser({
            id: session.user.id,
            email: userProfile.email || session.user.email,
            name: userProfile.user_metadata?.display_name || userProfile.user_metadata?.name || userProfile.email?.split('@')[0] || 'User',
            phone: userProfile.phone,
            created_at: userProfile.created_at,
            last_sign_in_at: userProfile.last_sign_in_at,
            ...userProfile
          })
        } else {
          setUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User'
          })
        }
        setAuthError(null)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setTokens(null)
        localStorage.removeItem(TOKEN_STORAGE_KEY)
      }
    })
    
    return () => {
      subscription?.unsubscribe()
      cleanup?.()
    }
  }, [])

  // Persist user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [user])

  const value = useMemo(() => ({
    user,
    tokens,
    isLoading,
    authError,
    isAuthenticated: !!user,
    login: async (userData) => {
      if (userData.email && userData.password) {
        try {
          await authService.signIn(userData.email, userData.password)
          setAuthError(null)
        } catch (error) {
          console.error('Login error:', error)
          setAuthError(error.message || 'Login failed')
          throw error
        }
      } else {
        setUser(userData)
        setAuthError(null)
      }
    },
    logout: async () => {
      try {
        await authService.signOut()
        setUser(null)
        setTokens(null)
        setAuthError(null)
        localStorage.removeItem(TOKEN_STORAGE_KEY)
      } catch (error) {
        console.error('Logout error:', error)
        setUser(null)
        setTokens(null)
        setAuthError(null)
        localStorage.removeItem(TOKEN_STORAGE_KEY)
      }
    },
    clearError: () => setAuthError(null)
  }), [user, tokens, isLoading, authError])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}