import { supabase } from '../services/supabase.js'

/**
 * Robust profile service that handles all profile operations
 * This replaces the problematic getUserProfile function
 */
export const profileService = {
  /**
   * Get user profile with automatic creation if missing
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} Profile data with credits
   */
  async getProfile(userId) {
    if (!userId) {
      throw new Error('User ID is required')
    }

    try {
      console.log('🔍 ProfileService: Fetching profile for user:', userId)
      
      // First, try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new users
        console.error('❌ ProfileService: Database error:', fetchError)
        throw fetchError
      }

      if (existingProfile) {
        console.log('✅ ProfileService: Found existing profile:', existingProfile)
        return existingProfile
      }

      // Profile doesn't exist, create it
      console.log('📝 ProfileService: Creating new profile for user:', userId)
      
      // Get user info from auth
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('❌ ProfileService: Auth error:', userError)
        throw userError
      }

      const newProfile = {
        id: userId,
        email: user?.email || '',
        full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
        display_name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || '',
        phone: user?.user_metadata?.phone || '',
        company: user?.user_metadata?.company || '',
        plan: 'free',
        credits: 0, // Legacy field
        credits_find: 25,
        credits_verify: 25,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single()

      if (createError) {
        console.error('❌ ProfileService: Create error:', createError)
        throw createError
      }

      console.log('✅ ProfileService: Created new profile:', createdProfile)
      return createdProfile

    } catch (error) {
      console.error('❌ ProfileService: Fatal error:', error)
      throw error
    }
  },

  /**
   * Update user profile
   * @param {string} userId - The user ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfile(userId, updates) {
    if (!userId) {
      throw new Error('User ID is required')
    }

    try {
      console.log('📝 ProfileService: Updating profile for user:', userId, updates)
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('❌ ProfileService: Update error:', error)
        throw error
      }

      console.log('✅ ProfileService: Updated profile:', data)
      return data

    } catch (error) {
      console.error('❌ ProfileService: Update fatal error:', error)
      throw error
    }
  },

  /**
   * Update user credits
   * @param {string} userId - The user ID
   * @param {Object} credits - Credit updates {credits_find?, credits_verify?}
   * @returns {Promise<Object>} Updated profile
   */
  async updateCredits(userId, credits) {
    if (!userId) {
      throw new Error('User ID is required')
    }

    try {
      console.log('💰 ProfileService: Updating credits for user:', userId, credits)
      
      const updates = {
        updated_at: new Date().toISOString()
      }

      if (typeof credits.credits_find === 'number') {
        updates.credits_find = credits.credits_find
      }
      
      if (typeof credits.credits_verify === 'number') {
        updates.credits_verify = credits.credits_verify
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('❌ ProfileService: Credits update error:', error)
        throw error
      }

      console.log('✅ ProfileService: Updated credits:', data)
      return data

    } catch (error) {
      console.error('❌ ProfileService: Credits update fatal error:', error)
      throw error
    }
  }
}

export default profileService