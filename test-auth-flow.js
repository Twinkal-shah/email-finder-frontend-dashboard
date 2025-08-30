// Test script to simulate cross-domain authentication flow
// Run this in the browser console to test authentication

// Simulate setting an auth cookie (like what would happen on mailsfinder.com)
function simulateLogin() {
  console.log('🔐 Simulating login from mailsfinder.com...');
  
  // Create a mock session object
  const mockSession = {
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.Lmg_bUVrGU7Oe8HrnETL4WbhYl6Q8H8J8H8J8H8J8H8',
    refresh_token: 'mock-refresh-token-12345',
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    user: {
      id: '12345678-1234-1234-1234-123456789012',
      email: 'test@example.com',
      aud: 'authenticated',
      role: 'authenticated'
    }
  };
  
  // Encode the session
  const encodedSession = btoa(JSON.stringify(mockSession));
  
  // Set the cookie (this simulates what would happen on mailsfinder.com)
  const domain = window.location.hostname === 'localhost' ? '' : '; domain=.mailsfinder.com';
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  
  document.cookie = `supabase-auth-token=${encodedSession}; path=/${domain}${secure}; samesite=lax; max-age=3600`;
  
  console.log('✅ Mock auth cookie set:', document.cookie);
  console.log('📝 Cookie value:', encodedSession);
  
  return mockSession;
}

// Test cookie reading
function testCookieReading() {
  console.log('🍪 Testing cookie reading...');
  console.log('Current domain:', window.location.hostname);
  console.log('All cookies:', document.cookie);
  
  // Try to read the auth cookie
  const cookies = document.cookie.split(';');
  const authCookie = cookies.find(cookie => cookie.trim().startsWith('supabase-auth-token='));
  
  if (authCookie) {
    const cookieValue = authCookie.split('=')[1];
    console.log('✅ Found auth cookie:', cookieValue);
    
    try {
      const decoded = JSON.parse(atob(cookieValue));
      console.log('📋 Decoded session:', decoded);
      return decoded;
    } catch (error) {
      console.error('❌ Failed to decode cookie:', error);
    }
  } else {
    console.log('❌ No auth cookie found');
  }
  
  return null;
}

// Test the cookieAuth service
function testCookieAuthService() {
  console.log('🔧 Testing cookieAuth service...');
  
  if (typeof cookieAuth !== 'undefined') {
    console.log('✅ cookieAuth service available');
    
    // Test isAuthenticated
    cookieAuth.isAuthenticated().then(result => {
      console.log('🔐 isAuthenticated result:', result);
    }).catch(error => {
      console.error('❌ isAuthenticated error:', error);
    });
    
    // Test getCurrentUser
    cookieAuth.getCurrentUser().then(user => {
      console.log('👤 getCurrentUser result:', user);
    }).catch(error => {
      console.error('❌ getCurrentUser error:', error);
    });
    
    // Test getAuthCookie
    const cookie = cookieAuth.getAuthCookie();
    console.log('🍪 getAuthCookie result:', cookie);
  } else {
    console.log('❌ cookieAuth service not available');
  }
}

// Clear all auth data
function clearAuth() {
  console.log('🗑️ Clearing all auth data...');
  
  // Clear cookies
  const domain = window.location.hostname === 'localhost' ? '' : '; domain=.mailsfinder.com';
  document.cookie = `supabase-auth-token=; path=/${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  
  // Clear localStorage
  localStorage.clear();
  
  console.log('✅ Auth data cleared');
}

// Run full test sequence
function runFullTest() {
  console.log('🚀 Starting full authentication test...');
  console.log('=' .repeat(50));
  
  // Step 1: Clear existing auth
  clearAuth();
  
  // Step 2: Simulate login
  setTimeout(() => {
    const session = simulateLogin();
    
    // Step 3: Test cookie reading
    setTimeout(() => {
      testCookieReading();
      
      // Step 4: Test cookieAuth service
      setTimeout(() => {
        testCookieAuthService();
        
        console.log('=' .repeat(50));
        console.log('🏁 Test completed. Check the results above.');
      }, 1000);
    }, 500);
  }, 500);
}

// Export functions for manual testing
window.authTest = {
  simulateLogin,
  testCookieReading,
  testCookieAuthService,
  clearAuth,
  runFullTest
};

console.log('🔧 Auth test utilities loaded. Use window.authTest.runFullTest() to start testing.');
console.log('Available functions:', Object.keys(window.authTest));