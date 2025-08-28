import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies for profiles table...')
  console.log()
  
  try {
    // Enable RLS
    console.log('1️⃣ Enabling RLS on profiles table...')
    const { error: rlsError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (rlsError) {
      console.log('⚠️  RLS might already be enabled or there\'s an access issue')
      console.log('Error:', rlsError.message)
    } else {
      console.log('✅ Profiles table is accessible')
    }
    
    // Check if we can access with service role
    console.log('\n2️⃣ Testing service role access...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
    
    if (profilesError) {
      console.error('❌ Error accessing profiles with service role:', profilesError.message)
      return
    }
    
    console.log(`✅ Service role can access ${profiles.length} profiles`)
    
    // Test anon access (this should fail if RLS is working)
    console.log('\n3️⃣ Testing anon key access (should fail with RLS)...')
    const anonSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY)
    
    const { data: anonProfiles, error: anonError } = await anonSupabase
      .from('profiles')
      .select('*')
    
    if (anonError) {
      console.log('✅ RLS is working - anon access denied:', anonError.message)
    } else {
      console.log('⚠️  RLS might not be properly configured - anon access succeeded')
      console.log(`   Found ${anonProfiles.length} profiles with anon key`)
    }
    
    console.log('\n4️⃣ The issue might be in the application authentication...')
    console.log('\n📋 Debugging steps:')
    console.log('1. Check if the user is properly authenticated in the browser')
    console.log('2. Verify that auth.uid() returns the correct user ID')
    console.log('3. Check browser console for authentication errors')
    console.log('4. Ensure the Supabase client is initialized correctly')
    
    // Let's also check the current user in the profiles
    if (profiles.length > 0) {
      const profile = profiles[0]
      console.log('\n📋 Profile details:')
      console.log(`   ID: ${profile.id}`)
      console.log(`   Email: ${profile.email}`)
      console.log(`   Credits Find: ${profile.credits_find}`)
      console.log(`   Credits Verify: ${profile.credits_verify}`)
      console.log(`   Plan: ${profile.plan}`)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    console.error(error)
  }
}

fixRLSPolicies()