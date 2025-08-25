# Production Deployment Guide

## Issue Fixed
The blank page issue on app.mailsfinder.com was caused by missing Supabase environment variables in the production build.

## Changes Made

### 1. Updated `.env.production`
Added missing Supabase environment variables:
```
VITE_API_BASE=/api
VITE_SUPABASE_URL=https://wbcfsffssphgvpnbrvve.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Enhanced Error Handling
Added better error handling in `src/services/supabase.js`:
- Environment variable validation
- URL format validation
- Debug logging for troubleshooting

## Deployment Steps

### For Vercel Deployment:

1. **Set Environment Variables in Vercel Dashboard:**
   - Go to your Vercel project settings
   - Navigate to Environment Variables
   - Add the following variables:
     ```
     VITE_API_BASE=/api
     VITE_SUPABASE_URL=https://wbcfsffssphgvpnbrvve.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiY2ZzZmZzc3BoZ3ZwbmJydnZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzM3NTQsImV4cCI6MjA3MDc0OTc1NH0.3GV4dQm0Aqm8kbNzPJYOCFLnvhyNqxCJCtwfmUAw29Y
     ```

2. **Trigger a New Deployment:**
   - Push changes to GitHub (already done)
   - Or manually trigger deployment in Vercel dashboard

3. **Verify Deployment:**
   - Check browser console for environment variable logs
   - Ensure no "Failed to construct URL" errors

### Alternative Deployment Methods:

If using other hosting platforms, ensure:
1. Environment variables are properly set
2. Build command: `npm run build`
3. Output directory: `dist`
4. Node.js version: 18+ recommended

## Troubleshooting

### If blank page persists:
1. Check browser console for errors
2. Verify environment variables are loaded (check console logs)
3. Ensure Supabase URL is accessible
4. Check network tab for failed requests

### Common Issues:
- **Missing env vars**: Check Vercel environment variables
- **CORS errors**: Verify Supabase project settings
- **Network errors**: Check API endpoint accessibility

## Files Modified:
- `.env.production` - Added Supabase environment variables
- `src/services/supabase.js` - Enhanced error handling and validation
- Built and pushed to GitHub

## Next Steps:
1. Configure environment variables in your hosting platform
2. Trigger a new deployment
3. Test the production site
4. Monitor for any remaining issues