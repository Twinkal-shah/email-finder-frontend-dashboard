// Debug Authentication State Script
// Run this in browser console to check current auth state

console.log('🔧 Authentication State Debug Script Starting...');

// Function to check current authentication state
function checkAuthState() {
  console.log('\n🔍 Current Authentication State:');
  
  // Check localStorage
  const storedUser = localStorage.getItem('auth_user');
  const storedTokens = localStorage.getItem('auth_tokens');
  
  console.log('📦 LocalStorage Data:');
  if (storedUser) {
    const user = JSON.parse(storedUser);
    console.log('  👤 User:', user);
    console.log('  🆔 User ID:', user.id);
    console.log('  📧 Email:', user.email);
    console.log('  👤 Name:', user.name);
  } else {
    console.log('  ❌ No stored user data');
  }
  
  if (storedTokens) {
    const tokens = JSON.parse(storedTokens);
    console.log('  🔑 Tokens:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresAt: tokens.expires_at
    });
  } else {
    console.log('  ❌ No stored tokens');
  }
  
  // Check React context if available
  if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
    console.log('\n⚛️ React Context Check:');
    console.log('  React internals available - checking for auth context...');
  }
  
  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  console.log('\n🌐 URL Parameters:');
  console.log('  access_token:', urlParams.get('access_token') ? 'Present' : 'Not found');
  console.log('  user_id:', urlParams.get('user_id') || 'Not found');
  console.log('  email:', urlParams.get('email') || 'Not found');
  console.log('  name:', urlParams.get('name') || 'Not found');
}

// Function to test getUserProfile directly
async function testGetUserProfile() {
  console.log('\n🧪 Testing getUserProfile function...');
  
  const storedUser = localStorage.getItem('auth_user');
  if (!storedUser) {
    console.log('❌ No stored user - cannot test getUserProfile');
    return;
  }
  
  const user = JSON.parse(storedUser);
  if (!user.id) {
    console.log('❌ No user ID found - cannot test getUserProfile');
    return;
  }
  
  try {
    // Import getUserProfile function
    const { getUserProfile } = await import('./src/api/user.js');
    console.log('✅ getUserProfile function imported successfully');
    
    console.log(`🚀 Calling getUserProfile with ID: ${user.id}`);
    const profile = await getUserProfile(user.id);
    console.log('✅ Profile fetched successfully:', profile);
    
    console.log('💰 Credit Information:');
    console.log(`  Find Credits: ${profile.credits_find || 0}`);
    console.log(`  Verify Credits: ${profile.credits_verify || 0}`);
    console.log(`  Plan: ${profile.plan || 'unknown'}`);
    console.log(`  Full Name: ${profile.full_name || 'not set'}`);
    
  } catch (error) {
    console.error('❌ Error testing getUserProfile:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
}

// Function to check Supabase connection
async function testSupabaseConnection() {
  console.log('\n🔌 Testing Supabase Connection...');
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta?.env?.VITE_SUPABASE_ANON_KEY;
    
    console.log('🔧 Supabase Config:');
    console.log(`  URL: ${supabaseUrl ? 'Set' : 'Missing'}`);
    console.log(`  Anon Key: ${supabaseAnonKey ? 'Set' : 'Missing'}`);
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log('❌ Missing Supabase configuration');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client created successfully');
    
    // Test a simple query
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.error('❌ Supabase connection test failed:', error);
    } else {
      console.log('✅ Supabase connection test successful');
    }
    
  } catch (error) {
    console.error('❌ Error testing Supabase connection:', error);
  }
}

// Main diagnostic function
async function runAuthDiagnostic() {
  console.log('🚀 Running Complete Authentication Diagnostic...');
  
  checkAuthState();
  await testSupabaseConnection();
  await testGetUserProfile();
  
  console.log('\n✅ Authentication diagnostic complete!');
  console.log('📋 Summary:');
  console.log('  1. Check localStorage data above');
  console.log('  2. Verify Supabase connection');
  console.log('  3. Test getUserProfile function');
  console.log('  4. Look for any error messages');
}

// Expose functions globally
window.checkAuthState = checkAuthState;
window.testGetUserProfile = testGetUserProfile;
window.testSupabaseConnection = testSupabaseConnection;
window.runAuthDiagnostic = runAuthDiagnostic;

console.log('\n📋 Available debug functions:');
console.log('  - runAuthDiagnostic() - Run complete diagnostic');
console.log('  - checkAuthState() - Check current auth state');
console.log('  - testGetUserProfile() - Test profile fetching');
console.log('  - testSupabaseConnection() - Test Supabase connection');

// Auto-run diagnostic
console.log('\n🚀 Auto-running authentication diagnostic...');
runAuthDiagnostic();