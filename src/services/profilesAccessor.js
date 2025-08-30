import { supabase } from './supabase.js'
import { getCurrentUser } from './cookieAuth.js'

/**
 * Profiles data accessor for fetching and managing user profile data
 * Uses RLS to ensure users can only access their own profile data
 */

class ProfilesAccessor {
  constructor() {
    this.cache = null
    this.lastFetch = null
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
    this.isLoading = false
    this.subscribers = new Set()
  }

  /**
   * Subscribe to profile data changes
   */
  subscribe(callback) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  /**
   * Notify all subscribers of profile changes
   */
  notifySubscribers(profile) {
    this.subscribers.forEach(callback => {
      try {
        callback(profile)
      } catch (error) {
        console.error('Error in profile subscriber:', error)
      }
    })
  }

  /**
   * Get user profile data with caching
   */
  async getProfile(options = {}) {
    const { forceRefresh = false, createIfMissing = true } = options

    try {
      // Return cached data if valid and not forcing refresh
      if (!forceRefresh && this.isCacheValid()) {
        console.log('Returning cached profile data')
        return {
          data: this.cache,
          error: null,
          loading: false
        }
      }

      // Prevent multiple simultaneous requests
      if (this.isLoading) {
        console.log('Profile fetch already in progress, waiting...')
        return await this.waitForCurrentFetch()
      }

      this.isLoading = true

      // Get current authenticated user
      const user = await getCurrentUser()
      if (!user) {
        this.isLoading = false
        return {
          data: null,
          error: new Error('No authenticated user found'),
          loading: false
        }
      }

      console.log('Fetching profile for user:', user.id)

      // Query profile data using RLS (auth.uid() = user.id)
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, credits_find, credits_verify, plan, plan_expiry')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        
        // If profile doesn't exist and createIfMissing is true, try to create it
        if (error.code === 'PGRST116' && createIfMissing) {
          console.log('Profile not found, attempting to create...')
          const createResult = await this.createProfile(user)
          
          if (createResult.error) {
            this.isLoading = false
            return {
              data: null,
              error: createResult.error,
              loading: false
            }
          }
          
          // Return the newly created profile
          this.cache = createResult.data
          this.lastFetch = Date.now()
          this.isLoading = false
          this.notifySubscribers(this.cache)
          
          return {
            data: this.cache,
            error: null,
            loading: false
          }
        }
        
        this.isLoading = false
        return {
          data: null,
          error,
          loading: false
        }
      }

      // Process and normalize the data
      const profile = this.normalizeProfile(data, user)
      
      // Update cache
      this.cache = profile
      this.lastFetch = Date.now()
      this.isLoading = false
      
      // Notify subscribers
      this.notifySubscribers(profile)
      
      console.log('Profile fetched successfully:', profile)
      
      return {
        data: profile,
        error: null,
        loading: false
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error)
      this.isLoading = false
      
      return {
        data: null,
        error,
        loading: false
      }
    }
  }

  /**
   * Create a new profile for the user
   */
  async createProfile(user) {
    try {
      console.log('Creating new profile for user:', user.id)
      
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || 
                  `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || null,
        company: user.user_metadata?.company || null,
        plan: 'free',
        plan_expiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        credits: 25,
        credits_find: 25,
        credits_verify: 25
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select('full_name, credits_find, credits_verify, plan, plan_expiry')
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        return { data: null, error }
      }

      const normalizedProfile = this.normalizeProfile(data, user)
      console.log('Profile created successfully:', normalizedProfile)
      
      return { data: normalizedProfile, error: null }
    } catch (error) {
      console.error('Unexpected error creating profile:', error)
      return { data: null, error }
    }
  }

  /**
   * Normalize profile data with fallbacks and proper types
   */
  normalizeProfile(profileData, user) {
    const emailLocal = user.email ? user.email.split('@')[0] : 'User'
    
    return {
      fullName: profileData.full_name || null,
      displayName: profileData.full_name || emailLocal,
      creditsFind: parseInt(profileData.credits_find) || 0,
      creditsVerify: parseInt(profileData.credits_verify) || 0,
      plan: profileData.plan || 'Free',
      planExpiry: profileData.plan_expiry,
      email: user.email,
      userId: user.id
    }
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid() {
    return this.cache && 
           this.lastFetch && 
           (Date.now() - this.lastFetch) < this.cacheTimeout
  }

  /**
   * Wait for current fetch to complete
   */
  async waitForCurrentFetch() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isLoading) {
          clearInterval(checkInterval)
          resolve({
            data: this.cache,
            error: null,
            loading: false
          })
        }
      }, 100)
    })
  }

  /**
   * Force refresh profile data
   */
  async refresh() {
    console.log('Force refreshing profile data')
    return await this.getProfile({ forceRefresh: true })
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = null
    this.lastFetch = null
    console.log('Profile cache cleared')
  }

  /**
   * Update profile data (for optimistic updates)
   */
  updateCache(updates) {
    if (this.cache) {
      this.cache = { ...this.cache, ...updates }
      this.notifySubscribers(this.cache)
      console.log('Profile cache updated:', updates)
    }
  }

  /**
   * Setup real-time subscription for profile changes
   */
  setupRealtimeSubscription() {
    return supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${this.cache?.userId}`
        },
        (payload) => {
          console.log('Real-time profile update received:', payload)
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            const user = { id: payload.new.id, email: payload.new.email }
            const updatedProfile = this.normalizeProfile(payload.new, user)
            
            this.cache = updatedProfile
            this.lastFetch = Date.now()
            this.notifySubscribers(updatedProfile)
          }
        }
      )
      .subscribe()
  }
}

// Create singleton instance
const profilesAccessor = new ProfilesAccessor()

// Export both the instance and the class
export { ProfilesAccessor }
export default profilesAccessor

// Convenience functions for direct use
export const getProfile = (options) => profilesAccessor.getProfile(options)
export const refreshProfile = () => profilesAccessor.refresh()
export const clearProfileCache = () => profilesAccessor.clearCache()
export const subscribeToProfile = (callback) => profilesAccessor.subscribe(callback)
export const updateProfileCache = (updates) => profilesAccessor.updateCache(updates)