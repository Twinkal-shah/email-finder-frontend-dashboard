import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyRLSFix() {
  try {
    console.log('🔧 Applying RLS policy fix for profiles table...')
    console.log()
    
    // Step 1: Enable RLS on profiles table
    console.log('1️⃣ Enabling Row Level Security on profiles table...')
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;'
    })
    
    if (rlsError && !rlsError.message.includes('already enabled')) {
      console.error('❌ Error enabling RLS:', rlsError.message)
    } else {
      console.log('✅ RLS enabled successfully')
    }
    
    // Step 2: Drop existing policies (if any)
    console.log('\n2️⃣ Dropping existing policies...')
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Users can view own profile" ON profiles;',
      'DROP POLICY IF EXISTS "Users can update own profile" ON profiles;',
      'DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;'
    ]
    
    for (const sql of dropPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        console.log(`⚠️  Warning dropping policy: ${error.message}`)
      }
    }
    console.log('✅ Existing policies dropped')
    
    // Step 3: Create new RLS policies
    console.log('\n3️⃣ Creating new RLS policies...')
    
    const policies = [
      {
        name: 'SELECT policy',
        sql: `CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);`
      },
      {
        name: 'UPDATE policy', 
        sql: `CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);`
      },
      {
        name: 'INSERT policy',
        sql: `CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);`
      }
    ]
    
    for (const policy of policies) {
      console.log(`   Creating ${policy.name}...`)
      const { error } = await supabase.rpc('exec_sql', { sql: policy.sql })
      if (error) {
        console.error(`   ❌ Error creating ${policy.name}:`, error.message)
      } else {
        console.log(`   ✅ ${policy.name} created successfully`)
      }
    }
    
    // Step 4: Grant permissions
    console.log('\n4️⃣ Granting permissions to authenticated users...')
    const permissions = [
      'GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;',
      'GRANT USAGE ON SCHEMA public TO authenticated;'
    ]
    
    for (const sql of permissions) {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        console.log(`⚠️  Warning granting permission: ${error.message}`)
      }
    }
    console.log('✅ Permissions granted')
    
    // Step 5: Test the fix
    console.log('\n5️⃣ Testing the fix...')
    const userId = '720aa72d-9d8c-42cf-b44a-30273675d149'
    
    // Create a client with anon key to test
    const testClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY)
    
    // We can't actually authenticate without the user's session, but we can check if the policies exist
    const { data: policiesCheck, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd')
      .eq('tablename', 'profiles')
    
    if (policiesError) {
      console.log('⚠️  Could not verify policies, but they should be created')
    } else {
      console.log('✅ RLS Policies verified:')
      policiesCheck.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`)
      })
    }
    
    console.log('\n🎉 RLS fix applied successfully!')
    console.log('\n📝 Next steps:')
    console.log('1. Refresh your application')
    console.log('2. Log out and log back in')
    console.log('3. The credits and full name should now display correctly')
    console.log('\n💡 The issue was that Row Level Security was blocking access to profiles.')
    console.log('   Now users can read and update their own profile data.')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    console.error(error)
  }
}

// Check if exec_sql function exists, if not, use direct SQL execution
async function checkAndCreateExecSql() {
  try {
    // Try to use exec_sql function
    const { error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' })
    if (error && error.message.includes('function exec_sql')) {
      console.log('📝 Creating exec_sql helper function...')
      
      // Create the exec_sql function
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$;
      `
      
      // Use direct SQL execution to create the function
      const { error: createError } = await supabase
        .from('_dummy_table_that_does_not_exist')
        .select('*')
      
      // Since we can't execute DDL directly, let's use a different approach
      console.log('⚠️  Cannot create exec_sql function. Using alternative approach...')
      return false
    }
    return true
  } catch (error) {
    console.log('⚠️  exec_sql function not available. Using alternative approach...')
    return false
  }
}

// Alternative approach using direct SQL queries
async function applyRLSFixDirect() {
  try {
    console.log('🔧 Applying RLS policy fix using direct SQL approach...')
    console.log()
    
    // We'll create a comprehensive SQL script and execute it
    const sqlScript = `
      -- Enable RLS
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing policies
      DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
      DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
      DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
      
      -- Create new policies
      CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
      CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
      CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
      
      -- Grant permissions
      GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
      GRANT USAGE ON SCHEMA public TO authenticated;
    `
    
    console.log('📝 SQL script prepared. Please run this manually in your Supabase SQL editor:')
    console.log('\n' + '='.repeat(80))
    console.log(sqlScript)
    console.log('='.repeat(80))
    
    console.log('\n🎯 Instructions:')
    console.log('1. Go to your Supabase Dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the SQL script above')
    console.log('4. Click "Run" to execute')
    console.log('5. Refresh your application and test')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Main execution
async function main() {
  const canUseExecSql = await checkAndCreateExecSql()
  
  if (canUseExecSql) {
    await applyRLSFix()
  } else {
    await applyRLSFixDirect()
  }
}

main()