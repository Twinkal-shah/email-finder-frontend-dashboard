# Credit Troubleshooting Guide

## Problem: "Insufficient credits for email finding. Please upgrade your plan."

This error occurs when your account doesn't have enough email finding credits to perform the search operation.

## Possible Causes

### 1. **No User Profile Created**
- Your account exists in authentication but no profile was created in the database
- This happens when the profile creation trigger didn't run properly

### 2. **Zero Credits Balance**
- Your profile exists but credits have been depleted
- Free accounts start with 25 finding credits and 25 verification credits

### 3. **Authentication Issues**
- You're not properly logged in
- Session has expired

## Diagnostic Steps

### Step 1: Check Your Login Status
1. Look at the top-right corner of the application
2. Verify you see your name/email (not "Sign In" button)
3. If not logged in, click "Go to Login" and authenticate

### Step 2: Check Your Credit Balance
1. Navigate to the **Billing** page (`/billing`)
2. Look at the "Credit Balance" section
3. Check both "Email Finding Credits" and "Email Verification Credits"

### Step 3: Verify Your Profile
1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for any authentication or profile errors

## Solutions

### Solution 1: Create Missing Profile
If you don't have a profile:

1. **Log out completely** from the application
2. **Clear browser cache and cookies** for the site
3. **Log back in** - this should trigger profile creation
4. Check the Billing page to see if credits appear

### Solution 2: Add Service Role Key (For Developers)
If you need to manually fix profiles:

1. Get your Supabase service role key from the Supabase dashboard
2. Add it to your `.env` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
3. Run the profile fix script:
   ```bash
   node fix-missing-profile.js
   ```

### Solution 3: Manual Profile Creation (Supabase Dashboard)
If automatic creation fails:

1. Go to your **Supabase Dashboard**
2. Navigate to **Table Editor** → **profiles**
3. Click **Insert** → **Insert row**
4. Fill in:
   - `id`: Your user ID from `auth.users` table
   - `email`: Your email address
   - `full_name`: Your display name
   - `plan`: `free`
   - `credits_find`: `25`
   - `credits_verify`: `25`
   - `plan_expiry`: Set to 7 days from now
5. Click **Save**

### Solution 4: Purchase More Credits
If you have a profile but no credits:

1. Go to the **Billing** page
2. Choose from:
   - **Starter Plan**: $29/month with 50,000 credits each
   - **Pro Plan**: $49/month with 150,000 credits each
   - **Credit Packs**: One-time purchases (10k, 25k, 50k, 100k)

## Free Plan Limits

- **Email Finding Credits**: 25 per month
- **Email Verification Credits**: 25 per month
- **Daily Limit**: 100 operations

## Verification Steps

After applying any solution:

1. **Refresh the application**
2. **Check the Billing page** for updated credit balance
3. **Try a test email search**
4. **Verify credits deduct properly** after successful searches

## Still Having Issues?

### Check Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for errors related to:
   - Authentication
   - Profile loading
   - Credit checking

### Common Error Messages
- `User not authenticated` → Log in again
- `Profile not found` → Create profile (Solution 1 or 3)
- `Insufficient credits` → Add credits (Solution 4)

### Contact Support
If none of these solutions work:
1. Note your exact error message
2. Check what plan shows on your Billing page
3. Verify your email address
4. Contact support with these details

## Prevention

- **Regular Monitoring**: Check your credit balance regularly
- **Plan Upgrades**: Consider upgrading if you use more than 25 searches/month
- **Credit Packs**: Buy additional credits for temporary high usage
- **Account Maintenance**: Don't clear browser data frequently to avoid session issues