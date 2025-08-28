// Script to clear old search results from localStorage
// This resolves the issue where old search data persists after account deletion

console.log('🧹 Clearing old search results...');

// Clear the search results from localStorage
try {
  const oldResults = localStorage.getItem('find_results');
  if (oldResults) {
    localStorage.removeItem('find_results');
    console.log('✅ Cleared old search results from localStorage');
    console.log('📊 Removed data:', JSON.parse(oldResults).length, 'search results');
  } else {
    console.log('ℹ️ No search results found in localStorage');
  }
} catch (error) {
  console.error('❌ Error clearing search results:', error);
}

// Also clear any other cached data that might be stale
try {
  // Clear auth tokens if they exist
  const authTokens = localStorage.getItem('auth_tokens');
  if (authTokens) {
    localStorage.removeItem('auth_tokens');
    console.log('✅ Cleared auth tokens');
  }
  
  // Clear user data
  const userData = localStorage.getItem('auth_user');
  if (userData) {
    localStorage.removeItem('auth_user');
    console.log('✅ Cleared user data');
  }
  
  console.log('🎉 All cached data cleared! Please refresh the page.');
} catch (error) {
  console.error('❌ Error clearing cached data:', error);
}

// Instructions for the user
console.log('\n📋 INSTRUCTIONS:');
console.log('1. Refresh the page (F5 or Cmd+R)');
console.log('2. Log in again');
console.log('3. Your search results should now be empty');
console.log('\n💡 This issue has been fixed - future logouts will automatically clear search results.');