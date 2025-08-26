-- Migration to ensure profiles table has correct RLS policies
-- This migration assumes the profiles table already exists

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;

-- Enable Row Level Security on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own data
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Create policy for users to update their own data
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create policy for users to insert their own profile (for new signups)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policy for service role to manage all profiles (for admin operations and webhooks)
CREATE POLICY "Service role can manage profiles" ON profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Ensure transactions table references profiles correctly
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can manage transactions" ON transactions;

-- Enable Row Level Security on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy for service role to insert/update transactions (for webhooks)
CREATE POLICY "Service role can manage transactions" ON transactions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
