# Fix Credits and Name Display Issue

## Problem
Your application is showing:
- Email address instead of full name
- Credits showing as 0

## Root Cause
The `profiles` table exists, but your user account doesn't have a profile record yet. This happens when:
1. The migration was applied after you already had a user account
2. The trigger that creates profiles for new users only works for NEW signups

## Solution Options

### Option 1: Log Out and Log Back In (Recommended)
1. **Log out** of your application completely
2. **Log back in** with the same credentials
3. The `handle_new_user()` trigger should create your profile automatically
4. Refresh the page to see updated credits and name

### Option 2: Manual Profile Creation (If Option 1 doesn't work)
1. Go to your **Supabase Dashboard**
2. Navigate to **Table Editor** → **profiles**
3. Click **Insert** → **Insert row**
4. Fill in the following fields:
   - `id`: Copy your user ID from the `auth.users` table
   - `email`: Your email address
   - `full_name`: Your desired display name
   - `plan`: `free`
   - `credits_find`: `25`
   - `credits_verify`: `25`
   - `plan_expiry`: Set to 3 days from now
5. Click **Save**

### Option 3: Update Existing Profile (If profile exists but has wrong data)
1. Go to **Supabase Dashboard** → **Table Editor** → **profiles**
2. Find your profile row (match by email)
3. Update the fields:
   - `full_name`: Set your desired display name
   - `credits_find`: Set to `25` (or desired amount)
   - `credits_verify`: Set to `25` (or desired amount)
4. Click **Save**

## Verification
After applying any solution:
1. Refresh your application
2. Check that:
   - Your name appears instead of email
   - Credits show the correct values (25 for find, 25 for verify)

## If Issues Persist
1. Check browser console for errors
2. Verify the `profiles` table has the correct structure
3. Ensure RLS policies are properly configured
4. Try clearing browser cache and cookies

## Database Structure Check
You can run `node check-database.js` to verify your database structure and profile status.