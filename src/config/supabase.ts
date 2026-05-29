/**
 * Supabase Configuration
 * Centralized configuration for Supabase credentials
 * IMPORTANT: Environment variables must be set in your deployment platform
 *
 * For deployment:
 * 1. Go to your hosting platform (Netlify/Vercel/etc)
 * 2. Navigate to Environment Variables settings
 * 3. Add these variables:
 *    - VITE_SUPABASE_URL
 *    - VITE_SUPABASE_ANON_KEY
 */

export const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  console.log('🔍 [SUPABASE CONFIG] Environment check:', {
    hasUrl: !!url,
    hasAnonKey: !!anonKey,
    mode: import.meta.env.MODE,
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD
  });

  if (!url || !anonKey) {
    const errorMsg = `❌ Missing Supabase credentials!

For local development:
  Create a .env file with:
  VITE_SUPABASE_URL=your_url
  VITE_SUPABASE_ANON_KEY=your_key

For deployment:
  Set environment variables in your hosting platform:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY

Current status:
  URL: ${url ? '✓ Set' : '✗ Missing'}
  Key: ${anonKey ? '✓ Set' : '✗ Missing'}`;

    console.error(errorMsg);
    throw new Error(
      'Missing Supabase credentials. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
    );
  }

  return {
    url,
    anonKey
  };
};

// Export individual values for convenience
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validation check
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ Supabase credentials are not configured properly!');
}
