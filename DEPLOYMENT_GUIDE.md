# Deployment Guide - Environment Variables Setup

## Problem
When deploying to Netlify (or any hosting platform), you're getting the error:
```
Uncaught Error: Missing Supabase credentials. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.
```

This happens because the `.env` file is not committed to GitHub (it's in `.gitignore` for security reasons).

## Solution

### Option 1: Netlify Dashboard (Recommended)

1. **Go to your Netlify site dashboard**
   - Log in to [Netlify](https://app.netlify.com)
   - Select your site

2. **Navigate to Environment Variables**
   - Click on "Site settings"
   - Click on "Environment variables" in the left sidebar (or "Build & deploy" → "Environment variables")

3. **Add the following environment variables:**

   Click "Add a variable" for each:

   - **Variable 1:**
     - Key: `VITE_SUPABASE_URL`
     - Value: `<your-supabase-project-url>` (from your .env file)

   - **Variable 2:**
     - Key: `VITE_SUPABASE_ANON_KEY`
     - Value: `<your-supabase-anon-key>` (from your .env file)

   - **Variable 3:** (Optional - for push notifications)
     - Key: `VITE_VAPID_PUBLIC_KEY`
     - Value: `<your-vapid-public-key>` (from your .env file)

4. **Trigger a new deploy**
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Deploy site"
   - Or simply push a new commit to your GitHub repository

### Option 2: Netlify CLI

If you have Netlify CLI installed:

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link your local project to your Netlify site
netlify link

# Set environment variables (replace with your actual values from .env)
netlify env:set VITE_SUPABASE_URL "<your-supabase-url>"
netlify env:set VITE_SUPABASE_ANON_KEY "<your-supabase-anon-key>"
netlify env:set VITE_VAPID_PUBLIC_KEY "<your-vapid-public-key>"

# Trigger a new build
netlify deploy --prod
```

### Option 3: netlify.toml (Not Recommended for Sensitive Data)

While you can add environment variables to `netlify.toml`, this is **NOT recommended** for sensitive keys because the file is committed to your repository.

## Verification

After setting the environment variables and deploying:

1. **Check the build logs** in Netlify:
   - Look for the message: `🔧 [SUPABASE] Initializing client`
   - It should show that the URL and anon key are present

2. **Test the deployed site**:
   - Open your site URL
   - Open the browser console (F12)
   - Look for Supabase initialization logs
   - Try to interact with features that use Supabase (login, marketplace, etc.)

## Important Notes

- **Environment variables must start with `VITE_`** to be exposed to the client-side code
- After adding/changing environment variables, you **must rebuild** your site
- The Supabase anon key is safe to expose on the client side (it's meant to be public)
- Never commit the `.env` file to your repository
- Each deployment platform has its own way of setting environment variables

## Other Deployment Platforms

### Vercel
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the same variables as above
4. Redeploy

### GitHub Pages (with Actions)
Add secrets to your repository:
1. Go to Settings → Secrets and variables → Actions
2. Add repository secrets with the same names
3. Reference them in your GitHub Actions workflow

### Cloudflare Pages
1. Go to your project settings
2. Navigate to "Environment variables"
3. Add the variables for both "Production" and "Preview" environments

## Troubleshooting

### Still getting the error after adding variables?

1. **Clear the build cache**:
   - In Netlify: Site settings → Build & deploy → Clear cache and deploy

2. **Verify variable names**:
   - Make sure they're exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Case-sensitive!

3. **Check the build logs**:
   - Look for environment variable confirmation
   - Check if the build command is `npm run build`

4. **Try a manual trigger**:
   - Delete the current deployment
   - Trigger a fresh deploy from the main branch

## Need Help?

If you're still having issues, check:
1. Build logs for specific error messages
2. Browser console for runtime errors
3. Netlify support documentation
