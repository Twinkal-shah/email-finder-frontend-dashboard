import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProfileAccess() {
  console.log('🔍 Testing profile access after RLS fix...');
  
  try {
    // Test 1: Check if we can get current user
    console.log('\n1️⃣ Testing authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Auth error:', authError.message);
      return;
    }
    
    if (!user) {
      console.log('❌ No authenticated user found');
      console.log('💡 Try logging in first');
      return;
    }
    
    console.log('✅ User authenticated:', user.email);
    console.log('   User ID:', user.id);
    
    // Test 2: Try to fetch profile with authenticated user
    console.log('\n2️⃣ Testing profile fetch...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.log('❌ Profile fetch error:', profileError.message);
      console.log('   Error code:', profileError.code);
      console.log('   Error details:', profileError.details);
      
      // Test 3: Check if profile exists at all
      console.log('\n3️⃣ Checking if profile exists...');
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('id, email')
        .limit(5);
      
      if (allError) {
        console.log('❌ Cannot query profiles table:', allError.message);
      } else {
        console.log('✅ Profiles table accessible, found', allProfiles?.length || 0, 'profiles');
        const userProfile = allProfiles?.find(p => p.id === user.id);
        if (userProfile) {
          console.log('✅ Your profile exists in the table');
        } else {
          console.log('❌ Your profile is missing from the table');
        }
      }
      
      return;
    }
    
    console.log('✅ Profile fetched successfully!');
    console.log('   Full name:', profile.full_name);
    console.log('   Credits find:', profile.credits_find);
    console.log('   Credits verify:', profile.credits_verify);
    console.log('   Plan:', profile.plan);
    
    // Test 4: Test real-time subscription
    console.log('\n4️⃣ Testing real-time subscription...');
    const channel = supabase
      .channel('profile-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        console.log('📡 Real-time update received:', payload);
      })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription working');
          // Clean up after 2 seconds
          setTimeout(() => {
            channel.unsubscribe();
            console.log('🔌 Unsubscribed from real-time updates');
          }, 2000);
        }
      });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Test 5: Check RLS policies
async function checkRLSPolicies() {
  console.log('\n5️⃣ Checking RLS policies...');
  
  try {
    const { data, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'profiles');
    
    if (error) {
      console.log('⚠️  Cannot check policies (this is normal):', error.message);
    } else {
      console.log('✅ Found', data?.length || 0, 'RLS policies for profiles table');
      data?.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd}`);
      });
    }
  } catch (error) {
    console.log('⚠️  Cannot check policies:', error.message);
  }
}

// Run tests
testProfileAccess()
  .then(() => checkRLSPolicies())
  .then(() => {
    console.log('\n🎯 Test completed!');
    console.log('\n💡 Next steps if still having issues:');
    console.log('   1. Clear browser cache and cookies');
    console.log('   2. Log out completely and log back in');
    console.log('   3. Check browser console for any JavaScript errors');
    console.log('   4. Verify the application is using the correct Supabase keys');
  })
  .catch(console.error);