import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config/supabase';

const { url, anonKey } = getSupabaseConfig();

console.log('🔧 [SUPABASE] Initializing client:', {
  url: url,
  hasAnonKey: !!anonKey,
  anonKeyLength: anonKey?.length,
  anonKeyPreview: anonKey ? `${anonKey.substring(0, 20)}...` : 'missing'
});

if (!url || !anonKey) {
  console.error('❌ [SUPABASE] Missing credentials!', { url, anonKey });
  throw new Error('Supabase credentials not found. Check your .env file.');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});

console.log('✅ [SUPABASE] Client created successfully');
