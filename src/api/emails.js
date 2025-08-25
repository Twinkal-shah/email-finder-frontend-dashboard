import { creditMiddleware, deductCreditsMiddleware } from '../utils/creditUtils.jsx'
import { getUserProfile } from './user.js'

/**
 * Email Finding API with Credit Management
 * Demonstrates how to integrate credit restrictions into API endpoints
 */

/**
 * Find single email with credit validation
 */
export async function findEmail(userId, domain, firstName, lastName) {
  try {
    // Check if user has sufficient credits
    await creditMiddleware(userId, 'email_find', 1)
    
    // Simulate email finding logic (replace with actual implementation)
    const email = await performEmailFind(domain, firstName, lastName)
    
    // Only deduct credits if email was found successfully
    if (email && email.found) {
      await deductCreditsMiddleware(userId, 'email_find', 1)
    }
    
    return {
      success: true,
      email: email,
      creditsUsed: email && email.found ? 1 : 0
    }
  } catch (error) {
    console.error('Error finding email:', error)
    return {
      success: false,
      error: error.message,
      creditsUsed: 0
    }
  }
}

/**
 * Verify single email with credit validation
 */
export async function verifyEmail(userId, email) {
  try {
    // Check if user has sufficient credits
    await creditMiddleware(userId, 'email_verify', 1)
    
    // Simulate email verification logic (replace with actual implementation)
    const verification = await performEmailVerification(email)
    
    // Deduct credits after verification
    await deductCreditsMiddleware(userId, 'email_verify', 1)
    
    return {
      success: true,
      verification: verification,
      creditsUsed: 1
    }
  } catch (error) {
    console.error('Error verifying email:', error)
    return {
      success: false,
      error: error.message,
      creditsUsed: 0
    }
  }
}

/**
 * Bulk email finding with credit validation
 */
export async function bulkFindEmails(userId, requests) {
  try {
    const quantity = requests.length
    
    // Check if user has sufficient credits for bulk operation
    await creditMiddleware(userId, 'bulk_find', quantity)
    
    // Process emails in batches to avoid overwhelming the system
    const batchSize = 10
    const results = []
    let totalCreditsUsed = 0
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(async (request) => {
          try {
            const email = await performEmailFind(
              request.domain,
              request.firstName,
              request.lastName
            )
            
            // Count successful finds for credit deduction
            if (email && email.found) {
              totalCreditsUsed++
            }
            
            return {
              ...request,
              email: email,
              success: true
            }
          } catch (error) {
            return {
              ...request,
              error: error.message,
              success: false
            }
          }
        })
      )
      
      results.push(...batchResults)
    }
    
    // Deduct credits only for successful finds
    if (totalCreditsUsed > 0) {
      await deductCreditsMiddleware(userId, 'bulk_find', totalCreditsUsed)
    }
    
    return {
      success: true,
      results: results,
      totalProcessed: requests.length,
      successfulFinds: totalCreditsUsed,
      creditsUsed: totalCreditsUsed
    }
  } catch (error) {
    console.error('Error in bulk email finding:', error)
    return {
      success: false,
      error: error.message,
      creditsUsed: 0
    }
  }
}

/**
 * Bulk email verification with credit validation
 */
export async function bulkVerifyEmails(userId, emails) {
  try {
    const quantity = emails.length
    
    // Check if user has sufficient credits for bulk operation
    await creditMiddleware(userId, 'bulk_verify', quantity)
    
    // Process emails in batches
    const batchSize = 20
    const results = []
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(async (email) => {
          try {
            const verification = await performEmailVerification(email)
            return {
              email: email,
              verification: verification,
              success: true
            }
          } catch (error) {
            return {
              email: email,
              error: error.message,
              success: false
            }
          }
        })
      )
      
      results.push(...batchResults)
    }
    
    // Deduct credits for all processed emails
    await deductCreditsMiddleware(userId, 'bulk_verify', quantity)
    
    return {
      success: true,
      results: results,
      totalProcessed: quantity,
      creditsUsed: quantity
    }
  } catch (error) {
    console.error('Error in bulk email verification:', error)
    return {
      success: false,
      error: error.message,
      creditsUsed: 0
    }
  }
}

/**
 * Get user's API usage statistics
 */
export async function getUsageStats(userId, timeframe = '30d') {
  try {
    // This would typically query your analytics/usage tracking system
    // For now, we'll return mock data
    const stats = {
      timeframe: timeframe,
      totalFinds: 1250,
      totalVerifications: 890,
      successRate: 85.2,
      creditsUsed: {
        find: 1250,
        verify: 890,
        total: 2140
      },
      dailyUsage: generateMockDailyUsage(timeframe)
    }
    
    return {
      success: true,
      stats: stats
    }
  } catch (error) {
    console.error('Error getting usage stats:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Check API rate limits and usage quotas
 */
export async function checkApiLimits(userId) {
  try {
    const profile = await getUserProfile(userId)
    const plan = profile.plan || 'free'
    
    // Get plan limits (this would typically come from your configuration)
    const planLimits = {
      free: { dailyLimit: 10, monthlyLimit: 100 },
      starter: { dailyLimit: 1000, monthlyLimit: 50000 },
      pro: { dailyLimit: 5000, monthlyLimit: 150000 },
      lifetime: { dailyLimit: 10000, monthlyLimit: 500000 }
    }
    
    const limits = planLimits[plan] || planLimits.free
    
    // Get current usage (this would query your usage tracking)
    const currentUsage = {
      today: 45,
      thisMonth: 1250
    }
    
    return {
      success: true,
      limits: limits,
      usage: currentUsage,
      remaining: {
        today: Math.max(0, limits.dailyLimit - currentUsage.today),
        thisMonth: Math.max(0, limits.monthlyLimit - currentUsage.thisMonth)
      },
      canMakeRequest: currentUsage.today < limits.dailyLimit && currentUsage.thisMonth < limits.monthlyLimit
    }
  } catch (error) {
    console.error('Error checking API limits:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Mock functions - replace with actual email finding/verification logic
async function performEmailFind(domain, firstName, lastName) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Mock email finding logic
  const found = Math.random() > 0.3 // 70% success rate
  
  if (found) {
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`
    return {
      found: true,
      email: email,
      confidence: Math.floor(Math.random() * 30) + 70, // 70-100% confidence
      sources: ['website', 'social']
    }
  }
  
  return {
    found: false,
    email: null,
    confidence: 0,
    sources: []
  }
}

async function performEmailVerification(email) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 150))
  
  // Mock verification logic
  const statuses = ['valid', 'invalid', 'risky', 'unknown']
  const status = statuses[Math.floor(Math.random() * statuses.length)]
  
  return {
    email: email,
    status: status,
    deliverable: status === 'valid',
    reason: status === 'invalid' ? 'mailbox_not_found' : null,
    risk: status === 'risky' ? 'disposable' : null
  }
}

function generateMockDailyUsage(timeframe) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
  const usage = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    usage.push({
      date: date.toISOString().split('T')[0],
      finds: Math.floor(Math.random() * 100),
      verifications: Math.floor(Math.random() * 80)
    })
  }
  
  return usage
}