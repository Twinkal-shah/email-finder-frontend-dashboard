import axios from 'axios'
import creditManager from '../utils/creditUtils.jsx'
import { authService } from './supabase.js'

const baseURL = import.meta.env.VITE_API_BASE || 'http://173.249.7.231:8500'

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data
    let message = err.message || 'Request failed'
    if (typeof data === 'string') message = data
    else if (data?.message) message = data.message
    else if (data?.error) message = data.error
    else if (data) message = JSON.stringify(data)
    return Promise.reject(new Error(message))
  }
)

// Helper function to get current user ID
async function getCurrentUserId() {
  try {
    const user = await authService.getCurrentUser()
    return user?.id
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function findEmail({ domain, name, names, role, company, all }) {
  try {
    // Get current user ID
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Check credits before operation
    const creditCheck = await creditManager.hasCredits(userId, 'email_find', 1)
    if (!creditCheck.hasCredits) {
      throw new Error(`Insufficient credits. Available: ${creditCheck.availableCredits}, Needed: ${creditCheck.creditsNeeded}`)
    }

    // Prepare API request
    const body = {}
    if (domain) body.domain = domain
    if (company) body.company = company
    if (Array.isArray(names) && names.length) body.names = names
    else if (name) body.names = [name]
    if (role) body.role = role
    if (all) body.all = true

    // Make API call
    const response = await api.post('/find', body)

    // Deduct credits after successful operation
    if (response.data) {
      await creditManager.useCredits(userId, 'email_find', 1)
    }

    return response
  } catch (error) {
    console.error('Error in findEmail:', error)
    throw error
  }
}

export async function verifyEmail(data) {
  try {
    // Get current user ID
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Check credits before operation
    const creditCheck = await creditManager.hasCredits(userId, 'email_verify', 1)
    if (!creditCheck.hasCredits) {
      throw new Error(`Insufficient credits. Available: ${creditCheck.availableCredits}, Needed: ${creditCheck.creditsNeeded}`)
    }

    // Make API call
    const response = await api.post('/verify', data)

    // Deduct credits after successful operation
    if (response.data) {
      await creditManager.useCredits(userId, 'email_verify', 1)
    }

    return response
  } catch (error) {
    console.error('Error in verifyEmail:', error)
    throw error
  }
}

// Bulk operations with credit management
export async function findEmailsBulk(requests) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const quantity = requests.length
    
    // Check credits for bulk operation
    const creditCheck = await creditManager.hasCredits(userId, 'email_find', quantity)
    if (!creditCheck.hasCredits) {
      throw new Error(`Insufficient credits for bulk operation. Available: ${creditCheck.availableCredits}, Needed: ${creditCheck.creditsNeeded}`)
    }

    // Process requests
    const results = []
    let successfulRequests = 0

    for (const request of requests) {
      try {
        const body = {}
        if (request.domain) body.domain = request.domain
        if (request.company) body.company = request.company
        if (Array.isArray(request.names) && request.names.length) body.names = request.names
        else if (request.name) body.names = [request.name]
        if (request.role) body.role = request.role
        if (request.all) body.all = true

        const response = await api.post('/find', body)
        results.push({ success: true, data: response.data, request })
        successfulRequests++
      } catch (error) {
        results.push({ success: false, error: error.message, request })
      }
    }

    // Deduct credits only for successful requests
    if (successfulRequests > 0) {
      await creditManager.useCredits(userId, 'email_find', successfulRequests)
    }

    return { results, successfulRequests, totalRequests: quantity }
  } catch (error) {
    console.error('Error in findEmailsBulk:', error)
    throw error
  }
}

export async function verifyEmailsBulk(emails) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const quantity = emails.length
    
    // Check credits for bulk operation
    const creditCheck = await creditManager.hasCredits(userId, 'email_verify', quantity)
    if (!creditCheck.hasCredits) {
      throw new Error(`Insufficient credits for bulk operation. Available: ${creditCheck.availableCredits}, Needed: ${creditCheck.creditsNeeded}`)
    }

    // Process emails
    const results = []
    let successfulRequests = 0

    for (const email of emails) {
      try {
        const response = await api.post('/verify', { email })
        results.push({ success: true, data: response.data, email })
        successfulRequests++
      } catch (error) {
        results.push({ success: false, error: error.message, email })
      }
    }

    // Deduct credits only for successful requests
    if (successfulRequests > 0) {
      await creditManager.useCredits(userId, 'email_verify', successfulRequests)
    }

    return { results, successfulRequests, totalRequests: quantity }
  } catch (error) {
    console.error('Error in verifyEmailsBulk:', error)
    throw error
  }
}