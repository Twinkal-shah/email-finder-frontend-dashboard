import { checkCredits, deductCredits } from '../api/user.js'

/**
 * Credit Manager class for handling credit operations
 */
class CreditManager {
  constructor() {
    this.cache = new Map()
    this.cacheExpiry = new Map()
    this.CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
    this.operations = {
      find: { credits: 1, type: 'find' },
      verify: { credits: 1, type: 'verify' }
    }
  }

  /**
   * Check if user has sufficient credits for an operation
   * @param {string} userId - User ID
   * @param {string} operation - Operation type ('find' or 'verify')
   * @param {number} quantity - Number of credits needed
   * @returns {Promise<boolean>} - Whether user has sufficient credits
   */
  async hasCredits(userId, operation, quantity = 1) {
    try {
      const creditsNeeded = this.calculateCreditsNeeded(operation, quantity)
      const balance = await this.getCreditBalance(userId)
      const creditType = this.getCreditType(operation)
      
      if (balance[creditType] >= creditsNeeded) {
        return true
      } else {
        console.warn(`Insufficient ${creditType} credits. Need: ${creditsNeeded}, Have: ${balance[creditType]}`)
        return false
      }
    } catch (error) {
      console.error('Error checking credits:', error)
      return false
    }
  }

  /**
   * Use credits for an operation (deduct from balance)
   * @param {string} userId - User ID
   * @param {string} operation - Operation type
   * @param {number} quantity - Number of credits to deduct
   * @returns {Promise<boolean>} - Success status
   */
  async useCredits(userId, operation, quantity = 1) {
    try {
      const creditsNeeded = this.calculateCreditsNeeded(operation, quantity)
      const creditType = this.getCreditType(operation)
      
      const result = await deductCredits(userId, creditType, creditsNeeded)
      
      if (result.success) {
        // Clear cache to force refresh
        this.cache.delete(userId)
        this.cacheExpiry.delete(userId)
        return true
      } else {
        console.error('Failed to deduct credits:', result.error)
        return false
      }
    } catch (error) {
      console.error('Error using credits:', error)
      return false
    }
  }

  /**
   * Get the credit type for an operation
   * @param {string} operation - Operation type
   * @returns {string} - Credit type
   */
  getCreditType(operation) {
    const config = this.operations[operation]
    if (!config) {
      throw new Error(`Unknown operation: ${operation}`)
    }
    return config.type
  }

  /**
   * Calculate credits needed for an operation
   * @param {string} operation - Operation type
   * @param {number} quantity - Quantity
   * @returns {number} - Credits needed
   */
  calculateCreditsNeeded(operation, quantity = 1) {
    const config = this.operations[operation]
    if (!config) {
      throw new Error(`Unknown operation: ${operation}`)
    }
    return config.credits * quantity
  }

  /**
   * Get user's credit balance with caching
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Credit balance object
   */
  async getCreditBalance(userId) {
    const now = Date.now()
    const cached = this.cache.get(userId)
    const expiry = this.cacheExpiry.get(userId)
    
    if (cached && expiry && now < expiry) {
      return cached
    }

    try {
      const result = await checkCredits(userId)
      if (result.success) {
        this.cache.set(userId, result.data)
        this.cacheExpiry.set(userId, now + this.CACHE_DURATION)
        return result.data
      } else {
        console.error('Failed to fetch credits:', result.error)
        return { find: 0, verify: 0 }
      }
    } catch (error) {
      console.error('Error fetching credit balance:', error)
      return { find: 0, verify: 0 }
    }
  }

  /**
   * Check if a plan is currently active
   * @param {string} planExpiry - Plan expiry date
   * @returns {boolean} - Whether plan is active
   */
  isPlanActive(planExpiry) {
    if (!planExpiry) return false
    return new Date(planExpiry) > new Date()
  }

  /**
   * Get credit limits for a plan
   * @param {string} plan - Plan type
   * @returns {Object} - Plan limits
   */
  getPlanLimits(plan) {
    const limits = {
      free: { find: 10, verify: 10 },
      starter: { find: 100, verify: 100 },
      pro: { find: 500, verify: 500 },
      enterprise: { find: 2000, verify: 2000 }
    }
    return limits[plan] || limits.free
  }
}

const creditManager = new CreditManager()

/**
 * Middleware function to check credits before an operation
 * @param {string} userId - User ID
 * @param {string} operation - Operation type
 * @param {number} quantity - Quantity needed
 * @returns {Promise<boolean>} - Whether operation can proceed
 */
export async function creditMiddleware(userId, operation, quantity = 1) {
  return await creditManager.hasCredits(userId, operation, quantity)
}

/**
 * Middleware function to deduct credits after an operation
 * @param {string} userId - User ID
 * @param {string} operation - Operation type
 * @param {number} quantity - Quantity to deduct
 * @returns {Promise<boolean>} - Success status
 */
export async function deductCreditsMiddleware(userId, operation, quantity = 1) {
  return await creditManager.useCredits(userId, operation, quantity)
}

export default creditManager
export { CreditManager }