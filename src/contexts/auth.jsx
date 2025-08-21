import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'auth_user'

const AuthContext = createContext(null)

// Helper function to parse URL parameters
function getUrlParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    name: params.get('name'),
    email: params.get('email'),
    token: params.get('token'),
    user_id: params.get('user_id')
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
    
    try {
      // First, check URL parameters for user data
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
      } else {
        // If no URL params, try localStorage
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
    } catch {}
    
    setIsLoading(false)
    
    return cleanup
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
    login: (userData) => setUser(userData),
    logout: () => setUser(null),
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