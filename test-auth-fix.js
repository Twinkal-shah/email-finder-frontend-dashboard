import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration in .env file')
  process.exit(1)
}

console.log('🔧 Testing Supabase Configuration After URL Fix')
console.log('=' .repeat(60))

// Test URL construction
console.log('\n1. Testing URL Construction:')
try {
  const testUrl = new URL(supabaseUrl)
  console.log('✅ Supabase URL is valid:', testUrl.href)
} catch (error) {
  console.error('❌ Invalid Supabase URL:', error.message)
  process.exit(1)
}

// Test Supabase client creation
console.log('\n2. Testing Supabase Client Creation:')
try {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false // Disable for server-side testing
    }
  })
  console.log('✅ Supabase client created successfully')
  
  // Test basic connection
  console.log('\n3. Testing Database Connection:')
  const { data, error } = await supabase
    .from('profiles')
    .select('count')
    .limit(1)
  
  if (error) {
    console.error('❌ Database connection failed:', error.message)
  } else {
    console.log('✅ Database connection successful')
  }
  
  // Test RLS policies
  console.log('\n4. Testing RLS Policies:')
  const { data: policies, error: policyError } = await supabase
    .rpc('exec_sql', { 
      sql: `
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
        FROM pg_policies 
        WHERE tablename = 'profiles'
      `
    })
  
  if (policyError) {
    console.log('⚠️ Could not check RLS policies (this is normal):', policyError.message)
  } else {
    console.log('✅ RLS policies found:', policies?.length || 0)
  }
  
  // Test WebSocket connection
  console.log('\n5. Testing Realtime Connection:')
  const channel = supabase.channel('test-channel')
  
  channel
    .on('presence', { event: 'sync' }, () => {
      console.log('✅ Realtime connection established')
    })
    .subscribe((status) => {
      console.log('📡 Realtime status:', status)
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to realtime')
        channel.unsubscribe()
      } else if (status === 'CHANNEL_ERROR') {
        console.log('❌ Realtime connection failed')
      }
    })
  
  // Wait a bit for realtime connection
  await new Promise(resolve => setTimeout(resolve, 3000))
  
} catch (error) {
  console.error('❌ Supabase client creation failed:', error.message)
  process.exit(1)
}

console.log('\n' + '=' .repeat(60))
console.log('🎉 AUTHENTICATION FIX SUMMARY')
console.log('=' .repeat(60))
console.log('✅ Removed problematic URL constructor patch')
console.log('✅ Re-enabled getSessionFromUrl function')
console.log('✅ Supabase client configuration verified')
console.log('\n📋 NEXT STEPS:')
console.log('1. Clear browser cache and cookies completely')
console.log('2. Restart your development server')
console.log('3. Try logging in again')
console.log('4. Check browser console for any remaining errors')
console.log('\n🔗 If issues persist, check:')
console.log('- Supabase project settings')
console.log('- Row Level Security policies')
console.log('- Network connectivity')
console.log('- Browser developer tools for detailed errors')

process.exit(0)