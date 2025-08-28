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

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testRealTimeCredits() {
  try {
    const userId = '720aa72d-9d8c-42cf-b44a-30273675d149'
    
    console.log('🔍 Testing real-time credits fetch for user:', userId)
    console.log()
    
    // Test the same query that useRealTimeCredits uses
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('❌ Error fetching profile:', error.message)
      console.error('Error details:', error)
      return
    }
    
    if (!profile) {
      console.log('❌ No profile found')
      return
    }
    
    console.log('✅ Profile fetched successfully!')
    console.log('📋 Raw profile data:')
    console.log(JSON.stringify(profile, null, 2))
    console.log()
    
    console.log('🎯 Processed data (as useRealTimeCredits would see it):')
    console.log(`   Find Credits: ${profile.credits_find || 0}`)
    console.log(`   Verify Credits: ${profile.credits_verify || 0}`)
    console.log(`   Plan: ${profile.plan || 'free'}`)
    console.log(`   Full Name: "${profile.full_name || ''}" (${profile.full_name ? 'SET' : 'EMPTY'})`)
    console.log(`   Plan Expiry: ${profile.plan_expiry}`)
    console.log()
    
    // Test what the Topbar would display
    const displayName = profile.full_name || 'twinkalshah719@gmail.com' || 'Unknown User'
    console.log(`🖥️  Topbar would display: "${displayName}"`)
    
    if (!profile.full_name) {
      console.log('⚠️  Issue found: full_name is empty!')
      console.log('🔧 This explains why email is showing instead of name')
    } else {
      console.log('✅ full_name is properly set')
    }
    
    // Test real-time subscription setup
    console.log()
    console.log('🔄 Testing real-time subscription...')
    
    const subscription = supabase
      .channel('test-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          console.log('📡 Real-time update received:', payload.new)
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription is working!')
          
          // Trigger a small update to test real-time
          setTimeout(async () => {
            console.log('🔄 Triggering test update...')
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', userId)
            
            if (updateError) {
              console.error('❌ Error triggering update:', updateError.message)
            } else {
              console.log('✅ Test update sent')
            }
            
            // Clean up
            setTimeout(() => {
              subscription.unsubscribe()
              console.log('🧹 Subscription cleaned up')
              process.exit(0)
            }, 2000)
          }, 1000)
        }
      })
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    console.error(error)
  }
}

testRealTimeCredits()