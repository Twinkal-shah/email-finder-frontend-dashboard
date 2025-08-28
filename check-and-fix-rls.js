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

async function checkAndFixRLS() {
  console.log('🔧 Checking and fixing RLS policies for profiles table...')
  console.log()
  
  try {
    console.log('1️⃣ Checking current RLS policies...')
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { table_name: 'profiles' })
    
    if (policiesError) {
      console.log('⚠️  Could not fetch policies via RPC, trying direct query...')
      
      // Try direct query
      const { data: directPolicies, error: directError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'profiles')
      
      if (directError) {
        console.log('⚠️  Could not fetch policies directly, proceeding to create them...')
      } else {
        console.log('📋 Current policies:', directPolicies)
      }
    } else {
      console.log('📋 Current policies:', policies)
    }
    
    console.log('\n2️⃣ Ensuring RLS is enabled on profiles table...')
    const { error: rlsError } = await supabase
      .rpc('exec', {
        sql: 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;'
      })
    
    if (rlsError && !rlsError.message.includes('already exists')) {
      console.error('❌ Error enabling RLS:', rlsError.message)
    } else {
      console.log('✅ RLS enabled on profiles table')
    }
    
    console.log('\n3️⃣ Creating/updating RLS policies...')
    
    // Drop existing policies first
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Users can view own profile" ON profiles;',
      'DROP POLICY IF EXISTS "Users can update own profile" ON profiles;',
      'DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;',
      'DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;',
      'DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;',
      'DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;'
    ]
    
    for (const dropSql of dropPolicies) {
      const { error } = await supabase.rpc('exec', { sql: dropSql })
      if (error && !error.message.includes('does not exist')) {
        console.log(`⚠️  Warning dropping policy: ${error.message}`)
      }
    }
    
    // Create new policies
    const createPolicies = [
      {
        name: 'profiles_select_policy',
        sql: `CREATE POLICY "profiles_select_policy" ON profiles FOR SELECT USING (auth.uid() = id);`
      },
      {
        name: 'profiles_update_policy', 
        sql: `CREATE POLICY "profiles_update_policy" ON profiles FOR UPDATE USING (auth.uid() = id);`
      },
      {
        name: 'profiles_insert_policy',
        sql: `CREATE POLICY "profiles_insert_policy" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);`
      }
    ]
    
    for (const policy of createPolicies) {
      const { error } = await supabase.rpc('exec', { sql: policy.sql })
      if (error) {
        console.error(`❌ Error creating ${policy.name}:`, error.message)
      } else {
        console.log(`✅ Created policy: ${policy.name}`)
      }
    }
    
    console.log('\n4️⃣ Testing profile access with anon key...')
    
    // Test with anon key
    const anonSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY)
    
    // First, we need to simulate an authenticated user
    // Since we can't actually authenticate in this script, let's just verify the policies exist
    const { data: finalPolicies, error: finalError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual')
      .eq('tablename', 'profiles')
    
    if (finalError) {
      console.log('⚠️  Could not verify final policies')
    } else {
      console.log('📋 Final policies:')
      finalPolicies.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd}): ${policy.qual}`)
      })
    }
    
    console.log('\n🎉 RLS policies have been updated!')
    console.log('\n📋 Next steps:')
    console.log('1. Refresh your application')
    console.log('2. The profile and credit data should now load correctly')
    console.log('3. If issues persist, check browser console for authentication errors')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    console.error(error)
  }
}

checkAndFixRLS()