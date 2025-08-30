import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wbcfsffssphgvpnbrvve.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiY2ZzZmZzc3BoZ3ZwbmJydnZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE3Mzc1NCwiZXhwIjoyMDcwNzQ5NzU0fQ.dnXUMNFUw0amsJsLL8PHMjHRpda8w07KbwDIpo3O2vE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestProfile() {
  try {
    console.log('Creating test profile...')
    
    const testProfile = {
      id: 'test-user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      credits_find: 100,
      credits_verify: 50,
      plan: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .upsert(testProfile, { onConflict: 'id' })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating test profile:', error)
      return
    }
    
    console.log('Test profile created successfully:', data)
    
    // Verify it was created
    const { data: fetchedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', 'test-user-123')
      .single()
    
    if (fetchError) {
      console.error('Error fetching test profile:', fetchError)
    } else {
      console.log('Verified test profile:', fetchedProfile)
    }
    
  } catch (error) {
    console.error('Failed to create test profile:', error)
  }
}

createTestProfile()