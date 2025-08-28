# Localhost Authentication Setup Guide

This guide will help you enable authentication on localhost for development, so you don't need to deploy every time you want to test login functionality.

## Problem

Currently, authentication only works on the production domains (`mailsfinder.com` and `app.mailsfinder.com`) because Supabase redirect URLs are not configured for localhost development.

## Solution

You need to add localhost URLs to your Supabase project's allowed redirect URLs.

## Step-by-Step Instructions

### 1. Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`wbcfsffssphgvpnbrvve`)
3. Navigate to **Authentication** → **URL Configuration**

### 2. Add Localhost Redirect URLs

In the "Redirect URLs" section, add the following URLs:

```
http://localhost:5173/**
http://localhost:3000/**
http://127.0.0.1:5173/**
http://127.0.0.1:3000/**
```

**Why these URLs?**
- `localhost:5173` - Default Vite development server port
- `localhost:3000` - Common alternative development port
- `127.0.0.1` - Alternative localhost IP address
- `/**` - Wildcard to match any path after the domain

### 3. Update Site URL (Optional)

If you want localhost to be the default redirect:
1. In the same URL Configuration page
2. Temporarily change the **Site URL** to: `http://localhost:5173`
3. Remember to change it back to your production URL when deploying

### 4. Test the Setup

1. Save the changes in Supabase Dashboard
2. Start your development server: `npm run dev`
3. Open `http://localhost:5173` in your browser
4. Try to log in - it should now work!

## Alternative: Environment-Specific Configuration

For a more robust setup, you can create separate Supabase projects for development and production:

### Option A: Development Project
1. Create a new Supabase project for development
2. Set up the same database schema
3. Configure localhost URLs as the primary URLs
4. Use different environment variables for dev vs production

### Option B: Dynamic Redirect URLs
Modify your authentication code to use dynamic redirect URLs:

```javascript
// In your auth service
const getRedirectURL = () => {
  if (import.meta.env.DEV) {
    return 'http://localhost:5173'
  }
  return 'https://app.mailsfinder.com'
}

// Use in auth calls
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: getRedirectURL()
  }
})
```

## Troubleshooting

### Issue: Still getting redirect errors
**Solution:** 
- Clear browser cache and cookies
- Make sure you saved the changes in Supabase Dashboard
- Wait a few minutes for changes to propagate

### Issue: Authentication works but user data is missing
**Solution:**
- Check that your `profiles` table exists and has proper RLS policies
- Verify that the user profile creation trigger is working
- Run the profile fix script if needed

### Issue: CORS errors
**Solution:**
- Ensure your Supabase project allows requests from localhost
- Check that your API keys are correct in the `.env` file

## Security Notes

- Only add localhost URLs to development/staging projects
- Remove localhost URLs from production Supabase projects
- Never commit localhost URLs to production configuration
- Consider using separate Supabase projects for different environments

## Quick Test Script

Run this in your browser console on localhost to test authentication:

```javascript
// Test Supabase connection
supabase.auth.getSession().then(result => {
  console.log('Session:', result.data.session ? 'Found' : 'Not found');
  if (result.data.session) {
    console.log('User:', result.data.session.user.email);
  }
});
```

After following these steps, you should be able to develop and test authentication locally without needing to deploy every change!