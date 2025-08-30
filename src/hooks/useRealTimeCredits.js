import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/auth.jsx'
import { getUserProfile, deductCredits } from '../api/user.js'
import { supabase } from '../services/supabase.js'

/**
 * Real-time credits hook that provides live credit data from Supabase
 * Automatically updates when credits change in the database
 */
export function useRealTimeCredits() {
  const { user, isAuthenticated } = useAuth()
  console.log('useRealTimeCredits - user:', user, 'isAuthenticated:', isAuthenticated)
  const [creditData, setCreditData] = useState({
    find: 0,
    verify: 0,
    plan: 'free',
    fullName: '',
    planExpiry: null,
    loading: false,
    error: null
  })

  // Fetch initial credit data - always fresh from DB (no caching)
  const fetchCreditData = useCallback(async () => {
    console.log('fetchCreditData called - isAuthenticated:', isAuthenticated, 'user?.id:', user?.id)
    
    // Temporarily use test user ID to test profile fetching
    const testUserId = 'test-user-123'
    console.log('Using test user ID for debugging:', testUserId)
    
    try {
      console.log('Fetching profile for test user ID:', testUserId)
      setCreditData(prev => ({ ...prev, loading: true, error: null }))
      const profile = await getUserProfile(testUserId)
      console.log('Profile received:', profile)

      if (profile) {
        setCreditData({
          find: typeof profile.credits_find === 'number' ? profile.credits_find : 0,
          verify: typeof profile.credits_verify === 'number' ? profile.credits_verify : 0,
          plan: profile.plan || 'free',
          fullName: profile.full_name || '',
          planExpiry: profile.plan_expiry || null,
          loading: false,
          error: null
        })
      } else {
        throw new Error('No profile data received')
      }
    } catch (error) {
      console.error('Error fetching credit data:', error)
      // Safe fallbacks on failure
      const emailLocal = user?.email?.split('@')[0] || 'User'
      setCreditData({
        find: 0,
        verify: 0,
        plan: 'free',
        fullName: emailLocal,
        planExpiry: null,
        loading: false,
        error: error?.message || 'Failed to load profile'
      })
    }
  }, [isAuthenticated, user?.id, user?.email])

  // Set up real-time subscription
  useEffect(() => {
    console.log('useEffect triggered - isAuthenticated:', isAuthenticated, 'user?.id:', user?.id)
    if (!isAuthenticated || !user?.id) {
      console.log('Skipping fetchCreditData - not authenticated or no user ID')
      // Ensure loading is false when not authenticated
      setCreditData(prev => ({ ...prev, loading: false }))
      return
    }

    // Fresh fetch on auth/user change
    console.log('Calling fetchCreditData from useEffect')
    fetchCreditData()

    // Real-time updates for this user's profile
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const newData = payload.new || {}
          setCreditData(prev => ({
            ...prev,
            find: typeof newData.credits_find === 'number' ? newData.credits_find : prev.find,
            verify: typeof newData.credits_verify === 'number' ? newData.credits_verify : prev.verify,
            plan: newData.plan || prev.plan,
            fullName: newData.full_name || prev.fullName,
            planExpiry: newData.plan_expiry || prev.planExpiry,
            loading: false
          }))
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [isAuthenticated, user?.id, fetchCreditData])

  // Function to deduct credits and trigger real-time update
  const useCredits = useCallback(async (operation, quantity = 1) => {
    if (!isAuthenticated || !user?.id) {
      throw new Error('User not authenticated')
    }

    try {
      const creditType = operation.includes('verify') ? 'verify' : 'find'
      const result = await deductCredits(user.id, quantity, creditType)

      // Optimistic update
      setCreditData(prev => ({
        ...prev,
        [creditType]: Math.max(0, prev[creditType] - quantity)
      }))

      return result
    } catch (error) {
      console.error('Error deducting credits:', error)
      throw error
    }
  }, [isAuthenticated, user?.id])

  // Function to check if user has sufficient credits
  const hasCredits = useCallback((operation, quantity = 1) => {
    const creditType = operation.includes('verify') ? 'verify' : 'find'
    const availableCredits = creditData[creditType]
    return availableCredits >= quantity
  }, [creditData])

  // Manual refresh helper
  const refreshCredits = useCallback(() => {
    fetchCreditData()
  }, [fetchCreditData])

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