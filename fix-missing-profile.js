// Script to create missing profiles for existing users
// Run this with: node fix-missing-profile.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_SERVICE_ROLE_KEY in .env file');
  console.log('You need the service role key to manage user profiles.');
  console.log('Add this to your .env file:');
  console.log('VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixMissingProfiles() {
  console.log('🔍 Checking for users without profiles...');
  
  try {
    // Get all users from auth.users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
      return;
    }
    
    console.log(`📊 Found ${users.length} users in auth.users`);
    
    // Check each user for existing profile
    for (const user of users) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log(`🔧 Creating profile for user: ${user.email}`);
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            plan: 'free',
            credits_find: 25,
            credits_verify: 25,
            plan_expiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
          });
        
        if (insertError) {
          console.error(`❌ Error creating profile for ${user.email}:`, insertError.message);
        } else {
          console.log(`✅ Profile created for ${user.email}`);
        }
      } else if (!profileError) {
        console.log(`✅ Profile already exists for ${user.email}`);
      } else {
        console.error(`❌ Error checking profile for ${user.email}:`, profileError.message);
      }
    }
    
    console.log('\n🎉 Profile check complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Refresh your application');
    console.log('2. Log out and log back in if needed');
    console.log('3. Your credits and name should now display correctly');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

fixMissingProfiles();