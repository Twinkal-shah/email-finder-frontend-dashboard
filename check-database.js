// Quick script to check if the profiles table exists in your Supabase database
// Run this with: node check-database.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.log('Required variables:');
  console.log('- VITE_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('🔍 Checking database structure...');
  
  try {
    // Check if profiles table exists
    const { data: profilesCheck, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      if (profilesError.code === '42P01') {
        console.log('❌ Profiles table does NOT exist');
        console.log('\n📋 Next steps:');
        console.log('1. Open your Supabase Dashboard');
        console.log('2. Go to SQL Editor');
        console.log('3. Copy and paste the entire combined-migrations.sql file');
        console.log('4. Run the script');
        console.log('\nThis will create the profiles table and fix your credit/name display issues.');
        return;
      } else {
        console.error('❌ Error checking profiles table:', profilesError.message);
        return;
      }
    }
    
    console.log('✅ Profiles table exists');
    
    // Check if current user has a profile
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('ℹ️  No authenticated user found');
      console.log('   This is normal if you\'re not logged in');
    } else {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.log('❌ User profile not found for current user');
        console.log('   Try logging out and logging back in to create a profile');
      } else {
        console.log('✅ User profile found:');
        console.log(`   Name: ${profile.full_name || 'Not set'}`);
        console.log(`   Email: ${profile.email}`);
        console.log(`   Credits (Find): ${profile.credits_find}`);
        console.log(`   Credits (Verify): ${profile.credits_verify}`);
        console.log(`   Plan: ${profile.plan}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkDatabase();