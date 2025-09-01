import { createContext, useEffect, useMemo, useState, useCallback } from 'react'
import { authService } from '../services/supabase'
import { clearSessionCookies } from '../utils/cookies'
import { STORAGE_KEY, TOKEN_STORAGE_KEY, FIND_RESULTS_STORAGE_KEY } from '../constants/auth.js'
import { getUrlParams, validateAccessToken, storeTokens, getStoredTokens, cleanUrlParams, setupCrossDomainListener } from '../utils/authUtils.js'

export const AuthContext = createContext(null)

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
        console.log('🔍 AuthProvider: Starting authentication initialization...')
        
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
            
            // 3. Store tokens securely
            const tokensToStore = {
              access_token: tokenToValidate,
              refresh_token: urlParams.refresh_token
            }
            storeTokens(tokensToStore)
            
            // 4. Set user state
            setUser(validatedUser)
            setTokens(tokensToStore)
            
            // 5. Clean URL parameters
            cleanUrlParams()
            
            console.log('✅ Authentication successful!')
          } else {
            console.log('❌ Token validation failed')
            setAuthError('Token validation failed')
          }
        } else {
          console.log('No tokens in URL, checking stored tokens...')
          
          // Check for stored tokens
          const storedTokens = getStoredTokens()
          if (storedTokens?.access_token) {
            console.log('Found stored tokens, validating...')
            const validatedUser = await validateAccessToken(storedTokens.access_token, storedTokens.refresh_token)
            
            if (validatedUser) {
              console.log('Stored tokens are valid')
              setUser(validatedUser)
              setTokens(storedTokens)
            } else {
              console.log('Stored tokens are invalid, clearing...')
              localStorage.removeItem(TOKEN_STORAGE_KEY)
              setAuthError('Stored tokens are invalid')
            }
          } else {
            console.log('No stored tokens found')
          }
        }
        
        // Setup cross-domain listener for iframe authentication
        cleanup = setupCrossDomainListener((userData) => {
          console.log('Cross-domain auth received:', userData)
          setUser(userData)
          if (userData.tokens) {
            setTokens(userData.tokens)
            storeTokens(userData.tokens)
          }
        })
        
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
        setAuthError(error.message)
      } finally {
        setIsLoading(false)
      }
    }
    
    // Set a timeout for authentication
    authTimeout = setTimeout(() => {
      if (isLoading) {
        console.log('⏰ Auth timeout reached')
        setIsLoading(false)
        setAuthError('Authentication timeout')
      }
    }, 10000) // 10 second timeout
    
    initializeAuth()
    
    return () => {
       if (cleanup) cleanup()
       if (authTimeout) clearTimeout(authTimeout)
     }
    }, [isLoading])

   const login = useCallback(async (email, password) => {
     try {
       setIsLoading(true)
       setAuthError(null)
       
       const { data, error } = await authService.signInWithPassword({
         email,
         password,
       })
       
       if (error) throw error
       
       setUser(data.user)
       setTokens(data.session)
       storeTokens(data.session)
       
       return { success: true }
     } catch (error) {
       console.error('Login error:', error)
       setAuthError(error.message)
       return { success: false, error: error.message }
     } finally {
       setIsLoading(false)
     }
   }, [])

   const logout = useCallback(async () => {
     try {
       setIsLoading(true)
       
       // Clear local state
       setUser(null)
       setTokens(null)
       setAuthError(null)
       
       // Clear stored tokens
       localStorage.removeItem(TOKEN_STORAGE_KEY)
       localStorage.removeItem(STORAGE_KEY)
       localStorage.removeItem(FIND_RESULTS_STORAGE_KEY)
       
       // Clear session cookies
       clearSessionCookies()
       
       // Sign out from Supabase
       await authService.signOut()
       
       console.log('✅ Logout successful')
     } catch (error) {
       console.error('Logout error:', error)
     } finally {
       setIsLoading(false)
     }
   }, [])

   const refreshAuth = useCallback(async () => {
     try {
       if (!tokens?.refresh_token) {
         throw new Error('No refresh token available')
       }
       
       const { data, error } = await authService.refreshSession({
         refresh_token: tokens.refresh_token
       })
       
       if (error) throw error
       
       setUser(data.user)
       setTokens(data.session)
       storeTokens(data.session)
       
       return { success: true }
     } catch (error) {
       console.error('Refresh auth error:', error)
       setAuthError(error.message)
       return { success: false, error: error.message }
     }
   }, [tokens])

  const value = useMemo(() => ({
     user,
     tokens,
     isLoading,
     authError,
     login,
     logout,
     refreshAuth,
     isAuthenticated: !!user
   }), [user, tokens, isLoading, authError, login, logout, refreshAuth])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}