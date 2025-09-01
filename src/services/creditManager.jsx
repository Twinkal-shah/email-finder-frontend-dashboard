import { useState, useEffect, useCallback } from 'react'
import creditManager from './creditUtils.js'

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

  const fetchCredits = useCallback(async () => {
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
  }, [user?.id, isAuthenticated])

  useEffect(() => {
    fetchCredits()
  }, [fetchCredits])

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
    
    const checkUserCredits = useCallback(async () => {
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
    }, [user?.id, isAuthenticated])

    useEffect(() => {
      checkUserCredits()
    }, [checkUserCredits])
    
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

export default creditManager