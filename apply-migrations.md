# Apply Database Migrations

The credits are showing 0 and the name is showing email because the new `profiles` table hasn't been created in your Supabase database yet. The migration files exist locally but need to be applied to your remote database.

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to the **SQL Editor** tab
4. Copy and paste the contents of each migration file in order:

### Step 1: Create Profiles Table
Copy the entire content from `supabase/migrations/001_create_profiles_table.sql` and run it in the SQL Editor.

### Step 2: Create Transactions Table
Copy the entire content from `supabase/migrations/002_create_transactions_table.sql` and run it in the SQL Editor.

## Option 2: Using Supabase CLI

If you have the Supabase CLI set up:

```bash
# Link your project (you'll need your project reference)
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations to remote database
supabase db push
```

## What This Will Fix

1. **Credits showing 0**: The app will be able to fetch actual credit data from the `profiles` table
2. **Name showing email**: The app will display the `full_name` from the `profiles` table instead of falling back to email
3. **Real-time updates**: Credit changes will update in real-time across the app

## After Applying Migrations

1. Refresh your browser
2. The app should now show proper credit counts and user names
3. If you're a new user, you'll automatically get 25 credits for both find and verify operations

## Troubleshooting

If you still see issues after applying migrations:

1. Check the browser console for any errors
2. Verify that the `profiles` table was created successfully in your Supabase dashboard
3. Make sure your user has a profile record (it should be created automatically when you sign up)