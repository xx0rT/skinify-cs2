/**
 * Supabase Helper Utilities
 * Standardized functions for making Supabase edge function calls
 */

import { getSupabaseConfig } from '../config/supabase';
import { supabase } from '../lib/supabaseClient';

/**
 * Get Supabase credentials with validation
 * Throws an error if credentials are missing
 */
export const getSupabaseCredentials = () => {
  try {
    const { url, anonKey } = getSupabaseConfig();

    if (!url || !anonKey) {
      throw new Error('Supabase credentials missing');
    }

    return { supabaseUrl: url, supabaseKey: anonKey };
  } catch (error) {
    console.error('Failed to get Supabase credentials:', error);
    throw error;
  }
};

/**
 * Get Supabase session for authenticated requests
 */
export const getSupabaseSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Failed to get session:', error);
    throw error;
  }
  return session;
};

/**
 * Make a request to a Supabase Edge Function
 */
export const callSupabaseFunction = async (
  functionName: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
) => {
  const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

  const url = `${supabaseUrl}/functions/v1/${functionName}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Supabase function call failed: ${response.statusText}`);
  }

  return response.json();
};
