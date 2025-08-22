// Cross-Domain Authentication Debug Script
// Run this in browser console to test authentication flow

// 1. Test on mailsfinder.com - Run this to check if user is logged in
function testMailsfinderAuth() {
  console.log('🔍 Testing authentication on mailsfinder.com...');
  
  if (typeof supabase === 'undefined') {
    console.error('❌ Supabase not loaded on this domain');
    return;
  }
  
  supabase.auth.getSession().then(result => {
    if (result.error) {
      console.error('❌ Error getting session:', result.error);
      return;
    }
    
    if (result.data.session) {
      console.log('✅ User is logged in!');
      console.log('📧 Email:', result.data.session.user.email);
      console.log('🔑 Access Token:', result.data.session.access_token ? 'Present' : 'Missing');
      
      // Test profile data
      supabase
        .from('profiles')
        .select('*')
        .eq('id', result.data.session.user.id)
        .single()
        .then(profileResult => {
          if (profileResult.data) {
            console.log('👤 Profile data:', profileResult.data);
          } else {
            console.warn('⚠️ No profile data found');
          }
        });
    } else {
      console.log('❌ No active session found');
    }
  });
}

// 2. Test auth bridge directly
function testAuthBridge() {
  console.log('🔍 Testing auth bridge...');
  
  if (typeof getCurrentAuthenticatedUser === 'undefined') {
    console.error('❌ Auth bridge functions not available');
    return;
  }
  
  getCurrentAuthenticatedUser().then(result => {
    if (result) {
      console.log('✅ Auth bridge working!');
      console.log('👤 User data:', result.user);
      console.log('🔑 Tokens:', result.tokens ? 'Present' : 'Missing');
    } else {
      console.log('❌ Auth bridge returned no data');
    }
  }).catch(error => {
    console.error('❌ Auth bridge error:', error);
  });
}

// 3. Test cross-domain communication (run on app.mailsfinder.com)
function testCrossDomainComm() {
  console.log('🔍 Testing cross-domain communication...');
  
  // Create a test iframe to simulate the auth bridge
  const iframe = document.createElement('iframe');
  iframe.src = 'https://mailsfinder.com/auth-bridge.html';
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  // Listen for response
  const messageHandler = (event) => {
    if (event.origin === 'https://mailsfinder.com' || event.origin === 'http://mailsfinder.com') {
      console.log('📨 Received message from auth bridge:', event.data);
      
      if (event.data.type === 'USER_AUTH') {
        if (event.data.user) {
          console.log('✅ Cross-domain auth successful!');
          console.log('👤 User:', event.data.user.email);
        } else {
          console.log('❌ No authentication data received');
        }
      }
      
      // Clean up
      window.removeEventListener('message', messageHandler);
      document.body.removeChild(iframe);
    }
  };
  
  window.addEventListener('message', messageHandler);
  
  // Send request after iframe loads
  iframe.onload = () => {
    console.log('📤 Sending auth request to bridge...');
    iframe.contentWindow.postMessage({ type: 'REQUEST_AUTH_DATA' }, 'https://mailsfinder.com');
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        console.log('⏰ Cross-domain test timed out');
        window.removeEventListener('message', messageHandler);
        document.body.removeChild(iframe);
      }
    }, 5000);
  };
}

// 4. Complete diagnostic
function runCompleteDiagnostic() {
  console.log('🚀 Running complete authentication diagnostic...');
  console.log('📍 Current domain:', window.location.hostname);
  console.log('🔗 Current URL:', window.location.href);
  
  // Check which domain we're on
  if (window.location.hostname.includes('mailsfinder.com')) {
    if (window.location.pathname.includes('auth-bridge.html')) {
      console.log('📍 On auth bridge page');
      testAuthBridge();
    } else {
      console.log('📍 On mailsfinder.com main site');
      testMailsfinderAuth();
    }
  } else if (window.location.hostname.includes('app.mailsfinder.com') || window.location.hostname.includes('localhost')) {
    console.log('📍 On dashboard domain');
    testCrossDomainComm();
  } else {
    console.log('❓ Unknown domain - manual testing required');
  }
}

// Auto-run diagnostic
console.log('🔧 Cross-Domain Auth Debug Script Loaded');
console.log('📋 Available functions:');
console.log('  - runCompleteDiagnostic() - Run full test');
console.log('  - testMailsfinderAuth() - Test auth on mailsfinder.com');
console.log('  - testAuthBridge() - Test auth bridge directly');
console.log('  - testCrossDomainComm() - Test cross-domain communication');
console.log('');
console.log('🚀 Running automatic diagnostic...');
runCompleteDiagnostic();