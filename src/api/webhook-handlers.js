import {
  findUserByEmail,
  createUserIfNotExists,
  updateUserCreditsAndPlan,
  createTransaction,
  getProductConfig
} from './lemonsqueezy-webhook.js'

/**
 * Handle order_created webhook event
 * Triggered when a one-time purchase (lifetime or credit pack) is completed
 */
export async function handleOrderCreated(eventData) {
  try {
    const { data: order } = eventData
    const { attributes } = order
    
    console.log('Processing order_created:', order.id)
    
    // Extract customer email
    const customerEmail = attributes.user_email
    if (!customerEmail) {
      throw new Error('No customer email found in order')
    }
    
    // Find or create user
    const user = await createUserIfNotExists(customerEmail)
    
    // Get product configuration
    const variantName = attributes.first_order_item?.variant_name || ''
    const productName = attributes.first_order_item?.product_name || ''
    const productConfig = getProductConfig(variantName, productName)
    
    if (!productConfig) {
      console.error('Unknown product:', { variantName, productName })
      throw new Error(`Unknown product: ${productName}`)
    }
    
    // Calculate new credits
    const updates = {
      credits_find: user.credits_find + (productConfig.credits_find || 0),
      credits_verify: user.credits_verify + (productConfig.credits_verify || 0)
    }
    
    // For lifetime plans, update the plan
    if (productConfig.type === 'lifetime') {
      updates.plan = 'lifetime'
      updates.plan_expiry = null // Lifetime has no expiry
    }
    
    // Update user
    await updateUserCreditsAndPlan(user.id, updates)
    
    // Create transaction record
    await createTransaction({
      user_id: user.id,
      lemonsqueezy_order_id: order.id,
      product_name: productName,
      product_type: productConfig.type,
      amount: attributes.total / 100, // Convert cents to dollars
      credits_find_added: productConfig.credits_find || 0,
      credits_verify_added: productConfig.credits_verify || 0,
      status: 'completed',
      webhook_event: 'order_created',
      metadata: {
        variant_name: variantName,
        order_number: attributes.order_number
      }
    })
    
    console.log(`Order processed successfully for user ${customerEmail}`)
    return { success: true, message: 'Order processed successfully' }
    
  } catch (error) {
    console.error('Error processing order_created:', error)
    throw error
  }
}

/**
 * Handle subscription_created webhook event
 * Triggered when a new subscription is created
 */
export async function handleSubscriptionCreated(eventData) {
  try {
    const { data: subscription } = eventData
    const { attributes } = subscription
    
    console.log('Processing subscription_created:', subscription.id)
    
    // Extract customer email
    const customerEmail = attributes.user_email
    if (!customerEmail) {
      throw new Error('No customer email found in subscription')
    }
    
    // Find or create user
    const user = await createUserIfNotExists(customerEmail)
    
    // Get product configuration
    const variantName = attributes.variant_name || ''
    const productName = attributes.product_name || ''
    const productConfig = getProductConfig(variantName, productName)
    
    if (!productConfig || productConfig.type !== 'subscription') {
      console.error('Invalid subscription product:', { variantName, productName })
      throw new Error(`Invalid subscription product: ${productName}`)
    }
    
    // Calculate expiry date (30 days from now)
    const planExpiry = new Date()
    planExpiry.setDate(planExpiry.getDate() + 30)
    
    // Update user with subscription details
    const updates = {
      plan: productConfig.plan,
      subscription_id: subscription.id,
      customer_id: attributes.customer_id,
      plan_expiry: planExpiry.toISOString(),
      credits_find: user.credits_find + productConfig.credits_find,
      credits_verify: user.credits_verify + productConfig.credits_verify
    }
    
    await updateUserCreditsAndPlan(user.id, updates)
    
    // Create transaction record
    await createTransaction({
      user_id: user.id,
      lemonsqueezy_subscription_id: subscription.id,
      product_name: productName,
      product_type: 'subscription',
      amount: attributes.card_last_four ? (productConfig.price || 0) : 0,
      credits_find_added: productConfig.credits_find,
      credits_verify_added: productConfig.credits_verify,
      status: 'completed',
      webhook_event: 'subscription_created',
      metadata: {
        variant_name: variantName,
        customer_id: attributes.customer_id
      }
    })
    
    console.log(`Subscription created successfully for user ${customerEmail}`)
    return { success: true, message: 'Subscription created successfully' }
    
  } catch (error) {
    console.error('Error processing subscription_created:', error)
    throw error
  }
}

/**
 * Handle subscription_payment_success webhook event
 * Triggered when a subscription payment is successful (monthly renewal)
 */
export async function handleSubscriptionPaymentSuccess(eventData) {
  try {
    const { data: subscription } = eventData
    const { attributes } = subscription
    
    console.log('Processing subscription_payment_success:', subscription.id)
    
    // Find user by subscription ID
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('subscription_id', subscription.id)
      .single()
    
    if (error || !user) {
      console.error('User not found for subscription:', subscription.id)
      throw new Error(`User not found for subscription: ${subscription.id}`)
    }
    
    // Get product configuration
    const variantName = attributes.variant_name || ''
    const productName = attributes.product_name || ''
    const productConfig = getProductConfig(variantName, productName)
    
    if (!productConfig || productConfig.type !== 'subscription') {
      console.error('Invalid subscription product:', { variantName, productName })
      throw new Error(`Invalid subscription product: ${productName}`)
    }
    
    // Extend plan expiry by 30 days
    const currentExpiry = user.plan_expiry ? new Date(user.plan_expiry) : new Date()
    const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()))
    newExpiry.setDate(newExpiry.getDate() + 30)
    
    // Add monthly credits
    const updates = {
      plan_expiry: newExpiry.toISOString(),
      credits_find: user.credits_find + productConfig.credits_find,
      credits_verify: user.credits_verify + productConfig.credits_verify
    }
    
    await updateUserCreditsAndPlan(user.id, updates)
    
    // Create transaction record
    await createTransaction({
      user_id: user.id,
      lemonsqueezy_subscription_id: subscription.id,
      product_name: productName,
      product_type: 'subscription',
      amount: productConfig.price || 0,
      credits_find_added: productConfig.credits_find,
      credits_verify_added: productConfig.credits_verify,
      status: 'completed',
      webhook_event: 'subscription_payment_success',
      metadata: {
        variant_name: variantName,
        renewal_date: newExpiry.toISOString()
      }
    })
    
    console.log(`Subscription payment processed successfully for user ${user.email}`)
    return { success: true, message: 'Subscription payment processed successfully' }
    
  } catch (error) {
    console.error('Error processing subscription_payment_success:', error)
    throw error
  }
}

/**
 * Handle subscription_expired webhook event
 * Triggered when a subscription expires or is cancelled
 */
export async function handleSubscriptionExpired(eventData) {
  try {
    const { data: subscription } = eventData
    
    console.log('Processing subscription_expired:', subscription.id)
    
    // Find user by subscription ID
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('subscription_id', subscription.id)
      .single()
    
    if (error || !user) {
      console.error('User not found for subscription:', subscription.id)
      throw new Error(`User not found for subscription: ${subscription.id}`)
    }
    
    // Downgrade user to free plan
    const updates = {
      plan: 'free',
      subscription_id: null,
      plan_expiry: null
      // Note: We don't remove existing credits, just stop adding new ones
    }
    
    await updateUserCreditsAndPlan(user.id, updates)
    
    // Create transaction record
    await createTransaction({
      user_id: user.id,
      lemonsqueezy_subscription_id: subscription.id,
      product_name: 'Subscription Expired',
      product_type: 'subscription',
      amount: 0,
      credits_find_added: 0,
      credits_verify_added: 0,
      status: 'completed',
      webhook_event: 'subscription_expired',
      metadata: {
        expired_at: new Date().toISOString()
      }
    })
    
    console.log(`Subscription expired for user ${user.email}`)
    return { success: true, message: 'Subscription expired successfully' }
    
  } catch (error) {
    console.error('Error processing subscription_expired:', error)
    throw error
  }
}

/**
 * Main webhook handler that routes events to appropriate handlers
 */
export async function handleLemonSqueezyWebhook(eventType, eventData) {
  console.log(`Processing webhook event: ${eventType}`)
  
  switch (eventType) {
    case 'order_created':
      return await handleOrderCreated(eventData)
    
    case 'subscription_created':
      return await handleSubscriptionCreated(eventData)
    
    case 'subscription_payment_success':
      return await handleSubscriptionPaymentSuccess(eventData)
    
    case 'subscription_expired':
    case 'subscription_cancelled':
      return await handleSubscriptionExpired(eventData)
    
    default:
      console.log(`Unhandled webhook event: ${eventType}`)
      return { success: true, message: `Event ${eventType} acknowledged but not processed` }
  }
}