import React, { useState, useEffect, useCallback } from 'react'
import { useCredits } from '../services/creditManager.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { AlertTriangle, CreditCard, Zap } from 'lucide-react'

/**
 * Credit Guard Component
 * Wraps components that require credits and shows appropriate UI based on credit availability
 */
export function CreditGuard({ 
  children, 
  operation, 
  quantity = 1, 
  showBalance = true,
  fallbackComponent = null 
}) {
  const { user, isAuthenticated } = useAuth()
  const { hasCredits, find, verify, loading: creditsLoading } = useCredits(user, isAuthenticated)
  const [creditCheck, setCreditCheck] = useState(null)
  const balance = { find, verify }
  const [checkLoading, setCheckLoading] = useState(true)
  const [error, setError] = useState(null)

  const checkCreditsOnly = useCallback(async () => {
    try {
      setCheckLoading(true)
      setError(null)
      
      const creditResult = await hasCredits(operation, quantity)
      setCreditCheck(creditResult)
    } catch (err) {
      console.error('Error checking credits:', err)
      setError(err.message)
    } finally {
      setCheckLoading(false)
    }
  }, [hasCredits, operation, quantity])

  useEffect(() => {
    if (isAuthenticated && user) {
      checkCreditsOnly()
    } else {
      setCheckLoading(false)
    }
  }, [isAuthenticated, user, operation, quantity, checkCreditsOnly])

  const refreshCredits = async () => {
    checkCreditsOnly()
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Authentication Required
        </h3>
        <p className="text-gray-600 mb-4">
          Please sign in to use this feature.
        </p>
        <button
          onClick={() => window.location.href = '/login'}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Sign In
        </button>
      </div>
    )
  }

  if (checkLoading || creditsLoading) {
    return (
      <div className="text-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Checking credits...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
        <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Error Loading Credits
        </h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={refreshCredits}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!creditCheck?.hasCredits) {
    if (fallbackComponent) {
      return fallbackComponent
    }

    return (
      <InsufficientCreditsUI 
        creditCheck={creditCheck}
        balance={balance}
        operation={operation}
        quantity={quantity}
        onRefresh={refreshCredits}
      />
    )
  }

  return (
    <div className="space-y-4">
      {showBalance && balance && (
        <CreditBalanceDisplay 
          balance={balance} 
          operation={operation}
          quantity={quantity}
          onRefresh={refreshCredits}
        />
      )}
      {children}
    </div>
  )
}

/**
 * Credit Balance Display Component
 */
function CreditBalanceDisplay({ balance, operation, quantity, onRefresh }) {
  const creditType = operation?.includes('find') ? 'find' : 'verify'
  const currentCredits = balance[creditType] || 0
  const otherCredits = balance[creditType === 'find' ? 'verify' : 'find'] || 0
  
  const isLowCredits = currentCredits < 100
  const isVeryLowCredits = currentCredits < 10
  
  return (
    <div className={`p-4 rounded-lg border ${
      isVeryLowCredits 
        ? 'bg-red-50 border-red-200' 
        : isLowCredits 
        ? 'bg-yellow-50 border-yellow-200'
        : 'bg-green-50 border-green-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Zap className={`h-5 w-5 ${
            isVeryLowCredits 
              ? 'text-red-600' 
              : isLowCredits 
              ? 'text-yellow-600'
              : 'text-green-600'
          }`} />
          <div>
            <p className="font-medium text-gray-900">
              {currentCredits.toLocaleString()} {creditType === 'find' ? 'Finding' : 'Verification'} Credits
            </p>
            <p className="text-sm text-gray-600">
              {otherCredits.toLocaleString()} {creditType === 'find' ? 'Verification' : 'Finding'} Credits
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {quantity > 1 && (
            <span className="text-sm text-gray-600">
              This operation will use {quantity} credits
            </span>
          )}
          
          <button
            onClick={onRefresh}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Refresh
          </button>
          
          {isLowCredits && (
            <button
              onClick={() => window.location.href = '/billing'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              Add Credits
            </button>
          )}
        </div>
      </div>
      
      {balance.plan && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Plan: <span className="font-medium capitalize">{balance.plan}</span>
            {balance.planExpiry && (
              <span className="ml-2">
                (Expires: {new Date(balance.planExpiry).toLocaleDateString()})
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Insufficient Credits UI Component
 */
function InsufficientCreditsUI({ creditCheck, balance, operation, quantity, onRefresh }) {
  const creditType = operation?.includes('find') ? 'finding' : 'verification'
  const availableCredits = creditCheck?.availableCredits || 0
  const creditsNeeded = creditCheck?.creditsNeeded || quantity
  
  return (
    <div className="text-center p-8 bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl">
      <div className="mb-6">
        <CreditCard className="h-16 w-16 text-orange-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Insufficient Credits
        </h3>
        <p className="text-gray-700 text-lg">
          You need <span className="font-semibold text-orange-600">{creditsNeeded}</span> {creditType} credits to use this feature.
        </p>
      </div>
      
      <div className="bg-white rounded-lg p-4 mb-6 border border-orange-100">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-red-600">{availableCredits}</p>
            <p className="text-sm text-gray-600">Available</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">{creditsNeeded}</p>
            <p className="text-sm text-gray-600">Required</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={() => window.location.href = '/billing'}
          className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
        >
          Upgrade Plan or Buy Credits
        </button>
        
        <button
          onClick={onRefresh}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Refresh Balance
        </button>
      </div>
      
      {balance?.plan === 'free' && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Free Plan:</strong> You get 25 finding + 25 verification credits for 3 days.
            Upgrade to get thousands of credits monthly!
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Credit Usage Warning Component
 */
export function CreditUsageWarning({ operation, quantity = 1, onProceed, onCancel }) {
  const creditType = operation?.includes('find') ? 'finding' : 'verification'
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-yellow-800">
            Credit Usage Confirmation
          </h4>
          <p className="text-yellow-700 text-sm mt-1">
            This action will use <strong>{quantity}</strong> {creditType} credit{quantity > 1 ? 's' : ''}.
            Do you want to proceed?
          </p>
          <div className="mt-3 space-x-2">
            <button
              onClick={onProceed}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-medium"
            >
              Proceed
            </button>
            <button
              onClick={onCancel}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook for credit-aware operations
 */
export function useCreditAwareOperation() {
  const { user, isAuthenticated } = useAuth()
  const { useCredits: deductCredits, hasCredits } = useCredits(user, isAuthenticated)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const executeWithCredits = async (operation, quantity, callback) => {
    try {
      setLoading(true)
      setError(null)
      
      // Check credits first
      const creditCheck = await hasCredits(operation, quantity)
      if (!creditCheck.hasCredits) {
        throw new Error(`Insufficient ${creditCheck.creditType} credits`)
      }
      
      // Execute the operation
      const result = await callback()
      
      // Deduct credits only if operation was successful
      if (result && result.success !== false) {
        await deductCredits(operation, quantity)
      }
      
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }
  
  return {
    executeWithCredits,
    loading,
    error,
    clearError: () => setError(null)
  }
}

export default CreditGuard