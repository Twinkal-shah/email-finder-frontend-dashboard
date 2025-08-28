import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createUserProfile() {
  try {
    console.log('🔍 Checking for users without profiles...')
    
    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError)
      return
    }
    
    console.log(`📊 Found ${authUsers.users.length} authenticated users`)
    
    // Check which users don't have profiles
    for (const user of authUsers.users) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()
      
      if (profileError && profileError.code === 'PGRST116') {
        // User doesn't have a profile, create one
        console.log(`👤 Creating profile for user: ${user.email} (${user.id})`)
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
            plan: 'free',
            credits_find: 25,
            credits_verify: 25,
            plan_expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (createError) {
          console.error(`❌ Error creating profile for ${user.email}:`, createError)
        } else {
          console.log(`✅ Successfully created profile for ${user.email}`)
          console.log(`   - Plan: ${newProfile.plan}`)
          console.log(`   - Find Credits: ${newProfile.credits_find}`)
          console.log(`   - Verify Credits: ${newProfile.credits_verify}`)
        }
      } else if (profile) {
        console.log(`✅ Profile already exists for: ${user.email}`)
      } else {
        console.error(`❌ Error checking profile for ${user.email}:`, profileError)
      }
    }
    
    console.log('\n🎉 Profile creation process completed!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
createUserProfile()
  .then(() => {
    console.log('\n📋 Next steps:')
    console.log('1. Refresh your browser')
    console.log('2. Go to the Billing page to verify your credits')
    console.log('3. Try searching for emails again')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })