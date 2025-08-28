import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing')
  console.log('VITE_SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Present' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkProfile() {
  console.log('🔍 Checking profile for twinkalshah719@gmail.com...')
  
  try {
    // Check if profile exists
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'twinkalshah719@gmail.com')
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ Profile not found for twinkalshah719@gmail.com')
        
        // Check all profiles to see what exists
        const { data: allProfiles, error: allError } = await supabase
          .from('profiles')
          .select('id, email, full_name, credits_find, credits_verify, plan')
        
        if (allError) {
          console.error('❌ Error fetching all profiles:', allError)
        } else {
          console.log('📋 All existing profiles:')
          allProfiles.forEach(p => {
            console.log(`  - ${p.email} (${p.full_name}) - Find: ${p.credits_find}, Verify: ${p.credits_verify}, Plan: ${p.plan}`)
          })
        }
      } else {
        console.error('❌ Error fetching profile:', error)
      }
    } else {
      console.log('✅ Profile found:')
      console.log(`  ID: ${profile.id}`)
      console.log(`  Email: ${profile.email}`)
      console.log(`  Full Name: ${profile.full_name}`)
      console.log(`  Credits Find: ${profile.credits_find}`)
      console.log(`  Credits Verify: ${profile.credits_verify}`)
      console.log(`  Plan: ${profile.plan}`)
      console.log(`  Plan Expiry: ${profile.plan_expiry}`)
      console.log(`  Created: ${profile.created_at}`)
      console.log(`  Updated: ${profile.updated_at}`)
    }
    
    // Also check auth.users table
    console.log('\n🔍 Checking auth.users table...')
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
    } else {
      const targetUser = users.users.find(u => u.email === 'twinkalshah719@gmail.com')
      if (targetUser) {
        console.log('✅ User found in auth.users:')
        console.log(`  ID: ${targetUser.id}`)
        console.log(`  Email: ${targetUser.email}`)
        console.log(`  Created: ${targetUser.created_at}`)
        console.log(`  Last Sign In: ${targetUser.last_sign_in_at}`)
      } else {
        console.log('❌ User not found in auth.users table')
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkProfile()