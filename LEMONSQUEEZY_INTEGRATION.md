# LemonSqueezy Integration for MailsFinder

This document outlines the complete LemonSqueezy integration for handling subscriptions and credit packs in the MailsFinder project.

## Overview

The integration includes:
- Subscription plans ($29, $49, $249 lifetime)
- Credit packs (10k, 25k, 50k, 100k credits)
- Free plan (25 finding + 25 verification credits for 3 days)
- Webhook handling for order and subscription events
- Credit usage restrictions for API endpoints
- React dashboard for billing management

## Database Schema

### Users Table
```sql
-- Location: supabase/migrations/001_create_users_table.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',
  credits_find INTEGER DEFAULT 25,
  credits_verify INTEGER DEFAULT 25,
  plan_expiry TIMESTAMPTZ,
  subscription_id TEXT,
  customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Transactions Table
```sql
-- Location: supabase/migrations/002_create_transactions_table.sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT,
  subscription_id TEXT,
  product_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  credits_added INTEGER DEFAULT 0,
  transaction_type TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Backend Components

### 1. Webhook Handler (`src/api/webhook.js`)
Main endpoint for LemonSqueezy webhooks:
- Verifies webhook signatures
- Routes events to appropriate handlers
- Handles POST requests to `/api/webhook/lemonsqueezy`

### 2. Webhook Utilities (`src/api/lemonsqueezy-webhook.js`)
Core utilities for webhook processing:
- `verifyWebhookSignature()` - Validates LemonSqueezy signatures
- `findOrCreateUser()` - Manages user creation/lookup
- `updateUserCredits()` - Updates user credit balances
- `recordTransaction()` - Logs transactions to database

### 3. Event Handlers (`src/api/webhook-handlers.js`)
Specific handlers for each webhook event:
- `handleOrderCreated` - Processes one-time purchases (credit packs, lifetime)
- `handleSubscriptionCreated` - Sets up new subscriptions
- `handleSubscriptionPaymentSuccess` - Adds monthly credits
- `handleSubscriptionExpired` - Downgrades expired subscriptions

### 4. User API (`src/api/user.js`)
User management endpoints:
- `getUserProfile()` - Get user data and credits
- `getUserTransactions()` - Get transaction history
- `checkCredits()` - Validate credit availability
- `deductCredits()` - Deduct credits for operations
- `initializeFreeUser()` - Set up free trial

### 5. LemonSqueezy Service (`src/api/lemonsqueezy.js`)
LemonSqueezy integration utilities:
- Product configurations and pricing
- Checkout URL generation
- Price formatting and calculations
- Upgrade recommendations

## Credit Management System

### Credit Manager Service (`src/services/creditManager.js`)
Comprehensive credit management:
- `CreditManager` class for credit operations
- `useCredits()` React hook
- `withCreditCheck()` HOC for component protection
- Middleware functions for API credit validation

### Email API with Credit Restrictions (`src/api/emails.js`)
Example implementation showing:
- Credit validation before operations
- Credit deduction after successful operations
- Bulk operation handling
- Usage statistics and rate limiting

## Frontend Components

### 1. Billing Dashboard (`src/pages/BillingPage.jsx`)
Complete billing interface featuring:
- Current credit balance display
- Plan status and expiry information
- Subscription plan options with pricing
- Credit pack purchase options
- Transaction history
- Upgrade/downgrade buttons

### 2. Credit Guard Component (`src/components/CreditGuard.jsx`)
Credit protection system:
- `CreditGuard` - Wraps components requiring credits
- `CreditBalanceDisplay` - Shows current balance
- `InsufficientCreditsUI` - Handles insufficient credits
- `useCreditAwareOperation` - Hook for credit-aware operations

## Configuration

### Environment Variables
Add these to your `.env` file:
```env
# LemonSqueezy Configuration
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
LEMONSQUEEZY_STORE_ID=your_store_id
LEMONSQUEEZY_API_KEY=your_api_key

# Product IDs
LEMONSQUEEZY_STARTER_PLAN_ID=your_starter_plan_id
LEMONSQUEEZY_PRO_PLAN_ID=your_pro_plan_id
LEMONSQUEEZY_LIFETIME_PLAN_ID=your_lifetime_plan_id
LEMONSQUEEZY_CREDIT_PACK_10K_ID=your_10k_pack_id
LEMONSQUEEZY_CREDIT_PACK_25K_ID=your_25k_pack_id
LEMONSQUEEZY_CREDIT_PACK_50K_ID=your_50k_pack_id
LEMONSQUEEZY_CREDIT_PACK_100K_ID=your_100k_pack_id

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Product Configuration
Update product IDs in `src/api/lemonsqueezy.js`:
```javascript
export const LEMONSQUEEZY_CONFIG = {
  storeId: process.env.LEMONSQUEEZY_STORE_ID,
  products: {
    starter: { id: 'your_starter_id', price: 29 },
    pro: { id: 'your_pro_id', price: 49 },
    lifetime: { id: 'your_lifetime_id', price: 249 },
    // ... credit packs
  }
}
```

## Deployment Setup

### 1. Database Migration
Run the Supabase migrations:
```bash
supabase db push
```

### 2. Webhook Endpoint
Set up your webhook endpoint in LemonSqueezy:
- URL: `https://your-domain.com/api/webhook/lemonsqueezy`
- Events: `order_created`, `subscription_created`, `subscription_payment_success`, `subscription_expired`
- Secret: Use the same value as `LEMONSQUEEZY_WEBHOOK_SECRET`

### 3. Row Level Security
The migrations include RLS policies, but verify they're active:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
```

## Usage Examples

### Protecting API Endpoints
```javascript
import { creditMiddleware, deductCreditsMiddleware } from '../services/creditManager.js'

export async function findEmail(userId, domain, firstName, lastName) {
  // Check credits before operation
  await creditMiddleware(userId, 'email_find', 1)
  
  // Perform operation
  const result = await performEmailFind(domain, firstName, lastName)
  
  // Deduct credits after success
  if (result.success) {
    await deductCreditsMiddleware(userId, 'email_find', 1)
  }
  
  return result
}
```

### Using Credit Guard in Components
```jsx
import { CreditGuard } from '../components/CreditGuard.jsx'

function EmailFinder() {
  return (
    <CreditGuard operation="email_find" quantity={1}>
      <EmailFinderForm />
    </CreditGuard>
  )
}
```

### Credit-Aware Operations
```jsx
import { useCreditAwareOperation } from '../components/CreditGuard.jsx'

function BulkEmailFinder() {
  const { executeWithCredits, loading, error } = useCreditAwareOperation()
  
  const handleBulkFind = async (emails) => {
    try {
      const result = await executeWithCredits(
        'bulk_find',
        emails.length,
        () => performBulkFind(emails)
      )
      // Handle result
    } catch (err) {
      // Handle error
    }
  }
}
```

## Testing

### Webhook Testing
Use LemonSqueezy's webhook testing tool or ngrok for local testing:
```bash
ngrok http 3000
# Use the ngrok URL + /api/webhook/lemonsqueezy
```

### Credit System Testing
```javascript
// Test credit deduction
const result = await deductCredits(userId, 5, 'find')
console.log('Remaining credits:', result.remainingCredits)

// Test credit validation
const hasEnough = await checkCredits(userId, 10, 'verify')
console.log('Can proceed:', hasEnough.hasCredits)
```

## Security Considerations

1. **Webhook Signature Verification**: Always verify LemonSqueezy webhook signatures
2. **Environment Variables**: Keep all secrets in environment variables
3. **Row Level Security**: Ensure RLS policies are properly configured
4. **Input Validation**: Validate all webhook payloads
5. **Rate Limiting**: Implement rate limiting for API endpoints

## Monitoring and Analytics

### Key Metrics to Track
- Credit usage patterns
- Conversion rates from free to paid
- Subscription churn rates
- API usage vs. credit consumption
- Popular credit pack sizes

### Logging
The system logs important events:
- Webhook processing
- Credit deductions
- Failed operations
- User upgrades/downgrades

## Troubleshooting

### Common Issues

1. **Webhook Not Firing**
   - Check webhook URL configuration
   - Verify endpoint is accessible
   - Check LemonSqueezy webhook logs

2. **Credit Deduction Failures**
   - Verify user exists in database
   - Check credit balance
   - Review RLS policies

3. **Checkout Issues**
   - Verify product IDs
   - Check LemonSqueezy store configuration
   - Ensure proper redirect URLs

### Debug Mode
Enable debug logging by setting:
```env
DEBUG_LEMONSQUEEZY=true
```

## Support

For issues with this integration:
1. Check the console logs for errors
2. Verify environment variables are set
3. Test webhook endpoints manually
4. Review Supabase database logs
5. Check LemonSqueezy dashboard for webhook delivery status

---

**Note**: This integration is production-ready but should be thoroughly tested in a staging environment before deployment.