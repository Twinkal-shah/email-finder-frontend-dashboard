// Quick script to check and fix Supabase key issues
// Run this in your browser console to diagnose the problem

function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

function checkSupabaseKeys() {
  console.log('🔍 CHECKING SUPABASE KEYS...');
  console.log('=' .repeat(50));
  
  // Check .env key (if available in build)
  const envKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiY2ZzZmZzc3BoZ3ZwbmJydnZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE3Mzc1NCwiZXhwIjoyMDcwNzQ5NzU0fQ.dnXUMNFUw0amsJsLL8PHMjHRpda8w07KbwDIpo3O2vE';
  
  console.log('📋 Current key from .env and auth-bridge.html:');
  console.log('Key:', envKey.substring(0, 50) + '...');
  
  const decoded = decodeJWT(envKey);
  if (decoded) {
    console.log('\n🔓 Decoded JWT payload:');
    console.log('- Project ref:', decoded.ref);
    console.log('- Role:', decoded.role);
    console.log('- Issued at:', new Date(decoded.iat * 1000).toLocaleString());
    console.log('- Expires at:', new Date(decoded.exp * 1000).toLocaleString());
    
    if (decoded.role === 'service_role') {
      console.log('\n❌ PROBLEM FOUND!');
      console.log('You are using a SERVICE_ROLE key instead of ANON key!');
      console.log('\n🔧 TO FIX THIS:');
      console.log('1. Go to https://supabase.com/dashboard/project/' + decoded.ref + '/settings/api');
      console.log('2. Copy the "anon public" key (NOT the service_role key)');
      console.log('3. Replace the key in:');
      console.log('   - .env file: VITE_SUPABASE_ANON_KEY=your_new_anon_key');
      console.log('   - public/auth-bridge.html: SUPABASE_ANON_KEY = "your_new_anon_key"');
      console.log('4. Restart your development server');
      console.log('5. Re-upload auth-bridge.html to mailsfinder.com');
    } else if (decoded.role === 'anon') {
      console.log('\n✅ Key type is correct (anon)');
      console.log('The authentication issue might be elsewhere.');
    } else {
      console.log('\n⚠️ Unknown role:', decoded.role);
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('🔗 Supabase Dashboard: https://supabase.com/dashboard');
  console.log('📖 API Settings: https://supabase.com/dashboard/project/' + (decoded?.ref || 'YOUR_PROJECT') + '/settings/api');
}

// Auto-run the check
checkSupabaseKeys();

// Also provide a function to test current Supabase connection
function testSupabaseConnection() {
  if (typeof supabase !== 'undefined') {
    console.log('\n🧪 TESTING SUPABASE CONNECTION...');
    supabase.auth.getSession().then(result => {
      if (result.data.session) {
        console.log('✅ Session found:', result.data.session.user.email);
      } else {
        console.log('❌ No session found');
        if (result.error) {
          console.log('Error:', result.error.message);
        }
      }
    }).catch(error => {
      console.log('❌ Connection failed:', error.message);
    });
  } else {
    console.log('❌ Supabase client not found. Make sure you\'re on a page with Supabase loaded.');
  }
}

// Export functions for manual use
window.checkSupabaseKeys = checkSupabaseKeys;
window.testSupabaseConnection = testSupabaseConnection;
window.decodeJWT = decodeJWT;

console.log('\n🛠️ Available functions:');
console.log('- checkSupabaseKeys() - Check your current keys');
console.log('- testSupabaseConnection() - Test Supabase connection');
console.log('- decodeJWT(token) - Decode any JWT token');