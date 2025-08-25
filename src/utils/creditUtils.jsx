import React from 'react'
import { checkCredits, deductCredits, getUserProfile } from '../api/user.js'
import { useAuth } from '../contexts/auth.jsx'

/**
 * Credit management utilities
 */
export class CreditManager {
  constructor() {
    this.creditCosts = {
      find: 1,
      verify: 1,
      bulk_find: 1,
      bulk_verify: 1
    }
  }

  /**
   * Check if user has enough credits for an operation
   */
  async hasCredits(userId, operation, quantity = 1) {
    try {
      const creditsNeeded = this.calculateCreditsNeeded(operation, quantity)
      const creditType = this.getCreditType(operation)
      
      const result = await checkCredits(userId, creditsNeeded, creditType)
      return result.hasCredits
    } catch (error) {
      console.error('Error checking credits:', error)
      return false
    }
  }

  /**
   * Use credits for an operation
   */
  async useCredits(userId, operation, quantity = 1) {
    try {
      const creditsNeeded = this.calculateCreditsNeeded(operation, quantity)
      const creditType = this.getCreditType(operation)
      
      const result = await deductCredits(userId, creditsNeeded, creditType)
      return result.success
    } catch (error) {
      console.error('Error using credits:', error)
      return false
    }
  }

  /**
   * Get credit type based on operation
   */
  getCreditType(operation) {
    switch (operation) {
      case 'find':
      case 'bulk_find':
        return 'find'
      case 'verify':
      case 'bulk_verify':
        return 'verify'
      default:
        return 'find'
    }
  }

  /**
   * Calculate credits needed for operation
   */
  calculateCreditsNeeded(operation, quantity = 1) {
    const baseCost = this.creditCosts[operation] || 1
    return baseCost * quantity
  }

  /**
   * Get user's credit balance
   */
  async getCreditBalance(userId) {
    try {
      const profile = await getUserProfile(userId)
      if (!profile) {
        return {
          findCredits: 0,
          verifyCredits: 0,
          plan: 'free',
          planExpiry: null
        }
      }

      return {
        findCredits: profile.find_credits || 0,
        verifyCredits: profile.verify_credits || 0,
        plan: profile.plan || 'free',
        planExpiry: profile.plan_expiry
      }
    } catch (error) {
      console.error('Error getting credit balance:', error)
      return {
        findCredits: 0,
        verifyCredits: 0,
        plan: 'free',
        planExpiry: null
      }
    }
  }

  /**
   * Check if plan is active
   */
  isPlanActive(planExpiry) {
    if (!planExpiry) return false
    return new Date(planExpiry) > new Date()
  }

  /**
   * Get plan limits
   */
  getPlanLimits(plan) {
    const limits = {
      free: {
        findCredits: 10,
        verifyCredits: 10,
        apiCallsPerMinute: 5
      },
      starter: {
        findCredits: 1000,
        verifyCredits: 1000,
        apiCallsPerMinute: 20
      },
      professional: {
        findCredits: 5000,
        verifyCredits: 5000,
        apiCallsPerMinute: 50
      },
      enterprise: {
        findCredits: 20000,
        verifyCredits: 20000,
        apiCallsPerMinute: 100
      }
    }

    return limits[plan] || limits.free
  }
}

// Create singleton instance
const creditManager = new CreditManager()

/**
 * Middleware functions for credit checking and deduction
 */
export async function creditMiddleware(userId, operation, quantity = 1) {
  const hasCredits = await creditManager.hasCredits(userId, operation, quantity)
  if (!hasCredits) {
    throw new Error('Insufficient credits for this operation')
  }
  return true
}

export async function deductCreditsMiddleware(userId, operation, quantity = 1) {
  return await creditManager.useCredits(userId, operation, quantity)
}

/**
 * React hook for credit management
 */
export function useCredits() {
  const { user } = useAuth()
  const [balance, setBalance] = React.useState({
    findCredits: 0,
    verifyCredits: 0,
    plan: 'free',
    planExpiry: null
  })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  const refreshBalance = React.useCallback(async () => {
    if (!user?.id) {
      setBalance({
        findCredits: 0,
        verifyCredits: 0,
        plan: 'free',
        planExpiry: null
      })
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const newBalance = await creditManager.getCreditBalance(user.id)
      setBalance(newBalance)
      setError(null)
    } catch (err) {
      console.error('Error fetching credit balance:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  React.useEffect(() => {
    refreshBalance()
  }, [refreshBalance])

  const checkCredits = React.useCallback(async (operation, quantity = 1) => {
    if (!user?.id) return false
    return await creditManager.hasCredits(user.id, operation, quantity)
  }, [user?.id])

  const useCreditsForOperation = React.useCallback(async (operation, quantity = 1) => {
    if (!user?.id) return false
    const success = await creditManager.useCredits(user.id, operation, quantity)
    if (success) {
      await refreshBalance()
    }
    return success
  }, [user?.id, refreshBalance])

  return {
    balance,
    loading,
    error,
    refreshBalance,
    checkCredits,
    useCredits: useCreditsForOperation,
    hasCredits: checkCredits
  }
}

/**
 * Higher-Order Component for credit protection
 */
export function withCreditCheck(WrappedComponent, operation, quantity = 1) {
  return function CreditProtectedComponent(props) {
    const { user } = useAuth()
    const [hasCredits, setHasCredits] = React.useState(false)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState(null)

    React.useEffect(() => {
      async function checkUserCredits() {
        if (!user?.id) {
          setHasCredits(false)
          setLoading(false)
          return
        }

        try {
          setLoading(true)
          const result = await creditManager.hasCredits(user.id, operation, quantity)
          setHasCredits(result)
          setError(null)
        } catch (err) {
          console.error('Error checking credits:', err)
          setError(err.message)
          setHasCredits(false)
        } finally {
          setLoading(false)
        }
      }

      checkUserCredits()
    }, [user?.id])

    if (loading) {
      return <div>Checking credits...</div>
    }

    if (error) {
      return <div>Error checking credits: {error}</div>
    }

    if (!hasCredits) {
      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-800 font-medium">Insufficient Credits</h3>
          <p className="text-red-600 text-sm mt-1">
            You need {quantity} credit(s) for {operation} operation.
          </p>
        </div>
      )
    }

    return <WrappedComponent {...props} />
  }
}

export default creditManager