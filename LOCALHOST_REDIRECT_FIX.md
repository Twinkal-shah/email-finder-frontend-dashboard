# Localhost Redirect Fix

## Problem Solved

When clicking "Sign In" from `localhost:5173`, users were being redirected to `app.mailsfinder.com` instead of back to `localhost:5173` after authentication.

## Root Cause

The login link in the dashboard was hardcoded to redirect to `mailsfinder.com/login.html` without specifying where to return after authentication. By default, mailsfinder.com was redirecting users back to the production domain (`app.mailsfinder.com`).

## Solution Implemented

### 1. Dynamic Return URL

Modified the login link in `src/App.jsx` to include a `return_url` parameter:

```javascript
// Before (hardcoded)
href="https://www.mailsfinder.com/login.html"

// After (dynamic)
href={`https://www.mailsfinder.com/login.html?return_url=${encodeURIComponent(window.location.origin)}`}
```

### 2. How It Works

1. **Development**: When running on `localhost:5173`, the return URL becomes:
   ```
   https://www.mailsfinder.com/login.html?return_url=http%3A//localhost%3A5173
   ```

2. **Production**: When running on `app.mailsfinder.com`, the return URL becomes:
   ```
   https://www.mailsfinder.com/login.html?return_url=https%3A//app.mailsfinder.com
   ```

3. **mailsfinder.com** can now read the `return_url` parameter and redirect users back to the correct domain after authentication.

## Required Configuration on mailsfinder.com

**IMPORTANT**: For this fix to work completely, you need to update the authentication flow on `mailsfinder.com` to respect the `return_url` parameter.

### Option 1: Modify Login Page JavaScript

Add this JavaScript to your `mailsfinder.com/login.html` page:

```javascript
// Get return URL from query parameters
function getReturnUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const returnUrl = urlParams.get('return_url');
  
  // Validate return URL for security
  const allowedDomains = [
    'http://localhost:5173',
    'http://localhost:3000', 
    'https://app.mailsfinder.com'
  ];
  
  if (returnUrl && allowedDomains.some(domain => returnUrl.startsWith(domain))) {
    return returnUrl;
  }
  
  // Default to production domain
  return 'https://app.mailsfinder.com';
}

// After successful authentication, redirect to return URL
function redirectAfterAuth(user, tokens) {
  const returnUrl = getReturnUrl();
  const redirectUrl = `${returnUrl}?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}&user_id=${user.id}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name)}`;
  
  window.location.href = redirectUrl;
}
```

### Option 2: Update Supabase Auth Configuration

If using Supabase OAuth, update the redirect configuration:

```javascript
// In your Supabase auth call on mailsfinder.com
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google', // or your OAuth provider
  options: {
    redirectTo: getReturnUrl() // Use the return URL from query params
  }
});
```

## Testing the Fix

### 1. Test Localhost Development

1. Start your development server: `npm run dev`
2. Open `http://localhost:5173`
3. Click "Go to Login"
4. Complete authentication on mailsfinder.com
5. **Expected**: You should be redirected back to `localhost:5173`

### 2. Test Production

1. Deploy to production (`app.mailsfinder.com`)
2. Visit the production site
3. Click "Go to Login"
4. Complete authentication
5. **Expected**: You should be redirected back to `app.mailsfinder.com`

## Security Considerations

### Validate Return URLs

Always validate return URLs to prevent open redirect vulnerabilities:

```javascript
const ALLOWED_RETURN_DOMAINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://app.mailsfinder.com'
];

function isValidReturnUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_RETURN_DOMAINS.some(domain => {
      const allowedUrl = new URL(domain);
      return parsedUrl.origin === allowedUrl.origin;
    });
  } catch {
    return false;
  }
}
```

## Alternative Solutions

### Environment-Based Configuration

For a more robust setup, you could also:

1. **Use different Supabase projects** for development and production
2. **Configure environment-specific redirect URLs** in your build process
3. **Use a development-specific login page** on mailsfinder.com

## Next Steps

1. ✅ **Dashboard updated** - Login link now includes return URL
2. ⏳ **Update mailsfinder.com** - Implement return URL handling in your authentication flow
3. ⏳ **Test the complete flow** - Verify localhost → mailsfinder.com → localhost works
4. ⏳ **Add to Supabase redirect URLs** - Ensure `localhost:5173` is in your Supabase allowed URLs

## Troubleshooting

### Still redirecting to app.mailsfinder.com?

1. **Check browser console** for the actual login URL being generated
2. **Verify mailsfinder.com** is reading the `return_url` parameter
3. **Clear browser cache** and cookies
4. **Check Supabase redirect URLs** include localhost

### Return URL not working?

1. **Validate the URL encoding** - ensure special characters are properly encoded
2. **Check domain validation** - make sure localhost is in the allowed domains list
3. **Test with different browsers** - some browsers handle localhost differently

This fix ensures that your development workflow is seamless - you can now test authentication locally without being redirected to the production domain!