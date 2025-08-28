# Fix Missing User Profile

## Problem
Your account exists in authentication but no profile was created in the database. This causes:
- "Failed to load billing information" error
- "Insufficient credits for email finding" error
- Credits showing as 0

## Quick Solution

### Step 1: Get Your Supabase Service Role Key

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: `wbcfsffssphgvpnbrvve`
3. Go to **Settings** → **API**
4. Copy the **service_role** key (NOT the anon key)

### Step 2: Add the Key to Your Environment

1. Open your `.env` file in the project root
2. Add this line at the end:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
   Replace `your_service_role_key_here` with the actual service role key

### Step 3: Run the Profile Creation Script

```bash
node create-user-profile.js
```

This will:
- Find users without profiles
- Create missing profiles with:
  - 25 email finding credits
  - 25 email verification credits
  - Free plan (7-day trial)

### Step 4: Verify the Fix

1. **Refresh your browser**
2. **Go to the Billing page** - should show your credits
3. **Try searching for emails** - should work now

## Alternative: Manual Profile Creation

If you prefer to create the profile manually:

1. Go to **Supabase Dashboard** → **Table Editor** → **profiles**
2. Click **Insert** → **Insert row**
3. Fill in:
   - `id`: Your user ID from the auth.users table
   - `email`: `twinkelshah78@gmail.com`
   - `full_name`: Your display name
   - `plan`: `free`
   - `credits_find`: `25`
   - `credits_verify`: `25`
   - `plan_expiry`: Set to 7 days from now
4. Click **Save**

## Security Note

⚠️ **Important**: The service role key has admin privileges. 
- Keep it secure
- Don't commit it to version control
- Add `.env` to your `.gitignore` file

## Expected Result

After completing these steps:
- ✅ Billing page loads successfully
- ✅ Credits show: Find: 25, Verify: 25
- ✅ Email searches work
- ✅ Plan shows as "Free"