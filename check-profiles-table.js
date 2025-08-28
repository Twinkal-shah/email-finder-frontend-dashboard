import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkProfilesTable() {
  try {
    console.log('🔍 Checking Supabase profiles table...')
    console.log('📍 Supabase URL:', supabaseUrl)
    console.log('')
    
    // Get table structure
    console.log('📋 Table Structure:')
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public')
      .order('ordinal_position')
    
    if (columnsError) {
      console.error('❌ Error fetching table structure:', columnsError)
    } else {
      console.table(columns)
    }
    
    console.log('')
    
    // Get all profiles
    console.log('👥 All Profiles:')
    const { data: profiles, error: profilesError, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
    } else {
      console.log(`📊 Total profiles: ${count}`)
      console.log('')
      
      if (profiles && profiles.length > 0) {
        profiles.forEach((profile, index) => {
          console.log(`👤 Profile ${index + 1}:`)
          console.log(`   ID: ${profile.id}`)
          console.log(`   Email: ${profile.email}`)
          console.log(`   Full Name: ${profile.full_name || 'Not set'}`)
          console.log(`   Company: ${profile.company || 'Not set'}`)
          console.log(`   Plan: ${profile.plan}`)
          console.log(`   Plan Expiry: ${profile.plan_expiry || 'No expiry'}`)
          console.log(`   Find Credits: ${profile.credits_find}`)
          console.log(`   Verify Credits: ${profile.credits_verify}`)
          console.log(`   Legacy Credits: ${profile.credits || 'N/A'}`)
          console.log(`   Subscription ID: ${profile.subscription_id || 'None'}`)
          console.log(`   Created: ${profile.created_at}`)
          console.log(`   Updated: ${profile.updated_at}`)
          console.log('')
        })
      } else {
        console.log('📭 No profiles found in the table')
      }
    }
    
    // Get table statistics
    console.log('📈 Table Statistics:')
    const { data: stats, error: statsError } = await supabase
      .from('profiles')
      .select('plan, count(*)', { count: 'exact' })
    
    if (!statsError && stats) {
      const planCounts = {}
      const totalCreditsFind = await supabase
        .from('profiles')
        .select('credits_find')
        .then(({ data }) => data?.reduce((sum, p) => sum + (p.credits_find || 0), 0) || 0)
      
      const totalCreditsVerify = await supabase
        .from('profiles')
        .select('credits_verify')
        .then(({ data }) => data?.reduce((sum, p) => sum + (p.credits_verify || 0), 0) || 0)
      
      // Count by plan
      const planStats = await supabase
        .rpc('get_plan_stats')
        .catch(() => {
          // Fallback if RPC doesn't exist
          return supabase
            .from('profiles')
            .select('plan')
            .then(({ data }) => {
              const counts = {}
              data?.forEach(p => {
                counts[p.plan] = (counts[p.plan] || 0) + 1
              })
              return { data: Object.entries(counts).map(([plan, count]) => ({ plan, count })) }
            })
        })
      
      console.log(`   Total Find Credits: ${totalCreditsFind}`)
      console.log(`   Total Verify Credits: ${totalCreditsVerify}`)
      console.log('   Plan Distribution:')
      
      if (planStats.data) {
        planStats.data.forEach(stat => {
          console.log(`     ${stat.plan}: ${stat.count} users`)
        })
      }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

// Run the check
checkProfilesTable()
  .then(() => {
    console.log('✅ Profile table check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })