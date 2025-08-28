import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Create a user profile if it doesn't exist
 * This uses RLS policies so it only works for the authenticated user
 */
export async function ensureUserProfile(user) {
  if (!user?.id) {
    throw new Error('User not provided')
  }

  try {
    // First, check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      console.log('Profile already exists')
      return existingProfile
    }

    if (checkError && checkError.code !== 'PGRST116') {
      // Error other than "not found"
      throw checkError
    }

    // Profile doesn't exist, create it
    console.log('Creating new user profile...')
    
    const profileData = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      plan: 'free',
      credits_find: 25,
      credits_verify: 25,
      plan_expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating profile:', createError)
      throw createError
    }

    console.log('✅ Profile created successfully:', newProfile)
    return newProfile

  } catch (error) {
    console.error('Error in ensureUserProfile:', error)
    throw error
  }
}

/**
 * Initialize user profile with retry logic
 */
export async function initializeUserProfile(user, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const profile = await ensureUserProfile(user)
      return profile
    } catch (error) {
      console.error(`Profile creation attempt ${attempt} failed:`, error)
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to create profile after ${maxRetries} attempts: ${error.message}`)
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
}