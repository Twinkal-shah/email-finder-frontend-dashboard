import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env file')
  process.exit(1)
}

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)
const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

async function debugRLSPolicies() {
  try {
    const userId = '720aa72d-9d8c-42cf-b44a-30273675d149'
    
    console.log('🔍 Debugging RLS policies for profiles table')
    console.log('👤 User ID:', userId)
    console.log()
    
    // Test 1: Check with service role (bypasses RLS)
    console.log('🔧 Test 1: Querying with SERVICE ROLE key (bypasses RLS)...')
    const { data: serviceData, error: serviceError } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (serviceError) {
      console.error('❌ Service role query failed:', serviceError.message)
    } else {
      console.log('✅ Service role query successful!')
      console.log(`   Profile exists: ${serviceData ? 'YES' : 'NO'}`)
      if (serviceData) {
        console.log(`   Email: ${serviceData.email}`)
        console.log(`   Full Name: "${serviceData.full_name || 'EMPTY'}"`)
        console.log(`   Credits Find: ${serviceData.credits_find}`)
        console.log(`   Credits Verify: ${serviceData.credits_verify}`)
      }
    }
    
    console.log()
    
    // Test 2: Check with anon key (subject to RLS)
    console.log('🔒 Test 2: Querying with ANON key (subject to RLS)...')
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (anonError) {
      console.error('❌ Anon query failed:', anonError.message)
      console.error('   Error code:', anonError.code)
      if (anonError.code === 'PGRST116') {
        console.log('   This means: No rows returned (likely RLS blocking access)')
      }
    } else {
      console.log('✅ Anon query successful!')
      console.log(`   Profile accessible: ${anonData ? 'YES' : 'NO'}`)
    }
    
    console.log()
    
    // Test 3: Check RLS policies
    console.log('📋 Test 3: Checking RLS policies on profiles table...')
    const { data: policies, error: policiesError } = await supabaseService
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'profiles')
    
    if (policiesError) {
      console.error('❌ Error fetching policies:', policiesError.message)
    } else {
      console.log(`✅ Found ${policies.length} RLS policies:`)
      policies.forEach((policy, index) => {
        console.log(`   ${index + 1}. ${policy.policyname}`)
        console.log(`      Command: ${policy.cmd}`)
        console.log(`      Roles: ${policy.roles}`)
        console.log(`      Expression: ${policy.qual || 'N/A'}`)
        console.log()
      })
    }
    
    // Test 4: Check if RLS is enabled
    console.log('🔐 Test 4: Checking if RLS is enabled on profiles table...')
    const { data: tableInfo, error: tableError } = await supabaseService
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'profiles')
      .single()
    
    if (tableError) {
      console.error('❌ Error checking table info:', tableError.message)
    } else {
      console.log(`✅ Table info:`)
      console.log(`   RLS Enabled: ${tableInfo.relrowsecurity ? 'YES' : 'NO'}`)
    }
    
    console.log()
    
    // Test 5: Try to authenticate and then query
    console.log('🔑 Test 5: Simulating authenticated user query...')
    
    // First, let's check if there's a user in auth.users with this ID
    const { data: authUser, error: authError } = await supabaseService
      .from('auth.users')
      .select('id, email')
      .eq('id', userId)
      .single()
    
    if (authError) {
      console.error('❌ User not found in auth.users:', authError.message)
    } else {
      console.log('✅ User found in auth.users:')
      console.log(`   ID: ${authUser.id}`)
      console.log(`   Email: ${authUser.email}`)
    }
    
    console.log()
    console.log('🎯 DIAGNOSIS:')
    
    if (serviceData && !anonData) {
      console.log('❌ ISSUE IDENTIFIED: RLS is blocking access to the profile')
      console.log('📝 SOLUTION: The profiles table needs proper RLS policies')
      console.log('   that allow users to read their own profiles.')
      console.log()
      console.log('🔧 RECOMMENDED FIX:')
      console.log('   1. Create an RLS policy that allows users to read their own profile')
      console.log('   2. The policy should be: auth.uid() = profiles.id')
    } else if (!serviceData) {
      console.log('❌ ISSUE: Profile does not exist in the database')
      console.log('📝 SOLUTION: Create the profile record')
    } else {
      console.log('✅ Profile exists and is accessible')
      console.log('❓ The issue might be elsewhere in the application')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    console.error(error)
  }
}

debugRLSPolicies()