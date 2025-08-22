# Testing Cross-Domain Authentication

This guide will help you verify that the cross-domain authentication between `mailsfinder.com` and `app.mailsfinder.com` is working correctly.

## Prerequisites

1. ✅ DNS is configured (`app.mailsfinder.com` points to your Vercel deployment)
2. ✅ `auth-bridge.html` is uploaded to `mailsfinder.com`
3. ✅ User authentication is working on `mailsfinder.com`
4. ✅ Dashboard is deployed and accessible at `app.mailsfinder.com`

## Step-by-Step Testing

### 1. Test Without Authentication (Expected: Login Required)

1. **Clear browser data** (or use incognito mode)
2. **Navigate directly to** `https://app.mailsfinder.com`
3. **Expected Result**: You should see a login form or authentication prompt
4. **What this tests**: Ensures the dashboard properly detects when no authentication is available

### 2. Test Cross-Domain Authentication (Expected: Automatic Login)

1. **Clear browser data** (or use incognito mode)
2. **Go to** `https://mailsfinder.com`
3. **Log in** using your normal authentication process
4. **Verify login** - you should see your logged-in state on mailsfinder.com
5. **Navigate to** `https://app.mailsfinder.com` (or click a link that takes you there)
6. **Expected Result**: 
   - Dashboard should load automatically
   - You should see your name/email displayed
   - No login prompt should appear
   - Loading should be brief (2-3 seconds max)

### 3. Browser Console Testing

#### On `mailsfinder.com`:
1. **Open Developer Tools** (F12)
2. **Go to Console tab**
3. **Test Supabase connection**:
   ```javascript
   // Test if Supabase is working
   supabase.auth.getSession().then(result => {
     console.log('Session:', result.data.session ? 'Found' : 'Not found');
     if (result.data.session) {
       console.log('User:', result.data.session.user.email);
     }
   });
   ```
4. **Expected Result**: Should show session found and user email

#### On `app.mailsfinder.com`:
1. **Open Developer Tools** (F12)
2. **Go to Console tab**
3. **Look for messages** like:
   - `"Requesting auth data from parent window"`
   - `"Received cross-domain auth data"`
   - `"User authenticated via cross-domain"`
4. **Check for errors** - there should be no authentication-related errors

### 4. Network Tab Testing

1. **Open Developer Tools** on `app.mailsfinder.com`
2. **Go to Network tab**
3. **Reload the page**
4. **Look for**:
   - Requests to `mailsfinder.com/auth-bridge.html` (should succeed)
   - Supabase API calls (should return 200 status)
   - No failed authentication requests

### 5. Test Auth Bridge Directly

1. **Navigate to** `https://mailsfinder.com/auth-bridge.html`
2. **Expected Result**: 
   - Page should load (might be blank, that's normal)
   - No JavaScript errors in console
   - If logged in, you can test in console:
     ```javascript
     getCurrentAuthenticatedUser().then(console.log);
     ```
   - Should return user object with email, name, and tokens

## Common Issues and Solutions

### ❌ Dashboard shows login form even when logged in on mailsfinder.com

**Possible causes:**
- Auth bridge not accessible at `mailsfinder.com/auth-bridge.html`
- CORS issues between domains
- Supabase credentials mismatch
- User not actually logged in on mailsfinder.com

**Debug steps:**
1. Check browser console for errors
2. Verify auth-bridge.html is accessible
3. Test Supabase session on mailsfinder.com
4. Check network requests for failed calls

### ❌ Long loading time on dashboard

**Possible causes:**
- Cross-domain timeout (waiting for response)
- Slow network requests
- Auth bridge not responding

**Debug steps:**
1. Check console for timeout messages
2. Verify auth bridge loads quickly
3. Test network speed between domains

### ❌ User data missing or incorrect

**Possible causes:**
- Profile data not in Supabase `profiles` table
- RLS policies blocking data access
- Token permissions insufficient

**Debug steps:**
1. Check Supabase dashboard for user data
2. Verify profiles table has user record
3. Test RLS policies
4. Check anonymous key permissions

## Success Indicators

✅ **Working correctly when:**
- User logs in on mailsfinder.com
- Navigates to app.mailsfinder.com
- Dashboard loads within 2-3 seconds
- User's name/email appears immediately
- No login prompts or errors
- Browser console shows successful cross-domain messages

## Performance Expectations

- **Initial load**: 2-3 seconds for cross-domain auth
- **Subsequent visits**: Instant (cached session)
- **Network requests**: Minimal (just auth verification)
- **User experience**: Seamless transition between domains

## Security Verification

1. **Test with different users** - ensure data isolation
2. **Test logout** - verify session cleanup
3. **Test expired tokens** - should redirect to login
4. **Test in different browsers** - ensure consistency

If all tests pass, your cross-domain authentication is working correctly! 🎉