// LemonSqueezy configuration and checkout integration

// LemonSqueezy store configuration
const LEMONSQUEEZY_STORE_ID = process.env.VITE_LEMONSQUEEZY_STORE_ID
const LEMONSQUEEZY_API_KEY = process.env.VITE_LEMONSQUEEZY_API_KEY

// Product configurations with LemonSqueezy product/variant IDs
// Note: Replace these with your actual LemonSqueezy product/variant IDs
export const PRODUCTS = {
  subscriptions: {
    starter: {
      name: 'Starter Plan',
      price: 29,
      credits_find: 50000,
      credits_verify: 50000,
      interval: 'monthly',
      productId: 'your-starter-product-id', // Replace with actual LemonSqueezy product ID
      variantId: 'your-starter-variant-id', // Replace with actual LemonSqueezy variant ID
      checkoutUrl: 'https://mailsfinder.lemonsqueezy.com/checkout/buy/your-starter-variant-id',
      features: [
        '50,000 email finding credits',
        '50,000 email verification credits',
        'Monthly renewal',
        'Email support'
      ]
    },
    pro: {
      name: 'Pro Plan',
      price: 49,
      credits_find: 150000,
      credits_verify: 150000,
      interval: 'monthly',
      productId: 'your-pro-product-id',
      variantId: 'your-pro-variant-id',
      checkoutUrl: 'https://mailsfinder.lemonsqueezy.com/checkout/buy/your-pro-variant-id',
      features: [
        '150,000 email finding credits',
        '150,000 email verification credits',
        'Monthly renewal',
        'Priority email support',
        'API access'
      ]
    }
  },
  lifetime: {
    name: 'Lifetime Plan',
    price: 249,
    credits_find: 500000,
    credits_verify: 500000,
    interval: 'lifetime',
    productId: 'your-lifetime-product-id',
    variantId: 'your-lifetime-variant-id',
    checkoutUrl: 'https://mailsfinder.lemonsqueezy.com/checkout/buy/your-lifetime-variant-id',
    features: [
      '500,000 email finding credits',
      '500,000 email verification credits',
      'One-time payment',
      'Lifetime access',
      'Priority support',
      'API access'
    ]
  },
  creditPacks: {
    credits_10k: {
      name: '10,000 Credits',
      price: 9,
      credits_find: 10000,
      credits_verify: 0,
      productId: 'your-10k-credits-product-id',
      variantId: 'your-10k-credits-variant-id',
      checkoutUrl: 'https://mailsfinder.lemonsqueezy.com/checkout/buy/your-10k-credits-variant-id'
    },
    credits_25k: {
      name: '25,000 Credits',
      price: 12,
      credits_find: 25000,
      credits_verify: 0,
      productId: 'your-25k-credits-product-id',
      variantId: 'your-25k-credits-variant-id',
      checkoutUrl: 'https://mailsfinder.lemonsqueezy.com/checkout/buy/your-25k-credits-variant-id'
    },
    credits_50k: {
      name: '50,000 Credits',
      price: 20,
      credits_find: 50000,
      credits_verify: 0,
      productId: 'your-50k-credits-product-id',
      variantId: 'your-50k-credits-variant-id',
      checkoutUrl: 'https://mailsfinder.lemonsqueezy.com/checkout/buy/your-50k-credits-variant-id'
    },
    credits_100k: {
      name: '100,000 Credits',
      price: 35,
      credits_find: 100000,
      credits_verify: 0,
      productId: 'your-100k-credits-product-id',
      variantId: 'your-100k-credits-variant-id',
      checkoutUrl: 'https://mailsfinder.lemonsqueezy.com/checkout/buy/your-100k-credits-variant-id'
    }
  }
}

/**
 * Generate checkout URL with custom data
 */
export function generateCheckoutUrl(product, userEmail, customData = {}) {
  const baseUrl = product.checkoutUrl
  const params = new URLSearchParams({
    'checkout[email]': userEmail,
    'checkout[custom][user_email]': userEmail,
    ...customData
  })
  
  return `${baseUrl}?${params.toString()}`
}

/**
 * Open LemonSqueezy checkout
 */
export function openCheckout(product, userEmail, customData = {}) {
  const checkoutUrl = generateCheckoutUrl(product, userEmail, customData)
  
  // Open in new window/tab
  window.open(checkoutUrl, '_blank', 'noopener,noreferrer')
}

/**
 * Get all available products organized by category
 */
export function getAllProducts() {
  return PRODUCTS
}

/**
 * Get product by ID
 */
export function getProductById(productId) {
  // Search through all product categories
  for (const category of Object.values(PRODUCTS)) {
    if (typeof category === 'object' && !Array.isArray(category)) {
      for (const product of Object.values(category)) {
        if (product.productId === productId || product.variantId === productId) {
          return product
        }
      }
    }
  }
  return null
}

/**
 * Calculate savings for annual vs monthly plans
 */
export function calculateSavings(monthlyPrice, annualPrice) {
  const annualMonthlyEquivalent = annualPrice / 12
  const savings = monthlyPrice - annualMonthlyEquivalent
  const savingsPercentage = (savings / monthlyPrice) * 100
  
  return {
    monthlySavings: savings,
    annualSavings: savings * 12,
    savingsPercentage: Math.round(savingsPercentage)
  }
}

/**
 * Format price for display
 */
export function formatPrice(price, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(price)
}

/**
 * Format credits for display
 */
export function formatCredits(credits) {
  if (credits >= 1000000) {
    return `${(credits / 1000000).toFixed(1)}M`
  } else if (credits >= 1000) {
    return `${(credits / 1000).toFixed(0)}k`
  }
  return credits.toString()
}

/**
 * Get recommended plan based on usage
 */
export function getRecommendedPlan(monthlyEmailFinds, monthlyVerifications) {
  const totalMonthlyUsage = monthlyEmailFinds + monthlyVerifications
  
  if (totalMonthlyUsage <= 50000) {
    return PRODUCTS.subscriptions.starter
  } else if (totalMonthlyUsage <= 150000) {
    return PRODUCTS.subscriptions.pro
  } else {
    return PRODUCTS.lifetime
  }
}

/**
 * Check if user should upgrade based on current usage
 */
export function shouldUpgrade(currentPlan, creditsUsedThisMonth) {
  const planLimits = {
    free: 50, // 25 find + 25 verify
    starter: 100000, // 50k find + 50k verify
    pro: 300000, // 150k find + 150k verify
    lifetime: Infinity
  }
  
  const currentLimit = planLimits[currentPlan] || 0
  const usagePercentage = (creditsUsedThisMonth / currentLimit) * 100
  
  return {
    shouldUpgrade: usagePercentage > 80,
    usagePercentage,
    recommendedPlan: getRecommendedPlan(creditsUsedThisMonth / 2, creditsUsedThisMonth / 2)
  }
}