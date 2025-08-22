# Debugging Cross-Domain Authentication Issue

## Problem
User is logged in on mailsfinder.com, but when navigating to app.mailsfinder.com:
1. Shows "Authenticating..." for 1-2 seconds
2. Then shows "Authentication Required" message
3. This indicates cross-domain authentication is failing

## Immediate Debugging Steps

### Step 1: Verify Auth Bridge is Uploaded
1. **Check if auth-bridge.html is accessible**:
   - Go to: `https://mailsfinder.com/auth-bridge.html`
   - Should load without errors (page might be blank, that's normal)
   - If you get 404 error, the file is not uploaded

### Step 2: Check Browser Console on app.mailsfinder.com
1. **Open Developer Tools** (F12) on app.mailsfinder.com
2. **Go to Console tab**
3. **Look for these messages**:
   - ✅ "Requesting auth data from parent window"
   - ❌ Any CORS errors
   - ❌ "Failed to load auth-bridge.html"
   - ❌ Network errors to mailsfinder.com

### Step 3: Test Auth Bridge Directly
1. **Go to** `https://mailsfinder.com/auth-bridge.html`
2. **Open Developer Tools** (F12)
3. **In Console, run**:
   ```javascript
   // Test if Supabase is loaded
   console.log('Supabase loaded:', typeof supabase !== 'undefined');
   
   // Test current session
   if (typeof supabase !== 'undefined') {
     supabase.auth.getSession().then(result => {
       console.log('Session result:', result);
       if (result.data.session) {
         console.log('✅ User is logged in:', result.data.session.user.email);
       } else {
         console.log('❌ No session found');
       }
     });
   }
   
   // Test auth bridge function
   if (typeof getCurrentAuthenticatedUser !== 'undefined') {
     getCurrentAuthenticatedUser().then(result => {
       console.log('Auth bridge result:', result);
     });
   } else {
     console.log('❌ getCurrentAuthenticatedUser function not found');
   }
   ```

### Step 4: Check Network Tab
1. **On app.mailsfinder.com**, open Developer Tools
2. **Go to Network tab**
3. **Reload the page**
4. **Look for**:
   - Requests to `mailsfinder.com/auth-bridge.html`
   - Any failed requests (red entries)
   - CORS errors

## Most Likely Issues

### ⚠️ CRITICAL ISSUE FOUND: Wrong Supabase Key Type
**Problem**: Both your `.env` file and `auth-bridge.html` are using a **service_role** key instead of the **anon** key!

**Evidence**: The JWT token shows `"role": "service_role"` which should be `"role": "anon"`

**Why this breaks authentication**:
- Service role keys are for server-side admin operations
- Anon keys are for client-side authentication
- Using service role on client-side causes authentication failures

**IMMEDIATE FIX REQUIRED**:
1. Go to your Supabase Dashboard → Settings → API
2. Copy the **anon/public** key (NOT the service_role key)
3. Replace the key in both:
   - `.env` file: `VITE_SUPABASE_ANON_KEY=your_anon_key_here`
   - `public/auth-bridge.html`: `SUPABASE_ANON_KEY = 'your_anon_key_here'`

### Issue 1: Auth Bridge Not Uploaded ⚠️
**Symptoms**: 404 error when accessing `mailsfinder.com/auth-bridge.html`
**Solution**: Upload the `public/auth-bridge.html` file to your mailsfinder.com hosting

### Issue 2: CORS Issues 🚫
**Symptoms**: Console shows CORS errors
**Solution**: Ensure mailsfinder.com allows iframe embedding and cross-origin requests

### Issue 3: User Not Actually Logged In 👤
**Symptoms**: Auth bridge works but returns no user data
**Solution**: Verify user is actually logged in on mailsfinder.com by checking Supabase session

## Quick Fix Commands

### Test on mailsfinder.com (in browser console):
```javascript
// Check if user is logged in
supabase.auth.getSession().then(result => {
  if (result.data.session) {
    console.log('✅ Logged in as:', result.data.session.user.email);
  } else {
    console.log('❌ Not logged in');
  }
});
```

### Test on app.mailsfinder.com (in browser console):
```javascript
// Manually test cross-domain communication
const iframe = document.createElement('iframe');
iframe.src = 'https://mailsfinder.com/auth-bridge.html';
iframe.style.display = 'none';
document.body.appendChild(iframe);

window.addEventListener('message', (event) => {
  if (event.origin.includes('mailsfinder.com')) {
    console.log('📨 Received:', event.data);
  }
});

iframe.onload = () => {
  iframe.contentWindow.postMessage({ type: 'REQUEST_AUTH_DATA' }, 'https://mailsfinder.com');
};
```

## Next Steps
1. **Run the debugging steps above**
2. **Share the console output** from both domains
3. **Confirm if auth-bridge.html is accessible** at mailsfinder.com/auth-bridge.html
4. **Check if user is actually logged in** on mailsfinder.com using Supabase

This will help identify the exact cause of the authentication failure.