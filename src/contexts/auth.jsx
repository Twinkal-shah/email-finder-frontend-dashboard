import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authService, dbService } from '../services/supabase'
import { getSessionFromCookies, clearSessionCookies, isAuthenticatedFromCookies } from '../utils/cookies'

const STORAGE_KEY = 'auth_user'
const TOKEN_STORAGE_KEY = 'auth_tokens'
const FIND_RESULTS_STORAGE_KEY = 'find_results'

const AuthContext = createContext(null)

// Helper function to parse URL parameters
function getUrlParams() {
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
function setupCrossDomainListener(setUser, setTokens, setIsLoading, clearAuthTimeout) {
  let authIframe = null
  
  const handleMessage = async (event) => {
    console.log('Received message from:', event.origin, 'Data:', event.data)
    
    // Only accept messages from mailsfinder.com domain (with or without www)
    if (event.origin !== 'https://www.mailsfinder.com' && 
        event.origin !== 'https://mailsfinder.com' && 
        event.origin !== 'http://mailsfinder.com') {
      console.log('Ignoring message from unauthorized origin:', event.origin)
      return
    }
    
    if (event.data && event.data.type === 'USER_AUTH') {
      console.log('Processing USER_AUTH message - Received cross-domain auth data:', {
        user_id: event.data.user?.id,
        email: event.data.user?.email,
        name_fields: {
          name: event.data.user?.name,
          full_name: event.data.user?.full_name,
          display_name: event.data.user?.display_name
        }
      })
      
      // Clear the authentication timeout since we received a response
      if (clearAuthTimeout) {
        clearAuthTimeout()
      }
      
      // Optimistically set user and tokens immediately for instant UI
      try {
        if (event.data.user) {
          const optimisticUser = {
            ...event.data.user,
            // Keep the existing name if it's valid
            name: event.data.user.name || 
                  event.data.user.full_name ||
                  event.data.user.display_name ||
                  event.data.user.email?.split('@')[0] ||
                  'User'
          }
          console.log('Setting optimistic user:', optimisticUser)
          setUser(optimisticUser)
        }
        if (event.data.tokens) {
          storeTokens(event.data.tokens)
          setTokens(event.data.tokens)
        }
      } finally {
        // Stop loading immediately after receiving auth data
        setIsLoading(false)
      }

      // If tokens are provided, immediately set the Supabase session so subsequent
      // requests include the Authorization header (fixes 406 from RLS and session-missing)
      if (event.data.tokens && event.data.tokens.access_token) {
        try {
          await validateAccessToken(
            event.data.tokens.access_token,
            event.data.tokens.refresh_token || null
          )
        } catch (e) {
          console.error('Error applying cross-domain session:', e)
        }
      }
      
      try {
        // Always attempt to enrich user with latest profile from DB
        let enrichedUser = event.data.user || null
        if (event.data.user?.id) {
          const userProfile = await authService.getUserProfile(event.data.user.id)
          if (userProfile) {
            enrichedUser = {
              id: event.data.user.id,
              email: userProfile.email || event.data.user.email,
              // Prioritize full_name from profile
              name: userProfile.full_name || 
                    userProfile.name || 
                    userProfile.display_name || 
                    event.data.user.name || 
                    event.data.user.email?.split('@')[0] || 
                    'User',
              phone: userProfile.phone,
              created_at: userProfile.created_at || event.data.user.created_at,
              last_sign_in_at: userProfile.last_sign_in_at || event.data.user.last_sign_in_at,
              ...userProfile
            }
          } else {
            // No profile found, ensure we have basic user data
            enrichedUser = {
              ...event.data.user,
              name: event.data.user.name || 
                    event.data.user.email?.split('@')[0] || 
                    'User'
            }
          }
          // Update user state with enriched data
          setUser(enrichedUser)
        }
      } catch (error) {
        console.error('Error enriching user data:', error)
        // Ensure loading is cleared even if profile enrichment fails
        if (setIsLoading) {
          setIsLoading(false)
        }
      } finally {
        // Clean up iframe after receiving response
        if (authIframe && authIframe.parentNode) {
          authIframe.parentNode.removeChild(authIframe)
          authIframe = null
        }
      }
    }
  }
  
  window.addEventListener('message', handleMessage)
  
  // Create iframe to communicate with auth bridge
  const createAuthIframe = (useNonWww = false) => {
    try {
      // Remove existing iframe if any
      if (authIframe && authIframe.parentNode) {
        authIframe.parentNode.removeChild(authIframe)
      }
      
      // Create new iframe
      authIframe = document.createElement('iframe')
      authIframe.src = useNonWww
        ? 'https://mailsfinder.com/auth-bridge.html'
        : 'https://www.mailsfinder.com/auth-bridge.html'
      authIframe.style.display = 'none'
      authIframe.style.width = '0'
      authIframe.style.height = '0'
      authIframe.style.border = 'none'
      
      // Add iframe to document
      document.body.appendChild(authIframe)
      
      // Send auth request when iframe loads
      authIframe.onload = () => {
        console.log('Auth bridge iframe loaded, requesting auth data')
        const targetOrigin = useNonWww ? 'https://mailsfinder.com' : 'https://www.mailsfinder.com'
        console.log('Sending REQUEST_AUTH_DATA to:', targetOrigin)
        try {
          authIframe.contentWindow.postMessage(
            { type: 'REQUEST_AUTH_DATA' }, 
            targetOrigin
          )
          console.log('Successfully sent REQUEST_AUTH_DATA message')
        } catch (error) {
          console.log('Error sending message to auth bridge:', error)
        }
      }
      
      // Handle iframe load errors
      authIframe.onerror = () => {
        console.log('Failed to load auth bridge iframe')
        if (clearAuthTimeout) {
          clearAuthTimeout()
        }
        if (setIsLoading) {
          setIsLoading(false)
        }
      }
      
      // Set a timeout for iframe loading
      setTimeout(() => {
        if (authIframe && authIframe.src && !authIframe.contentDocument) {
          console.log('Auth bridge iframe failed to load within timeout')
          if (clearAuthTimeout) {
            clearAuthTimeout()
          }
          if (setIsLoading) {
            setIsLoading(false)
          }
        }
      }, 1000) // 1 second timeout for iframe loading
      
    } catch (error) {
      console.log('Could not create auth iframe:', error)
      if (setIsLoading) {
        setIsLoading(false)
      }
    }
  }
  
  // Create iframe immediately and after a short delay as fallback (non-www)
  createAuthIframe(false)
  const timeoutId = setTimeout(() => createAuthIframe(true), 1000)
  
  return () => {
    window.removeEventListener('message', handleMessage)
    clearTimeout(timeoutId)
    
    // Clean up iframe
    if (authIframe && authIframe.parentNode) {
      authIframe.parentNode.removeChild(authIframe)
      authIframe = null
    }
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [tokens, setTokens] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(null)



  // Initialize authentication on mount
  useEffect(() => {
    let cleanup = null
    let authTimeout = null
    
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
          // Create function to clear auth timeout
          const clearAuthTimeout = () => {
            if (authTimeout) {
              clearTimeout(authTimeout)
              authTimeout = null
            }
          }
          
          // First, check for authentication in cross-domain cookies
          console.log('Checking for authentication in cookies...')
          const cookieSession = getSessionFromCookies()
          
          if (cookieSession && cookieSession.access_token) {
            console.log('Found session in cookies, validating...')
            try {
              const validatedUser = await validateAccessToken(cookieSession.access_token, cookieSession.refresh_token)
              if (validatedUser) {
                console.log('Cookie session validated successfully')
                setUser(cookieSession.user || {
                  id: validatedUser.id,
                  email: validatedUser.email,
                  name: validatedUser.user_metadata?.name || validatedUser.email?.split('@')[0] || 'User'
                })
                setTokens({
                  access_token: cookieSession.access_token,
                  refresh_token: cookieSession.refresh_token,
                  expires_at: cookieSession.expires_at
                })
                setIsLoading(false)
                return // Successfully authenticated via cookies
              } else {
                console.log('Cookie session validation failed, clearing cookies')
                clearSessionCookies()
              }
            } catch (error) {
              console.error('Error validating cookie session:', error)
              clearSessionCookies()
            }
          }
          
          // Set up cross-domain message listener as fallback (only in production)
          const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          
          if (!isDevelopment) {
            cleanup = setupCrossDomainListener(setUser, setTokens, setIsLoading, clearAuthTimeout)
          }
          
          // Check for existing Supabase session
          try {
            const currentUser = await authService.getCurrentUser()
            if (currentUser) {
              const userProfile = await authService.getUserProfile(currentUser.id)
              if (userProfile) {
                setUser({
                  id: currentUser.id,
                  email: userProfile.email || currentUser.email,
                  name: userProfile.full_name || userProfile.display_name || userProfile.name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User',
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
              
              // Check if we're in development environment
                const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                
                if (isDevelopment) {
                  console.log('Development environment detected - skipping cross-domain auth')
                  setIsLoading(false)
                  return
                }
                
                // If no local authentication found, try cross-domain but with quick fallback
                // Set a timeout to stop loading if no response is received
                authTimeout = setTimeout(() => {
                  console.log('Cross-domain authentication timeout - proceeding without authentication')
                  setIsLoading(false)
                }, 1500) // Wait 1.5 seconds for cross-domain auth (reduced from 3 seconds)
                
                // Also set a shorter fallback timeout in case cross-domain completely fails
                setTimeout(() => {
                  if (isLoading) {
                    console.log('Emergency timeout - forcing loading state to false')
                    setIsLoading(false)
                  }
                }, 2000) // Emergency fallback after 2 seconds
                
                return // Don't set isLoading to false yet, wait for cross-domain response or timeout
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
            name: userProfile.full_name || userProfile.display_name || userProfile.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
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
        clearSessionCookies() // Clear cross-domain cookies on sign out
      }
    })
    
    return () => {
      subscription?.unsubscribe()
      if (cleanup) {
        cleanup()
      }
      if (authTimeout) {
        clearTimeout(authTimeout)
      }
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
        localStorage.removeItem(FIND_RESULTS_STORAGE_KEY) // Clear search results
        clearSessionCookies() // Clear cross-domain cookies on logout
      } catch (error) {
        console.error('Logout error:', error)
        setUser(null)
        setTokens(null)
        setAuthError(null)
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        localStorage.removeItem(FIND_RESULTS_STORAGE_KEY) // Clear search results even on error
        clearSessionCookies() // Clear cross-domain cookies even on error
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