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

### 2. Modify the auth-bridge.html for your authentication system

The current `auth-bridge.html` file contains example code that checks for authentication in localStorage. You need to modify it to work with your actual authentication system on `mailsfinder.com`.

Replace these lines in the auth-bridge.html:
```javascript
// Example: Check for authentication cookies or localStorage
const authToken = localStorage.getItem('auth_token');
const userEmail = localStorage.getItem('user_email');
const userName = localStorage.getItem('user_name');
```

With your actual authentication check logic, for example:
```javascript
// Check your actual authentication system
const authToken = getCookieValue('auth_token'); // or however you store auth tokens
const userEmail = getCurrentUserEmail(); // your function to get user email
const userName = getCurrentUserName(); // your function to get user name
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

1. **Check browser console**: Look for messages about cross-domain communication
2. **Verify domains**: Make sure the auth bridge is hosted on the exact domain `mailsfinder.com`
3. **Check authentication logic**: Ensure the auth bridge correctly detects when users are logged in
4. **Test in incognito**: Try the flow in an incognito window to ensure it works for new sessions