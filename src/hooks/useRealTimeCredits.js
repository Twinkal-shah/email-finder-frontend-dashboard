import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/auth.jsx'
import { getUserProfile, deductCredits } from '../api/user.js'
import { createClient } from '@supabase/supabase-js'
import { initializeUserProfile } from '../utils/profileCreator.js'

// Initialize Supabase client for real-time subscriptions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
      
      // Try to get user profile
      let profile
      try {
        profile = await getUserProfile(user.id)
      } catch (profileError) {
        console.log('Profile not found, attempting to create...')
        
        // If profile doesn't exist, try to create it
        try {
          await initializeUserProfile(user)
          profile = await getUserProfile(user.id)
          console.log('✅ Profile created and loaded successfully')
        } catch (createError) {
          console.error('Failed to create profile:', createError)
          throw createError
        }
      }
      
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
      
      // The real-time subscription will automatically update the UI
      // but we can also update optimistically for better UX
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