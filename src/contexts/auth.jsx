import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authService, dbService } from '../services/supabase'

const STORAGE_KEY = 'auth_user'

const AuthContext = createContext(null)

// Helper function to parse URL parameters
function getUrlParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    name: params.get('name') ? decodeURIComponent(params.get('name')) : null,
    email: params.get('email') ? decodeURIComponent(params.get('email')) : null,
    token: params.get('token') ? decodeURIComponent(params.get('token')) : null,
    user_id: params.get('user_id') ? decodeURIComponent(params.get('user_id')) : null
  }
}

// Helper function to listen for cross-domain messages
function setupCrossDomainListener(setUser) {
  const handleMessage = (event) => {
    // Only accept messages from mailsfinder.com domain
    if (event.origin !== 'https://mailsfinder.com' && event.origin !== 'http://mailsfinder.com') {
      return
    }
    
    if (event.data && event.data.type === 'USER_AUTH' && event.data.user) {
      setUser(event.data.user)
    }
  }
  
  window.addEventListener('message', handleMessage)
  return () => window.removeEventListener('message', handleMessage)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize authentication on mount
  useEffect(() => {
    let cleanup = null
    
    const initializeAuth = async () => {
      try {
        // First, check URL parameters for user data (fallback for existing flow)
        const urlParams = getUrlParams()
        if (urlParams.name || urlParams.email) {
          const userData = {
            name: urlParams.name || 'User',
            email: urlParams.email || '',
            token: urlParams.token || '',
            user_id: urlParams.user_id || ''
          }
          setUser(userData)
          
          // Clean URL parameters after extracting user data
          const url = new URL(window.location)
          url.searchParams.delete('name')
          url.searchParams.delete('email')
          url.searchParams.delete('token')
          url.searchParams.delete('user_id')
          window.history.replaceState({}, '', url.toString())
          
          // If we have email from URL, try to fetch full user data from Supabase
          if (urlParams.email) {
            try {
              const dbUser = await dbService.getUserByEmail(urlParams.email)
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
          }
        } else {
          // Check for existing Supabase session
            const currentUser = await authService.getCurrentUser()
            if (currentUser) {
              // Fetch user profile from Supabase Auth
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
                // Fallback to auth user data
                setUser({
                  id: currentUser.id,
                  email: currentUser.email,
                  name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User'
                })
              }
          } else {
            // If no Supabase session, try localStorage as fallback
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw) {
              const parsed = JSON.parse(raw)
              if (parsed && typeof parsed === 'object') {
                setUser(parsed)
              }
            }
            
            // Set up cross-domain message listener
            cleanup = setupCrossDomainListener(setUser)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
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
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
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
    isLoading,
    isAuthenticated: !!user,
    login: async (userData) => {
      if (userData.email && userData.password) {
        // Sign in with Supabase
        try {
          await authService.signIn(userData.email, userData.password)
          // User state will be updated via onAuthStateChange
        } catch (error) {
          console.error('Login error:', error)
          throw error
        }
      } else {
        // Fallback for direct user data setting
        setUser(userData)
      }
    },
    logout: async () => {
      try {
        await authService.signOut()
        setUser(null)
      } catch (error) {
        console.error('Logout error:', error)
        setUser(null)
      }
    },
  }), [user, isLoading])

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