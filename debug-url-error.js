// Debug script to identify the source of URL construction errors
// Run this in the browser console to help diagnose the issue

console.log('🔍 DEBUGGING URL CONSTRUCTION ERROR');
console.log('=' .repeat(60));

// 1. Check environment variables
console.log('\n1. Environment Variables:');
console.log('VITE_API_BASE:', import.meta?.env?.VITE_API_BASE || 'undefined');
console.log('VITE_SUPABASE_URL:', import.meta?.env?.VITE_SUPABASE_URL || 'undefined');
console.log('VITE_SUPABASE_ANON_KEY:', import.meta?.env?.VITE_SUPABASE_ANON_KEY ? 'defined' : 'undefined');

// 2. Test URL construction with different inputs
console.log('\n2. Testing URL Construction:');

const testUrls = [
  'http://173.249.7.231:8500',
  'https://wbcfsffssphgvpnbrvve.supabase.co',
  'http://localhost:5173',
  'https://app.mailsfinder.com',
  undefined,
  null,
  '',
  'invalid-url'
];

testUrls.forEach((testUrl, index) => {
  try {
    const url = new URL(testUrl);
    console.log(`✅ Test ${index + 1}: ${testUrl} -> Valid`);
  } catch (error) {
    console.log(`❌ Test ${index + 1}: ${testUrl} -> Invalid: ${error.message}`);
  }
});

// 3. Check for problematic global variables
console.log('\n3. Checking Global Variables:');
console.log('window.location.href:', window.location.href);
console.log('window.location.origin:', window.location.origin);
console.log('window.location.pathname:', window.location.pathname);
console.log('window.location.search:', window.location.search);

// 4. Test URLSearchParams
console.log('\n4. Testing URLSearchParams:');
try {
  const params = new URLSearchParams(window.location.search);
  console.log('✅ URLSearchParams works');
  console.log('Params:', Array.from(params.entries()));
} catch (error) {
  console.log('❌ URLSearchParams failed:', error.message);
}

// 5. Check for cached data that might contain invalid URLs
console.log('\n5. Checking LocalStorage for Invalid URLs:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  
  // Check if value contains URL-like strings
  if (value && (value.includes('http') || value.includes('ws://') || value.includes('wss://'))) {
    console.log(`📦 ${key}:`, value.substring(0, 100) + (value.length > 100 ? '...' : ''));
    
    // Try to parse as JSON and look for URL properties
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object') {
        Object.keys(parsed).forEach(prop => {
          if (typeof parsed[prop] === 'string' && 
              (parsed[prop].includes('http') || parsed[prop].includes('ws'))) {
            console.log(`  🔗 ${prop}: ${parsed[prop]}`);
          }
        });
      }
    } catch (e) {
      // Not JSON, skip
    }
  }
}

// 6. Override URL constructor to catch errors
console.log('\n6. Setting up URL Constructor Monitor:');
const originalURL = window.URL;
window.URL = function(url, base) {
  console.log('🔍 URL Constructor called with:', { url, base });
  try {
    return new originalURL(url, base);
  } catch (error) {
    console.error('❌ URL Construction failed:', { url, base, error: error.message });
    console.trace('Stack trace:');
    throw error;
  }
};

// Copy static methods
Object.setPrototypeOf(window.URL, originalURL);
Object.getOwnPropertyNames(originalURL).forEach(name => {
  if (typeof originalURL[name] === 'function') {
    window.URL[name] = originalURL[name];
  }
});

console.log('✅ URL Constructor monitor installed');
console.log('\n💡 Now try to reproduce the error. The monitor will show exactly what URL is causing the issue.');

// 7. Instructions
console.log('\n📋 NEXT STEPS:');
console.log('1. Look for any ❌ Invalid URLs above');
console.log('2. Try to navigate or perform actions that trigger the error');
console.log('3. The URL monitor will show exactly what\'s causing the issue');
console.log('4. Clear browser cache and hard refresh (Ctrl+F5 / Cmd+Shift+R)');
console.log('5. Try incognito/private browsing mode');

// 8. Cache busting helper
window.clearAllCaches = function() {
  console.log('🧹 Clearing all caches...');
  
  // Clear localStorage
  localStorage.clear();
  console.log('✅ LocalStorage cleared');
  
  // Clear sessionStorage
  sessionStorage.clear();
  console.log('✅ SessionStorage cleared');
  
  // Clear cookies for this domain
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  console.log('✅ Cookies cleared');
  
  console.log('🎉 All caches cleared! Please hard refresh the page (Ctrl+F5 / Cmd+Shift+R)');
};

console.log('\n🛠️ Available helper functions:');
console.log('- clearAllCaches() - Clear all browser caches and data');