import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// LemonSqueezy webhook secret
const LEMONSQUEEZY_WEBHOOK_SECRET = import.meta.env.LEMONSQUEEZY_WEBHOOK_SECRET

if (!LEMONSQUEEZY_WEBHOOK_SECRET) {
  throw new Error('Missing LEMONSQUEEZY_WEBHOOK_SECRET environment variable')
}

// Product configurations
const PRODUCT_CONFIGS = {
  // Monthly subscriptions
  'starter_monthly': {
    plan: 'starter',
    credits_find: 50000,
    credits_verify: 50000,
    price: 29,
    type: 'subscription'
  },
  'pro_monthly': {
    plan: 'pro',
    credits_find: 150000,
    credits_verify: 150000,
    price: 49,
    type: 'subscription'
  },
  // Lifetime plan
  'lifetime': {
    plan: 'lifetime',
    credits_find: 500000,
    credits_verify: 500000,
    price: 249,
    type: 'lifetime'
  },
  // Credit packs
  'credits_100k': {
    credits_find: 100000,
    credits_verify: 0,
    price: 35,
    type: 'credit_pack'
  },
  'credits_50k': {
    credits_find: 50000,
    credits_verify: 0,
    price: 20,
    type: 'credit_pack'
  },
  'credits_25k': {
    credits_find: 25000,
    credits_verify: 0,
    price: 12,
    type: 'credit_pack'
  },
  'credits_10k': {
    credits_find: 10000,
    credits_verify: 0,
    price: 9,
    type: 'credit_pack'
  }
}

/**
 * Verify LemonSqueezy webhook signature
 */
function verifyWebhookSignature(payload, signature) {
  const hmac = crypto.createHmac('sha256', LEMONSQUEEZY_WEBHOOK_SECRET)
  hmac.update(payload, 'utf8')
  const digest = hmac.digest('hex')
  const expectedSignature = `sha256=${digest}`
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  )
}

/**
 * Find user by email
 */
async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error finding user:', error)
    throw error
  }
  
  return data
}

/**
 * Create new user if doesn't exist
 */
async function createUserIfNotExists(email) {
  let user = await findUserByEmail(email)
  
  if (!user) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        email,
        plan: 'free',
        credits_find: 25,
        credits_verify: 25
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating user:', error)
      throw error
    }
    
    user = data
  }
  
  return user
}

/**
 * Update user credits and plan
 */
async function updateUserCreditsAndPlan(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating user:', error)
    throw error
  }
  
  return data
}

/**
 * Create transaction record
 */
async function createTransaction(transactionData) {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transactionData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating transaction:', error)
    throw error
  }
  
  return data
}

/**
 * Get product config by variant name or ID
 */
function getProductConfig(variantName, productName) {
  // Try to match by variant name first
  if (PRODUCT_CONFIGS[variantName]) {
    return PRODUCT_CONFIGS[variantName]
  }
  
  // Try to match by product name
  const configKey = Object.keys(PRODUCT_CONFIGS).find(key => 
    productName.toLowerCase().includes(key.replace('_', ' '))
  )
  
  return configKey ? PRODUCT_CONFIGS[configKey] : null
}

export { verifyWebhookSignature, findUserByEmail, createUserIfNotExists, updateUserCreditsAndPlan, createTransaction, getProductConfig, PRODUCT_CONFIGS }