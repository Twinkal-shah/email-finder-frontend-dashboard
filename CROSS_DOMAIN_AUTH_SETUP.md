# Cross-Domain Authentication Setup

This document explains how to set up cross-domain authentication between `mailsfinder.com` and `app.mailsfinder.com`.

## Problem

When users are logged in on `mailsfinder.com` and visit `app.mailsfinder.com` directly (without authentication tokens in the URL), the app doesn't know about their authentication state and shows a login prompt.

## Solution

We've implemented a cross-domain messaging system that allows `app.mailsfinder.com` to request authentication data from `mailsfinder.com`.

## Setup Instructions

### 1. Host the Authentication Bridge on mailsfinder.com

Copy the `public/auth-bridge.html` file to your `mailsfinder.com` server and make it accessible at:
```
https://mailsfinder.com/auth-bridge.html
```

**Important**: The auth-bridge.html file is already configured with your Supabase credentials:
- Supabase URL: `https://your-project.supabase.co`
- Anonymous Key: Your project's anonymous key
- Make sure these match your production Supabase project settings

### 2. Modify the auth-bridge.html for your authentication system

The provided `auth-bridge.html` is already configured to work with Supabase authentication. It includes:

- **Supabase Client**: Configured with your project URL and anonymous key
- **Session Management**: Automatically retrieves the current user session from Supabase
- **User Data Fetching**: Gets additional user profile data from the `profiles` table

```javascript
// Supabase integration (already implemented)
async function getCurrentAuthenticatedUser() {
  try {
    // Get current session from Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return null
    }
    
    // Get additional user data from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    
    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: profile?.name || session.user.user_metadata?.name || session.user.email,
        ...profile
      },
      tokens: {
        access_token: session.access_token,
        refresh_token: session.refresh_token
      }
    }
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}
```

### 3. Include the auth bridge in your main mailsfinder.com pages

Add this iframe to your main pages on `mailsfinder.com` (hidden):
```html
<iframe src="/auth-bridge.html" style="display: none;" id="auth-bridge"></iframe>
```

Or include the auth-bridge script directly in your main pages.

### 4. Test the integration

1. Log in to `mailsfinder.com`
2. Visit `app.mailsfinder.com` directly (not through a redirect with tokens)
3. The app should automatically detect your authentication state and log you in

## How it works

1. When `app.mailsfinder.com` loads and doesn't find authentication tokens in the URL or localStorage, it sets up a cross-domain message listener
2. The app sends a `REQUEST_AUTH_DATA` message to `mailsfinder.com`
3. The auth bridge on `mailsfinder.com` receives this request and checks the user's authentication state
4. If the user is authenticated, it sends back a `USER_AUTH` message with user data and tokens
5. `app.mailsfinder.com` receives this data and automatically logs the user in
6. If no response is received within 3 seconds, the app shows the login prompt

## Security Considerations

- The auth bridge only responds to requests from `app.mailsfinder.com` and `localhost:5173` (for development)
- Only authentication data is shared, not sensitive user information
- The communication uses the browser's postMessage API which is secure for cross-domain communication

## Troubleshooting

### 1. Check Browser Console
- Open browser developer tools on both domains
- Look for CORS errors or message passing failures
- Verify that messages are being sent and received
- Check for Supabase authentication errors

### 2. Verify Domain Configuration
- Ensure auth-bridge.html is accessible at the correct URL
- Check that iframe can load the auth-bridge page
- Verify domain origins in the JavaScript code match your setup
- Confirm Supabase URL and anonymous key are correct

### 3. Test Authentication Flow
- Log in on mailsfinder.com using Supabase authentication
- Navigate to app.mailsfinder.com
- Check if user session exists in Supabase
- Verify user profile data is available in the `profiles` table
- Ensure tokens are valid and not expired

### 4. Supabase-Specific Debugging
- Check Supabase dashboard for active sessions
- Verify Row Level Security (RLS) policies on `profiles` table
- Ensure the anonymous key has proper permissions
- Test Supabase connection directly in browser console:
  ```javascript
  // Test in browser console on mailsfinder.com
  supabase.auth.getSession().then(console.log)
  ```