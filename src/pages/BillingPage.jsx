import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/auth.jsx'
import { getUserProfile, getUserTransactions } from '../api/user.js'
import { PRODUCTS, openCheckout, formatPrice, formatCredits } from '../services/lemonsqueezy.js'
import { useCredits } from '../services/creditManager.jsx'

function CreditCard({ title, credits, icon, color }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>
            {formatCredits(credits)}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-lg ${color.replace('text-', 'bg-').replace('-600', '-100')} flex items-center justify-center`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  )
}

function PlanCard({ plan, isCurrentPlan, onUpgrade, userEmail }) {
  const isLifetime = plan.interval === 'lifetime'
  const isSubscription = plan.interval === 'monthly'
  
  return (
    <div className={`bg-white rounded-lg border-2 p-6 relative ${
      isCurrentPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
    }`}>
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Current Plan
          </span>
        </div>
      )}
      
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
        <div className="mt-2">
          <span className="text-3xl font-bold text-gray-900">{formatPrice(plan.price)}</span>
          {isSubscription && <span className="text-gray-600">/month</span>}
          {isLifetime && <span className="text-gray-600"> once</span>}
        </div>
      </div>
      
      <ul className="mt-6 space-y-3">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      
      <div className="mt-6">
        {isCurrentPlan ? (
          <button className="w-full bg-gray-100 text-gray-400 py-2 px-4 rounded-md cursor-not-allowed">
            Current Plan
          </button>
        ) : (
          <button
            onClick={() => onUpgrade(plan, userEmail)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            {isLifetime ? 'Buy Now' : 'Upgrade'}
          </button>
        )}
      </div>
    </div>
  )
}

function CreditPackCard({ pack, onPurchase, userEmail }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-center">
        <h4 className="font-semibold text-gray-900">{pack.name}</h4>
        <div className="mt-1">
          <span className="text-2xl font-bold text-gray-900">{formatPrice(pack.price)}</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {formatCredits(pack.credits_find)} finding credits
        </p>
      </div>
      
      <button
        onClick={() => onPurchase(pack, userEmail)}
        className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-md text-sm transition-colors"
      >
        Buy Credits
      </button>
    </div>
  )
}

function TransactionRow({ transaction }) {
  const statusColors = {
    completed: 'text-green-600 bg-green-100',
    pending: 'text-yellow-600 bg-yellow-100',
    failed: 'text-red-600 bg-red-100',
    refunded: 'text-gray-600 bg-gray-100'
  }
  
  return (
    <tr className="border-b border-gray-200">
      <td className="py-3 px-4">
        <div className="font-medium text-gray-900">{transaction.product_name}</div>
        <div className="text-sm text-gray-600">
          {new Date(transaction.created_at).toLocaleDateString()}
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          statusColors[transaction.status] || statusColors.pending
        }`}>
          {transaction.status}
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="font-medium text-gray-900">{formatPrice(transaction.amount)}</div>
        {(transaction.credits_find_added > 0 || transaction.credits_verify_added > 0) && (
          <div className="text-sm text-gray-600">
            +{formatCredits(transaction.credits_find_added + transaction.credits_verify_added)} credits
          </div>
        )}
      </td>
    </tr>
  )
}

export default function BillingPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData()
    } else if (!authLoading && !isAuthenticated) {
      // Authentication completed but user is not authenticated
      setLoading(false)
    }
  }, [isAuthenticated, user, authLoading])
  
  const loadUserData = async () => {
    try {
      setLoading(true)
      const [profile, transactionData] = await Promise.all([
        getUserProfile(user.id),
        getUserTransactions(user.id, 10)
      ])
      
      setUserProfile(profile)
      setTransactions(transactionData.transactions)
    } catch (err) {
      console.error('Error loading user data:', err)
      setError('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }
  
  const handleUpgrade = (plan, userEmail) => {
    openCheckout(plan, userEmail, {
      'checkout[custom][user_id]': user.id,
      'checkout[custom][plan_type]': plan.interval
    })
  }
  
  const handleCreditPurchase = (pack, userEmail) => {
    openCheckout(pack, userEmail, {
      'checkout[custom][user_id]': user.id,
      'checkout[custom][product_type]': 'credit_pack'
    })
  }
  
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Please sign in to view billing</h1>
        </div>
      </div>
    )
  }
  
  if (loading || authLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {authLoading ? 'Authenticating...' : 'Loading billing information...'}
          </p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadUserData}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
  
  const planExpiry = userProfile?.plan_expiry ? new Date(userProfile.plan_expiry) : null
  const isExpired = planExpiry && planExpiry < new Date()
  const daysUntilExpiry = planExpiry ? Math.ceil((planExpiry - new Date()) / (1000 * 60 * 60 * 24)) : null
  
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing & Usage</h1>
        <p className="text-gray-600 mt-2">Manage your subscription and monitor your credit usage</p>
      </div>
      
      {/* Current Plan Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
            <p className="text-2xl font-bold text-blue-600 mt-1 capitalize">
              {userProfile?.plan || 'Free'} Plan
            </p>
            {planExpiry && !isExpired && (
              <p className="text-sm text-gray-600 mt-1">
                {daysUntilExpiry > 0 ? `Renews in ${daysUntilExpiry} days` : 'Expires today'}
              </p>
            )}
            {isExpired && (
              <p className="text-sm text-red-600 mt-1">Plan expired</p>
            )}
          </div>
          {userProfile?.plan === 'free' && (
            <button
              onClick={() => handleUpgrade(PRODUCTS.subscriptions.starter, user.email)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
            >
              Upgrade Now
            </button>
          )}
        </div>
      </div>
      
      {/* Credits Overview */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Credit Balance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CreditCard
            title="Email Finding Credits"
            credits={userProfile?.credits_find || 0}
            icon="🔍"
            color="text-blue-600"
          />
          <CreditCard
            title="Email Verification Credits"
            credits={userProfile?.credits_verify || 0}
            icon="✅"
            color="text-green-600"
          />
        </div>
      </div>
      
      {/* Subscription Plans */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PlanCard
            plan={PRODUCTS.subscriptions.starter}
            isCurrentPlan={userProfile?.plan === 'starter'}
            onUpgrade={handleUpgrade}
            userEmail={user.email}
          />
          <PlanCard
            plan={PRODUCTS.subscriptions.pro}
            isCurrentPlan={userProfile?.plan === 'pro'}
            onUpgrade={handleUpgrade}
            userEmail={user.email}
          />
          <PlanCard
            plan={PRODUCTS.lifetime}
            isCurrentPlan={userProfile?.plan === 'lifetime'}
            onUpgrade={handleUpgrade}
            userEmail={user.email}
          />
        </div>
      </div>
      
      {/* Credit Packs */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Buy Additional Credits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(PRODUCTS.creditPacks).map((pack, index) => (
            <CreditPackCard
              key={index}
              pack={pack}
              onPurchase={handleCreditPurchase}
              userEmail={user.email}
            />
          ))}
        </div>
      </div>
      
      {/* Transaction History */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction History</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {transactions.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Product</th>
                  <th className="py-3 px-4 text-center text-sm font-medium text-gray-700">Status</th>
                  <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No transactions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}