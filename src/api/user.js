import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Get user profile with credits and subscription info
 */
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching user profile:', error)
      throw error
    }
    
    // Check if subscription is expired
    if (data.plan_expiry && new Date(data.plan_expiry) < new Date()) {
      // Auto-downgrade expired subscriptions
      const { data: updatedUser } = await supabase
        .from('users')
        .update({
          plan: 'free',
          subscription_id: null,
          plan_expiry: null
        })
        .eq('id', userId)
        .select()
        .single()
      
      return updatedUser || data
    }
    
    return data
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    throw error
  }
}

/**
 * Get user transactions history
 */
export async function getUserTransactions(userId, limit = 10, offset = 0) {
  try {
    const { data, error, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Error fetching transactions:', error)
      throw error
    }
    
    return {
      transactions: data,
      total: count,
      hasMore: count > offset + limit
    }
  } catch (error) {
    console.error('Error in getUserTransactions:', error)
    throw error
  }
}

/**
 * Check if user has sufficient credits for an operation
 */
export async function checkCredits(userId, creditsNeeded, creditType = 'find') {
  try {
    const user = await getUserProfile(userId)
    
    const availableCredits = creditType === 'find' 
      ? user.credits_find 
      : user.credits_verify
    
    return {
      hasCredits: availableCredits >= creditsNeeded,
      availableCredits,
      creditsNeeded,
      creditType
    }
  } catch (error) {
    console.error('Error checking credits:', error)
    throw error
  }
}

/**
 * Deduct credits from user account
 */
export async function deductCredits(userId, creditsToDeduct, creditType = 'find') {
  try {
    // First check if user has enough credits
    const creditCheck = await checkCredits(userId, creditsToDeduct, creditType)
    
    if (!creditCheck.hasCredits) {
      throw new Error(`Insufficient ${creditType} credits. Available: ${creditCheck.availableCredits}, Needed: ${creditsToDeduct}`)
    }
    
    // Deduct credits
    const updateField = creditType === 'find' ? 'credits_find' : 'credits_verify'
    const { data, error } = await supabase
      .from('users')
      .update({
        [updateField]: creditCheck.availableCredits - creditsToDeduct
      })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Error deducting credits:', error)
      throw error
    }
    
    return {
      success: true,
      remainingCredits: data[updateField],
      deductedCredits: creditsToDeduct,
      creditType
    }
  } catch (error) {
    console.error('Error in deductCredits:', error)
    throw error
  }
}

/**
 * Create or update user profile
 */
export async function upsertUserProfile(userData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(userData, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error upserting user profile:', error)
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Error in upsertUserProfile:', error)
    throw error
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user by email:', error)
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Error in getUserByEmail:', error)
    throw error
  }
}

/**
 * Initialize free trial for new user
 */
export async function initializeFreeTrial(email) {
  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    
    if (existingUser) {
      return existingUser
    }
    
    // Create new user with free trial credits
    const freeTrialExpiry = new Date()
    freeTrialExpiry.setDate(freeTrialExpiry.getDate() + 3) // 3 days trial
    
    const userData = {
      email,
      plan: 'free',
      credits_find: 25,
      credits_verify: 25,
      plan_expiry: freeTrialExpiry.toISOString()
    }
    
    return await upsertUserProfile(userData)
  } catch (error) {
    console.error('Error initializing free trial:', error)
    throw error
  }
}