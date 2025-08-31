import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase.js'
import { profileService } from '../api/profileService.js'

export function useRealTimeCredits(user) {
  const [creditData, setCreditData] = useState({
    find: 0,
    verify: 0,
    loading: true
  })

  const fetchCreditData = useCallback(async () => {
    if (!user?.id) {
      console.log('🔍 No user ID available for credit fetch')
      setCreditData({ find: 0, verify: 0, loading: false })
      return
    }

    try {
      console.log('💰 useRealTimeCredits: Fetching credits for user:', user.id)
      
      const profile = await profileService.getProfile(user.id)
      console.log('💰 useRealTimeCredits: Profile received:', profile)
      
      if (profile) {
        const newCreditData = {
          find: Number(profile.credits_find) || 0,
          verify: Number(profile.credits_verify) || 0,
          loading: false
        }
        console.log('💰 useRealTimeCredits: Setting credits:', newCreditData)
        setCreditData(newCreditData)
      } else {
        console.log('💰 useRealTimeCredits: No profile, setting defaults')
        setCreditData({ find: 0, verify: 0, loading: false })
      }
    } catch (error) {
      console.error('❌ useRealTimeCredits: Error fetching credits:', error)
      setCreditData({ find: 0, verify: 0, loading: false })
    }
  }, [user?.id])

  // Initial fetch
  useEffect(() => {
    fetchCreditData()
  }, [fetchCreditData])

  // Set up real-time subscription for profile changes
  useEffect(() => {
    if (!user?.id) return

    console.log('🔄 useRealTimeCredits: Setting up real-time subscription for user:', user.id)
    
    const subscription = supabase
      .channel(`profile-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 useRealTimeCredits: Real-time update:', payload)
          if (payload.new) {
            const newCreditData = {
              find: Number(payload.new.credits_find) || 0,
              verify: Number(payload.new.credits_verify) || 0,
              loading: false
            }
            console.log('🔄 useRealTimeCredits: Updating credits from real-time:', newCreditData)
            setCreditData(newCreditData)
          }
        }
      )
      .subscribe()

    return () => {
      console.log('🔄 useRealTimeCredits: Cleaning up subscription')
      subscription.unsubscribe()
    }
  }, [user?.id])

  return { creditData, refetch: fetchCreditData }
}