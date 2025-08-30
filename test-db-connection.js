import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wbcfsffssphgvpnbrvve.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiY2ZzZmZzc3BoZ3ZwbmJydnZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzM3NTQsImV4cCI6MjA3MDc0OTc1NH0.3GV4dQm0Aqm8kbNzPJYOCFLnvhyNqxCJCtwfmUAw29Y'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(5)
    
    if (error) {
      console.error('Error fetching profiles:', error)
      return
    }
    
    console.log('Profiles found:', data)
    console.log('Number of profiles:', data?.length || 0)
    
    if (data && data.length > 0) {
      console.log('Sample profile:', data[0])
    }
    
  } catch (error) {
    console.error('Connection test failed:', error)
  }
}

testConnection()