# Fix for Profile Display Issue

## Problem Summary
Your application is showing:
- **0 credits** instead of 25 Find + 25 Verify credits
- **Email address** instead of full name "Twinkal shah"
- **Billing page errors**

## Root Cause Identified ✅
The issue is **Row Level Security (RLS)** on the `profiles` table. Your profile exists with correct data, but the application cannot access it because:

1. ✅ **Profile exists** with correct data (verified with service role)
2. ❌ **RLS policies missing** - users cannot read their own profiles
3. ❌ **Application uses anon key** which is subject to RLS restrictions

## Quick Fix (Recommended)

### Step 1: Apply RLS Policies in Supabase Dashboard

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste this SQL script:

```sql
-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create policies to allow users to access their own profiles
CREATE POLICY "Users can view own profile" ON profiles 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles 
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
```

4. Click **"Run"** to execute the script
5. You should see success messages for each statement

### Step 2: Test the Fix

1. **Refresh your application** (hard refresh: Cmd+Shift+R)
2. **Log out and log back in** to get a fresh session
3. Check if:
   - Credits now show **25 Find, 25 Verify**
   - Name shows **"Twinkal shah"** instead of email
   - Billing page loads without errors

## Verification

After applying the fix, your application should display:
- **Header**: "Twinkal shah" with "Find: 25, Verify: 25, Free"
- **Billing Page**: Shows correct credit balances and plan information

## Technical Details

### What Was Wrong
- The `profiles` table had RLS enabled but no policies
- This meant authenticated users couldn't read their own profile data
- The `useRealTimeCredits` hook was failing silently
- The `BillingPage` component couldn't load user profile

### What the Fix Does
- Creates RLS policies that allow users to read/update their own profiles
- Uses `auth.uid() = id` to ensure users can only access their own data
- Grants proper permissions to authenticated users

### Files Involved
- `useRealTimeCredits.js` - Fetches profile data for header display
- `BillingPage.jsx` - Loads profile for billing information
- `user.js` - Contains `getUserProfile()` function
- `auth.jsx` - Manages user authentication

## Alternative Solutions (If Quick Fix Doesn't Work)

### Option 1: Recreate Profile
If the RLS fix doesn't work, you can recreate your profile:

1. Delete existing profile in Supabase Dashboard
2. Log out and log back in
3. The `handle_new_user()` trigger should create a new profile

### Option 2: Manual Profile Update
Update your profile directly in Supabase:

1. Go to **Table Editor** → **profiles**
2. Find your profile (ID: `720aa72d-9d8c-42cf-b44a-30273675d149`)
3. Ensure these values:
   - `full_name`: "Twinkal shah"
   - `credits_find`: 25
   - `credits_verify`: 25
   - `plan`: "free"

## Prevention

To prevent this issue in the future:
1. Always create RLS policies when enabling RLS on tables
2. Test with both service role and anon keys during development
3. Include RLS policies in your migration scripts

---

**Need Help?** If this fix doesn't resolve the issue, check the browser console for any JavaScript errors and verify that the RLS policies were created successfully in your Supabase dashboard.