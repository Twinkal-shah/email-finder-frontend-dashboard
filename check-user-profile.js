import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env file')
  console.log('Required variables:')
  console.log('- VITE_SUPABASE_URL')
  console.log('- VITE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUserProfile() {
  try {
    const userId = '720aa72d-9d8c-42cf-b44a-30273675d149'
    
    console.log('🔍 Checking profile for user:', userId)
    console.log('📧 Expected email: twinkalshah719@gmail.com')
    console.log()
    
    // Check if profile exists
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching profile:', error.message)
      return
    }
    
    if (!profile) {
      console.log('❌ No profile found for this user ID')
      console.log()
      console.log('🔧 Creating profile now...')
      
      // Create the missing profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: 'twinkalshah719@gmail.com',
          full_name: 'Twinkal shah',
          plan: 'free',
          credits_find: 25,
          credits_verify: 25,
          plan_expiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creating profile:', createError.message)
        return
      }
      
      console.log('✅ Profile created successfully!')
      console.log('📋 Profile details:')
      console.log(`   ID: ${newProfile.id}`)
      console.log(`   Email: ${newProfile.email}`)
      console.log(`   Name: ${newProfile.full_name}`)
      console.log(`   Plan: ${newProfile.plan}`)
      console.log(`   Find Credits: ${newProfile.credits_find}`)
      console.log(`   Verify Credits: ${newProfile.credits_verify}`)
      console.log(`   Plan Expiry: ${newProfile.plan_expiry}`)
    } else {
      console.log('✅ Profile found!')
      console.log('📋 Profile details:')
      console.log(`   ID: ${profile.id}`)
      console.log(`   Email: ${profile.email}`)
      console.log(`   Name: ${profile.full_name || 'Not set'}`)
      console.log(`   Plan: ${profile.plan}`)
      console.log(`   Find Credits: ${profile.credits_find}`)
      console.log(`   Verify Credits: ${profile.credits_verify}`)
      console.log(`   Plan Expiry: ${profile.plan_expiry}`)
      
      // Check if we need to update the full_name
      if (!profile.full_name || profile.full_name !== 'Twinkal shah') {
        console.log()
        console.log('🔧 Updating full_name...')
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ full_name: 'Twinkal shah' })
          .eq('id', userId)
        
        if (updateError) {
          console.error('❌ Error updating full_name:', updateError.message)
        } else {
          console.log('✅ Full name updated successfully!')
        }
      }
    }
    
    console.log()
    console.log('🎉 Profile check complete!')
    console.log('📝 Next steps:')
    console.log('1. Refresh your application')
    console.log('2. The credits and name should now display correctly')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

checkUserProfile()