import { useCallback } from 'react'
import { useAuth } from '../contexts/auth.jsx'
import { deductCredits } from '../api/user.js'

/**
 * Real-time credits hook that provides live credit data from AuthContext
 * Uses the profile data managed by the AuthProvider
 */
export function useRealTimeCredits() {
  const { user, profile, isAuthenticated, profileError, refreshProfile } = useAuth()
  
  // Extract data from profile with fallbacks
  const creditData = {
    find: profile?.credits_find ?? 0,
    verify: profile?.credits_verify ?? 0,
    plan: profile?.plan || 'free',
    fullName: profile?.full_name || (user?.email?.split('@')[0]) || '',
    planExpiry: profile?.plan_expiry || null,
    loading: !profile && isAuthenticated && !profileError,
    error: profileError
  }



  // Function to deduct credits and refresh profile
  const useCredits = useCallback(async (operation, quantity = 1) => {
    if (!isAuthenticated || !user?.id) {
      throw new Error('User not authenticated')
    }

    try {
      const creditType = operation.includes('verify') ? 'verify' : 'find'
      const result = await deductCredits(user.id, quantity, creditType)

      // Refresh profile to get updated credits
      await refreshProfile()

      return result
    } catch (error) {
      console.error('Error deducting credits:', error)
      throw error
    }
  }, [isAuthenticated, user?.id, refreshProfile])

  // Function to check if user has sufficient credits
  const hasCredits = useCallback((operation, quantity = 1) => {
    const creditType = operation.includes('verify') ? 'verify' : 'find'
    const availableCredits = creditData[creditType]
    return availableCredits >= quantity
  }, [creditData])

  // Manual refresh helper
  const refreshCredits = useCallback(() => {
    refreshProfile()
  }, [refreshProfile])

  return {
    // Credit data
    credits: {
      find: creditData.find,
      verify: creditData.verify
    },
    plan: creditData.plan,
    fullName: creditData.fullName,
    planExpiry: creditData.planExpiry,

    // State
    loading: creditData.loading,
    error: creditData.error,

    // Functions
    useCredits,
    hasCredits,
    refreshCredits
  }
}

export default useRealTimeCredits