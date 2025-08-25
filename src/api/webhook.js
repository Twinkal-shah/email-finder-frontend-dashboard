import { verifyWebhookSignature } from './lemonsqueezy-webhook.js'
import { handleLemonSqueezyWebhook } from './webhook-handlers.js'

/**
 * Main webhook endpoint for LemonSqueezy
 * This should be deployed as a serverless function (Vercel, Netlify, etc.)
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    // Get the raw body and signature
    const signature = req.headers['x-signature']
    const rawBody = JSON.stringify(req.body)
    
    if (!signature) {
      console.error('Missing webhook signature')
      return res.status(400).json({ error: 'Missing webhook signature' })
    }
    
    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature)
    if (!isValid) {
      console.error('Invalid webhook signature')
      return res.status(401).json({ error: 'Invalid webhook signature' })
    }
    
    // Parse the webhook payload
    const payload = req.body
    const eventType = payload.meta?.event_name
    
    if (!eventType) {
      console.error('Missing event type in webhook payload')
      return res.status(400).json({ error: 'Missing event type' })
    }
    
    console.log(`Received webhook: ${eventType}`, {
      id: payload.data?.id,
      type: payload.data?.type
    })
    
    // Process the webhook
    const result = await handleLemonSqueezyWebhook(eventType, payload)
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: result.message,
      event_type: eventType
    })
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    
    // Return error response
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

// For Vercel deployment
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}