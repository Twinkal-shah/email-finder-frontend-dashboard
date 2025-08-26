import { findEmail as apiFindEmail, verifyEmail as apiVerifyEmail } from './api.js'
import { creditMiddleware, deductCreditsMiddleware } from './creditManager.jsx'
import { useAuth } from '../contexts/auth.jsx'

/**
 * Email Service with Credit Management
 * Wraps the existing API calls with credit validation and deduction
 */

/**
 * Find emails with credit validation and deduction
 */
export async function findEmailWithCredits(userId, payload) {
  try {
    // Determine number of credits needed based on the request
    const creditsNeeded = calculateCreditsForFind(payload)
    
    // Check if user has sufficient credits
    await creditMiddleware(userId, 'email_find', creditsNeeded)
    
    // Make the API call
    const response = await apiFindEmail(payload)
    
    // Only deduct credits if the request was successful and returned results
    if (response.data && (Array.isArray(response.data) ? response.data.length > 0 : response.data)) {
      await deductCreditsMiddleware(userId, 'email_find', creditsNeeded)
      
      // Dispatch credit update event to refresh UI
      window.dispatchEvent(new CustomEvent('creditUpdate'))
    }
    
    return {
      ...response,
      creditsUsed: creditsNeeded
    }
  } catch (error) {
    console.error('Error finding email with credits:', error)
    throw error
  }
}

/**
 * Verify emails with credit validation and deduction
 */
export async function verifyEmailWithCredits(userId, payload) {
  try {
    // Determine number of credits needed
    const creditsNeeded = calculateCreditsForVerify(payload)
    
    // Check if user has sufficient credits
    await creditMiddleware(userId, 'email_verify', creditsNeeded)
    
    // Make the API call
    const response = await apiVerifyEmail(payload)
    
    // Only deduct credits if the request was successful
    if (response.data) {
      await deductCreditsMiddleware(userId, 'email_verify', creditsNeeded)
      
      // Dispatch credit update event to refresh UI
      window.dispatchEvent(new CustomEvent('creditUpdate'))
    }
    
    return {
      ...response,
      creditsUsed: creditsNeeded
    }
  } catch (error) {
    console.error('Error verifying email with credits:', error)
    throw error
  }
}

/**
 * Calculate credits needed for find operation
 */
function calculateCreditsForFind(payload) {
  if (payload.all) {
    // Company-wide search might use more credits
    return 5 // Adjust based on your pricing model
  }
  
  if (Array.isArray(payload.names)) {
    return payload.names.length
  }
  
  return 1 // Single name search
}

/**
 * Calculate credits needed for verify operation
 */
function calculateCreditsForVerify(payload) {
  if (Array.isArray(payload.emails)) {
    return payload.emails.length
  }
  
  return 1 // Single email verification
}

/**
 * Hook to get credit-enabled email functions
 */
export function useEmailService() {
  const { user } = useAuth()
  
  const findEmail = async (payload) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }
    return await findEmailWithCredits(user.id, payload)
  }
  
  const verifyEmail = async (payload) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }
    return await verifyEmailWithCredits(user.id, payload)
  }
  
  return {
    findEmail,
    verifyEmail
  }
}