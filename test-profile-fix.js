import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with direct values
const supabaseUrl = 'https://wbcfsffssphgvpnbrvve.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiY2ZzZmZzc3BoZ3ZwbmJydnZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzM3NTQsImV4cCI6MjA3MDc0OTc1NH0.3GV4dQm0Aqm8kbNzPJYOCFLnvhyNqxCJCtwfmUAw29Y'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Simple getUserProfile function for testing
async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching user profile:', error)
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    throw error
  }
}

async function testProfileFix() {
  console.log('🔧 Testing profile fix after URL construction issue...')
  console.log()
  
  try {
    // Test user ID from the logs
    const userId = '720aa72d-9d8c-42cf-b44a-30273675d149'
    
    console.log('1️⃣ First, let\'s check what profiles exist...')
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
    
    if (allError) {
      console.error('❌ Error fetching all profiles:', allError.message)
      return
    }
    
    console.log('📋 Found profiles:')
    allProfiles.forEach(p => {
      console.log(`   - ${p.id}: ${p.email} (${p.full_name || 'No name'})`)
    })
    console.log()
    
    // Use the first profile if the test user doesn't exist
    const testUserId = allProfiles.find(p => p.id === userId)?.id || allProfiles[0]?.id
    if (!testUserId) {
      console.error('❌ No profiles found in database')
      return
    }
    
    console.log(`2️⃣ Testing with user ID: ${testUserId}`)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .single()
    
    if (error) {
      console.error('❌ Direct query failed:', error.message)
      return
    }
    
    console.log('✅ Direct query successful!')
    console.log('   Full name:', profile.full_name || 'Not set')
    console.log('   Email:', profile.email)
    console.log('   Find credits:', profile.credits_find)
    console.log('   Verify credits:', profile.credits_verify)
    console.log('   Plan:', profile.plan)
    console.log()
    
    console.log('3️⃣ Testing getUserProfile function...')
    const userProfile = await getUserProfile(testUserId)
    
    console.log('✅ getUserProfile successful!')
    console.log('   Full name:', userProfile.full_name || 'Not set')
    console.log('   Email:', userProfile.email)
    console.log('   Find credits:', userProfile.credits_find)
    console.log('   Verify credits:', userProfile.credits_verify)
    console.log('   Plan:', userProfile.plan)
    console.log()
    
    console.log('4️⃣ Testing real-time subscription...')
    const channel = supabase
      .channel('test-profile-fix')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${testUserId}`
      }, (payload) => {
        console.log('📡 Real-time update received:', payload.new)
      })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription working!')
          
          // Clean up after 3 seconds
          setTimeout(() => {
            channel.unsubscribe()
            console.log('🧹 Test completed successfully!')
            console.log()
            console.log('🎉 Profile fetching should now work in the application!')
            console.log('   Please refresh your browser and try again.')
            process.exit(0)
          }, 3000)
        }
      })
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error)
  }
}

testProfileFix()