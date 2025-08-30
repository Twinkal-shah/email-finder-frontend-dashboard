import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authService, dbService } from '../services/supabase'
import { getSessionFromCookies, clearSessionCookies, isAuthenticatedFromCookies } from '../utils/cookies'
import cookieAuth from '../services/cookieAuth'
import profilesAccessor from '../services/profilesAccessor'

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
function setupCrossDomainListener(setUser, setTokens, setIsLoading, clearAuthTimeout) {
  let authIframe = null
  
  const handleMessage = async (event) => {
    // Only accept messages from mailsfinder.com domain (with or without www)
    if (event.origin !== 'https://www.mailsfinder.com' && 
        event.origin !== 'https://mailsfinder.com' && 
        event.origin !== 'http://mailsfinder.com') {
      return
    }
    
    if (event.data && event.data.type === 'USER_AUTH') {
      console.log('Received cross-domain auth data:', {
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
        try {
          authIframe.contentWindow.postMessage(
            { type: 'REQUEST_AUTH_DATA' }, 
            useNonWww ? 'https://mailsfinder.com' : 'https://www.mailsfinder.com'
          )
        } catch (error) {
          console.log('Error sending message to auth bridge:', error)
        }
      }
      
      // Handle iframe load errors
      authIframe.onerror = () => {
        console.log('Failed to load auth bridge iframe')
        if (setIsLoading) {
          setIsLoading(false)
        }
      }
      
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
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [profileError, setProfileError] = useState(null)

  // Initialize authentication on mount
  useEffect(() => {
    let cleanup = null
    let authTimeout = null
    let profileUnsubscribe = null
    
    const initializeAuth = async () => {
      try {
        setAuthError(null)
        setProfileError(null)
        
        // 1. Check URL parameters for authentication (legacy support)
        const urlParams = getUrlParams()
        console.log('URL Params:', urlParams)
        
        if (urlParams.access_token || urlParams.token) {
          console.log('Found token in URL, handling authentication...')
          
          // Create session object from URL parameters
          const session = {
            access_token: urlParams.access_token || urlParams.token,
            refresh_token: urlParams.refresh_token,
            expires_at: urlParams.expires_at ? parseInt(urlParams.expires_at) : null,
            user: {
              id: urlParams.user_id,
              email: urlParams.email,
              user_metadata: {
                full_name: urlParams.name
              }
            }
          }
          
          // Handle authentication success with cookie storage
          const success = await cookieAuth.handleAuthSuccess(session)
          
          if (success) {
            console.log('Authentication handled successfully')
            // Clean URL parameters after successful authentication
            cleanUrlParams()
            
            // Get the authenticated user
            const authenticatedUser = await cookieAuth.getCurrentUser()
            if (authenticatedUser) {
              setUser(authenticatedUser)
              
              // Fetch profile data
              const profileResult = await profilesAccessor.getProfile()
              if (profileResult.data) {
                setProfile(profileResult.data)
              } else if (profileResult.error) {
                setProfileError(profileResult.error.message)
              }
            }
          } else {
            setAuthError('Failed to authenticate with provided credentials')
            cleanUrlParams()
          }
        } else {
          // 2. Try to initialize from existing cookie session
          console.log('Checking for existing authentication...')
          
          const isAuth = await cookieAuth.isAuthenticated()
          
          if (isAuth) {
            console.log('User is authenticated, getting user data...')
            
            const authenticatedUser = await cookieAuth.getCurrentUser()
            if (authenticatedUser) {
              setUser(authenticatedUser)
              
              // Fetch profile data
              const profileResult = await profilesAccessor.getProfile()
              if (profileResult.data) {
                setProfile(profileResult.data)
                
                // Subscribe to profile changes
                profileUnsubscribe = profilesAccessor.subscribe((updatedProfile) => {
                  console.log('Profile updated via subscription:', updatedProfile)
                  setProfile(updatedProfile)
                })
              } else if (profileResult.error) {
                console.error('Error fetching profile:', profileResult.error)
                setProfileError(profileResult.error.message)
              }
            } else {
              console.log('Failed to get authenticated user')
              setAuthError('Failed to retrieve user information')
            }
          } else {
            console.log('No existing authentication found')
            
            // Fallback: Set up cross-domain message listener
            const clearAuthTimeout = () => {
              if (authTimeout) {
                clearTimeout(authTimeout)
                authTimeout = null
              }
            }
            
            cleanup = setupCrossDomainListener(setUser, () => {}, setIsLoading, clearAuthTimeout)
            
            // Set a timeout to stop loading if no response is received
            authTimeout = setTimeout(() => {
              console.log('Cross-domain authentication timeout - no response received')
              setIsLoading(false)
            }, 3000) // Wait 3 seconds for cross-domain auth
            
            return // Don't set isLoading to false yet, wait for cross-domain response or timeout
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setAuthError('Authentication initialization failed')
      }
      
      setIsLoading(false)
    }
    
    initializeAuth()
    
    // Listen for Supabase auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email)
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Handle successful sign in
        await cookieAuth.handleAuthSuccess(session)
        setUser(session.user)
        setAuthError(null)
        
        // Fetch profile data
        const profileResult = await profilesAccessor.getProfile({ forceRefresh: true })
        if (profileResult.data) {
          setProfile(profileResult.data)
          setProfileError(null)
        } else if (profileResult.error) {
          setProfileError(profileResult.error.message)
        }
      } else if (event === 'SIGNED_OUT') {
        // Handle sign out
        await cookieAuth.handleLogout()
        setUser(null)
        setProfile(null)
        setAuthError(null)
        setProfileError(null)
        profilesAccessor.clearCache()
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Handle token refresh
        await cookieAuth.setAuthCookie(session)
      }
    })
    
    return () => {
      subscription?.unsubscribe()
      cleanup?.()
      profileUnsubscribe?.()
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
    profile,
    isLoading,
    authError,
    profileError,
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
        await cookieAuth.handleLogout()
        setUser(null)
        setProfile(null)
        setAuthError(null)
        setProfileError(null)
        profilesAccessor.clearCache()
        localStorage.removeItem(FIND_RESULTS_STORAGE_KEY) // Clear search results
      } catch (error) {
        console.error('Logout error:', error)
        await cookieAuth.handleLogout() // Force logout even on error
        setUser(null)
        setProfile(null)
        setAuthError(null)
        setProfileError(null)
        profilesAccessor.clearCache()
        localStorage.removeItem(FIND_RESULTS_STORAGE_KEY) // Clear search results even on error
      }
    },
    refreshProfile: async () => {
      try {
        const result = await profilesAccessor.refresh()
        if (result.data) {
          setProfile(result.data)
          setProfileError(null)
        } else if (result.error) {
          setProfileError(result.error.message)
        }
        return result
      } catch (error) {
        console.error('Error refreshing profile:', error)
        setProfileError(error.message)
        return { data: null, error }
      }
    },
    clearError: () => {
      setAuthError(null)
      setProfileError(null)
    }
  }), [user, profile, isLoading, authError, profileError])

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