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
  const [creditData, setCreditData] = useState({
    find: 0,
    verify: 0,
    plan: 'free',
    fullName: '',
    planExpiry: null,
    loading: true,
    error: null
  })

  // Fetch initial credit data
  const fetchCreditData = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setCreditData(prev => ({ ...prev, loading: false }))
      return
    }

    try {
      setCreditData(prev => ({ ...prev, loading: true, error: null }))
      const profile = await getUserProfile(user.id)
      
      setCreditData({
        find: profile.credits_find || 0,
        verify: profile.credits_verify || 0,
        plan: profile.plan || 'free',
        fullName: profile.full_name || '',
        planExpiry: profile.plan_expiry,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Error fetching credit data:', error)
      setCreditData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }))
    }
  }, [isAuthenticated, user?.id])

  // Set up real-time subscription
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return

    // Initial fetch
    fetchCreditData()

    // Set up real-time subscription to profiles table
    const subscription = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time credit update:', payload)
          const newData = payload.new
          setCreditData(prev => ({
            ...prev,
            find: newData.credits_find || 0,
            verify: newData.credits_verify || 0,
            plan: newData.plan || 'free',
            fullName: newData.full_name || '',
            planExpiry: newData.plan_expiry
          }))
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
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

  // Function to refresh credit data manually
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