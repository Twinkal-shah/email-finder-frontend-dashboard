import { checkCredits, deductCredits } from '../api/user.js'
import { profileService } from '../api/profileService.js'
import { useState, useEffect } from 'react'

/**
 * Credit Manager Service
 * Handles credit validation and deduction for API operations
 */

class CreditManager {
  constructor() {
    this.creditCosts = {
      email_find: 1,
      email_verify: 1,
      bulk_find: 1, // per email
      bulk_verify: 1 // per email
    }
  }

  /**
   * Check if user has sufficient credits for an operation
   */
  async hasCredits(userId, operation, quantity = 1) {
    try {
      const creditType = this.getCreditType(operation)
      const creditsNeeded = this.calculateCreditsNeeded(operation, quantity)
      
      const result = await checkCredits(userId, creditsNeeded, creditType)
      return {
        hasCredits: result.hasCredits,
        availableCredits: result.availableCredits,
        creditsNeeded,
        creditType
      }
    } catch (error) {
      console.error('Error checking credits:', error)
      return {
        hasCredits: false,
        availableCredits: 0,
        creditsNeeded: 0,
        creditType: 'find',
        error: error.message
      }
    }
  }

  /**
   * Deduct credits for an operation
   */
  async useCredits(userId, operation, quantity = 1) {
    try {
      const creditType = this.getCreditType(operation)
      const creditsToDeduct = this.calculateCreditsNeeded(operation, quantity)
      
      // First check if user has enough credits
      const creditCheck = await this.hasCredits(userId, operation, quantity)
      if (!creditCheck.hasCredits) {
        throw new Error(`Insufficient ${creditType} credits. Available: ${creditCheck.availableCredits}, Needed: ${creditsToDeduct}`)
      }
      
      // Deduct credits
      const result = await deductCredits(userId, creditsToDeduct, creditType)
      return {
        success: true,
        remainingCredits: result.remainingCredits,
        deductedCredits: result.deductedCredits,
        creditType: result.creditType
      }
    } catch (error) {
      console.error('Error using credits:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get credit type for operation
   */
  getCreditType(operation) {
    const findOperations = ['email_find', 'bulk_find']
    const verifyOperations = ['email_verify', 'bulk_verify']
    
    if (findOperations.includes(operation)) {
      return 'find'
    } else if (verifyOperations.includes(operation)) {
      return 'verify'
    }
    
    throw new Error(`Unknown operation: ${operation}`)
  }

  /**
   * Calculate credits needed for operation
   */
  calculateCreditsNeeded(operation, quantity = 1) {
    const costPerUnit = this.creditCosts[operation]
    if (!costPerUnit) {
      throw new Error(`Unknown operation: ${operation}`)
    }
    
    return costPerUnit * quantity
  }

  /**
   * Get user's current credit balance
   */
  async getCreditBalance(userId) {
    try {
      const profile = await profileService.getProfile(userId)
      return {
        find: profile.credits_find || 0,
        verify: profile.credits_verify || 0,
        plan: profile.plan || 'free',
        planExpiry: profile.plan_expiry
      }
    } catch (error) {
      console.error('Error getting credit balance:', error)
      return {
        find: 0,
        verify: 0,
        plan: 'free',
        planExpiry: null,
        error: error.message
      }
    }
  }

  /**
   * Check if user's plan is active
   */
  isPlanActive(planExpiry) {
    if (!planExpiry) return true // Free plan or lifetime
    return new Date(planExpiry) > new Date()
  }

  /**
   * Get credit usage limits based on plan
   */
  getPlanLimits(plan) {
    const limits = {
      free: {
        find: 25,
        verify: 25,
        dailyLimit: 10
      },
      starter: {
        find: 50000,
        verify: 50000,
        dailyLimit: 5000
      },
      pro: {
        find: 150000,
        verify: 150000,
        dailyLimit: 15000
      },
      lifetime: {
        find: 500000,
        verify: 500000,
        dailyLimit: 50000
      }
    }
    
    return limits[plan] || limits.free
  }
}

// Create singleton instance
const creditManager = new CreditManager()

/**
 * React hook for credit management
 * @param {Object} user - User object with id
 * @param {boolean} isAuthenticated - Authentication status
 */
export function useCredits(user, isAuthenticated) {
  const [creditData, setCreditData] = useState({
    find: 0,
    verify: 0,
    loading: true
  })

  const fetchCredits = async () => {
    if (!user?.id || !isAuthenticated) {
      setCreditData({ find: 0, verify: 0, loading: false })
      return
    }

    try {
      const balance = await creditManager.getCreditBalance(user.id)
      setCreditData({
        find: balance.find,
        verify: balance.verify,
        loading: false
      })
    } catch (error) {
      console.error('Error fetching credits:', error)
      setCreditData({ find: 0, verify: 0, loading: false })
    }
  }

  useEffect(() => {
    fetchCredits()
  }, [user?.id, isAuthenticated])

  return {
    ...creditData,
    hasCredits: async (operation, quantity = 1) => {
      if (!user?.id) return { hasCredits: false, error: 'User not authenticated' }
      return await creditManager.hasCredits(user.id, operation, quantity)
    },
    useCredits: async (operation, quantity = 1) => {
      if (!user?.id) throw new Error('User not authenticated')
      const result = await creditManager.useCredits(user.id, operation, quantity)
      await fetchCredits() // Refresh credits after use
      return result
    },
    refetch: fetchCredits
  }
}

/**
 * Higher-order component for credit protection
 * Usage: withCreditCheck(Component, operation, quantity)
 * The wrapped component must receive user, isAuthenticated, and hasCredits as props
 */
export function withCreditCheck(WrappedComponent, operation, quantity = 1) {
  return function CreditProtectedComponent(props) {
    const { user, isAuthenticated } = props
    const [creditCheck, setCreditCheck] = useState(null)
    const [loading, setLoading] = useState(true)
    
    useEffect(() => {
      checkUserCredits()
    }, [user?.id, isAuthenticated])

    const checkUserCredits = async () => {
      try {
        if (!user?.id || !isAuthenticated) {
          setCreditCheck({ hasCredits: false, error: 'User not authenticated' })
          return
        }
        
        const result = await creditManager.hasCredits(user.id, operation, quantity)
        setCreditCheck(result)
      } catch (error) {
        setCreditCheck({ hasCredits: false, error: error.message })
      } finally {
        setLoading(false)
      }
    }
    
    if (loading) {
      return <div className="text-center p-4">Checking credits...</div>
    }
    
    if (!creditCheck?.hasCredits) {
      return (
        <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Insufficient Credits
          </h3>
          <p className="text-yellow-700 mb-4">
            You need {quantity} {operation.includes('find') ? 'finding' : 'verification'} credits to use this feature.
          </p>
          <p className="text-sm text-yellow-600 mb-4">
            Available: {creditCheck?.availableCredits || 0} credits
          </p>
          <button
            onClick={() => window.location.href = '/billing'}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md"
          >
            Upgrade Plan
          </button>
        </div>
      )
    }
    
    return <WrappedComponent {...props} creditCheck={creditCheck} />
  }
}

/**
 * API middleware for credit checking
 */
export async function creditMiddleware(userId, operation, quantity = 1) {
  const result = await creditManager.hasCredits(userId, operation, quantity)
  
  if (!result.hasCredits) {
    throw new Error(`Insufficient ${result.creditType} credits. Available: ${result.availableCredits}, Needed: ${result.creditsNeeded}`)
  }
  
  return result
}

/**
 * API middleware for credit deduction
 */
export async function deductCreditsMiddleware(userId, operation, quantity = 1) {
  return await creditManager.useCredits(userId, operation, quantity)
}

export default creditManager
export { CreditManager }