// Credit Debug Script
// Run this in browser console to debug credit fetching issues

console.log('🔧 Credit Debug Script Starting...');

// Test 1: Check authentication state
function testAuthState() {
  console.log('\n🔍 Testing Authentication State...');
  
  // Check if auth context is available
  if (typeof window.authContext !== 'undefined') {
    console.log('✅ Auth context available');
    console.log('👤 User:', window.authContext.user);
    console.log('🔐 Authenticated:', window.authContext.isAuthenticated);
  } else {
    console.log('❌ Auth context not available in window');
  }
  
  // Check localStorage for user data
  const storedUser = localStorage.getItem('auth_user');
  if (storedUser) {
    console.log('💾 Stored user data:', JSON.parse(storedUser));
  } else {
    console.log('❌ No stored user data found');
  }
  
  // Check for tokens
  const storedTokens = localStorage.getItem('auth_tokens');
  if (storedTokens) {
    console.log('🔑 Stored tokens:', JSON.parse(storedTokens));
  } else {
    console.log('❌ No stored tokens found');
  }
}

// Test 2: Direct Supabase profile query
async function testDirectProfileQuery() {
  console.log('\n🔍 Testing Direct Profile Query...');
  
  try {
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = 'https://wbcfsffssphgvpnbrvve.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiY2ZzZmZzc3BoZ3ZwbmJydnZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzM3NTQsImV4cCI6MjA3MDc0OTc1NH0.3GV4dQm0Aqm8kbNzPJYOCFLnvhyNqxCJCtwfmUAw29Y';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test 1: Query by email
    console.log('📧 Querying profile by email: twinkalshah719@gmail.com');
    const { data: profileByEmail, error: emailError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'twinkalshah719@gmail.com')
      .single();
    
    if (emailError) {
      console.error('❌ Error querying by email:', emailError);
    } else {
      console.log('✅ Profile found by email:', profileByEmail);
    }
    
    // Test 2: List all profiles to see what's in the table
    console.log('📋 Listing all profiles...');
    const { data: allProfiles, error: listError } = await supabase
      .from('profiles')
      .select('id, email, full_name, credits_find, credits_verify, plan')
      .limit(10);
    
    if (listError) {
      console.error('❌ Error listing profiles:', listError);
    } else {
      console.log('✅ All profiles:', allProfiles);
    }
    
    // Test 3: Check current session
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
    } else {
      console.log('🔐 Current session:', session);
      
      if (session.session?.user) {
        const userId = session.session.user.id;
        console.log('👤 Current user ID:', userId);
        
        // Query profile by current user ID
        const { data: currentProfile, error: currentError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (currentError) {
          console.error('❌ Error querying current user profile:', currentError);
        } else {
          console.log('✅ Current user profile:', currentProfile);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error in direct profile query:', error);
  }
}

// Test 3: Test getUserProfile function
async function testGetUserProfileFunction() {
  console.log('\n🔍 Testing getUserProfile Function...');
  
  try {
    // Try to import and use the getUserProfile function
    const { getUserProfile } = await import('./src/api/user.js');
    
    // Get user ID from stored data
    const storedUser = localStorage.getItem('auth_user');
    if (!storedUser) {
      console.log('❌ No stored user data to test with');
      return;
    }
    
    const user = JSON.parse(storedUser);
    const userId = user.id || user.user_id;
    
    if (!userId) {
      console.log('❌ No user ID found in stored data');
      return;
    }
    
    console.log('👤 Testing with user ID:', userId);
    const profile = await getUserProfile(userId);
    console.log('✅ getUserProfile result:', profile);
    
  } catch (error) {
    console.error('❌ Error testing getUserProfile:', error);
  }
}

// Test 4: Test credit hook
function testCreditHook() {
  console.log('\n🔍 Testing Credit Hook State...');
  
  // Check if React DevTools is available
  if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined') {
    console.log('⚛️ React DevTools available - check component state manually');
  }
  
  // Look for credit data in component state (if exposed)
  if (typeof window.creditDebugData !== 'undefined') {
    console.log('💳 Credit debug data:', window.creditDebugData);
  } else {
    console.log('❌ No credit debug data exposed');
  }
}

// Main diagnostic function
async function runCreditDiagnostic() {
  console.log('🚀 Running Complete Credit Diagnostic...');
  
  testAuthState();
  await testDirectProfileQuery();
  await testGetUserProfileFunction();
  testCreditHook();
  
  console.log('\n✅ Credit diagnostic complete!');
  console.log('📋 Summary:');
  console.log('  1. Check authentication state above');
  console.log('  2. Verify profile data exists in database');
  console.log('  3. Test getUserProfile function');
  console.log('  4. Check React component state');
}

// Expose functions globally
window.testAuthState = testAuthState;
window.testDirectProfileQuery = testDirectProfileQuery;
window.testGetUserProfileFunction = testGetUserProfileFunction;
window.testCreditHook = testCreditHook;
window.runCreditDiagnostic = runCreditDiagnostic;

console.log('\n📋 Available debug functions:');
console.log('  - runCreditDiagnostic() - Run complete diagnostic');
console.log('  - testAuthState() - Check authentication');
console.log('  - testDirectProfileQuery() - Test direct DB query');
console.log('  - testGetUserProfileFunction() - Test API function');
console.log('  - testCreditHook() - Check React hook state');

// Auto-run diagnostic
console.log('\n🚀 Auto-running diagnostic...');
runCreditDiagnostic();