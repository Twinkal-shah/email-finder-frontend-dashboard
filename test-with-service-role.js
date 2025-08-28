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

async function testWithServiceRole() {
  console.log('🔧 Testing profile access with service role key...')
  console.log()
  
  try {
    console.log('1️⃣ Testing profiles table access...')
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
    
    if (error) {
      console.error('❌ Error accessing profiles table:', error.message)
      console.error('Error details:', error)
      return
    }
    
    console.log('✅ Profiles table accessible!')
    console.log(`📋 Found ${profiles.length} profiles:`)
    
    profiles.forEach(profile => {
      console.log(`   - ${profile.id}`)
      console.log(`     Email: ${profile.email}`)
      console.log(`     Name: ${profile.full_name || 'Not set'}`)
      console.log(`     Find Credits: ${profile.credits_find}`)
      console.log(`     Verify Credits: ${profile.credits_verify}`)
      console.log(`     Plan: ${profile.plan}`)
      console.log()
    })
    
    if (profiles.length === 0) {
      console.log('⚠️  No profiles found in the database')
      console.log('   This means the user profile was not created properly')
      
      // Try to get users from auth
      console.log('\n2️⃣ Checking auth.users...')
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
      
      if (usersError) {
        console.error('❌ Error fetching users:', usersError.message)
        return
      }
      
      console.log(`📋 Found ${users.length} users in auth:`)
      users.forEach(user => {
        console.log(`   - ${user.id}: ${user.email}`)
      })
      
      if (users.length > 0) {
        console.log('\n3️⃣ Creating missing profile...')
        const user = users[0]
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            plan: 'free',
            credits_find: 25,
            credits_verify: 25,
            plan_expiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select()
          .single()
        
        if (createError) {
          console.error('❌ Error creating profile:', createError.message)
          console.error('Error details:', createError)
        } else {
          console.log('✅ Profile created successfully!')
          console.log('   Profile data:', newProfile)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    console.error(error)
  }
}

testWithServiceRole()