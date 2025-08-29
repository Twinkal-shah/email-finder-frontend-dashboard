// Use the shared Supabase client so it carries the authenticated session
import { supabase } from '../services/supabase.js'

/**
 * Get user profile with credits and subscription info
 */
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
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
        .from('profiles')
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
 * Deduct credits for an operation
 */
export async function deductCredits(userId, creditsToDeduct, creditType = 'find') {
  try {
    const column = creditType === 'find' ? 'credits_find' : 'credits_verify'
    
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select(column)
      .eq('id', userId)
      .single()
    
    if (fetchError) throw fetchError
    const current = profile?.[column] ?? 0
    const newValue = Math.max(0, current - creditsToDeduct)
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ [column]: newValue })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    
    return {
      remainingCredits: data?.[column] ?? newValue,
      deductedCredits: Math.min(current, creditsToDeduct),
      creditType
    }
  } catch (error) {
    console.error('Error deducting credits:', error)
    throw error
  }
}

/**
 * Upsert user profile
 */
export async function upsertUserProfile(userData) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(userData)
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error upserting user profile:', error)
    throw error
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching user by email:', error)
    throw error
  }
}

/**
 * Initialize free trial for user if needed
 */
export async function initializeFreeTrial(email) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        plan: 'free',
        credits: 25,
        credits_find: 25,
        credits_verify: 25,
        plan_expiry: new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('email', email)
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error initializing free trial:', error)
    throw error
  }
}