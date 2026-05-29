import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader, AlertCircle } from 'lucide-react';

type AuthStatus = 'loading' | 'success' | 'error';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const handleAuth = async () => {
      try {
        setStatus('loading');
        
        // Check if we have the required OpenID parameters
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('openid.mode');
        
        console.log('=== AUTH DEBUG START ===');
        console.log('Current URL:', window.location.href);
        console.log('OpenID Mode:', mode);
        console.log('All URL params:', Object.fromEntries(params.entries()));
        
        if (!mode) {
          throw new Error('No authentication data received');
        }

        if (mode === 'cancel') {
          throw new Error('Steam authentication was cancelled');
        }

        if (mode !== 'id_res') {
          throw new Error('Invalid authentication response from Steam');
        }

        // Get the Steam ID from the callback URL
        const claimedId = params.get('openid.claimed_id');
        if (!claimedId) {
          throw new Error('Steam ID not found in response');
        }
        
        console.log('Claimed ID:', claimedId);

        // Extract Steam ID from claimed_id
        const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
        const steamId = steamIdMatch ? steamIdMatch[1] : null;
        console.log('Extracted Steam ID:', steamId);
        
        if (!steamId) {
          throw new Error('Could not extract Steam ID from claimed_id');
        }

        // Get environment variables
        const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

        console.log('Environment check:', {
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey,
          supabaseUrl: supabaseUrl || 'NOT SET',
          actualSupabaseKey: supabaseKey ? 'SET (hidden)' : 'NOT SET',
          keyPreview: supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT SET'
        });

        const finalSupabaseUrl = supabaseUrl;
        const finalSupabaseKey = supabaseKey;
        
        if (!finalSupabaseUrl || !finalSupabaseKey) {
          console.error('Supabase environment check:', {
            hasUrl: !!supabaseUrl,
            hasKey: !!finalSupabaseKey,
            finalUrl: finalSupabaseUrl
          });
          throw new Error(`Supabase configuration missing. URL: ${!!finalSupabaseUrl}, Key: ${!!finalSupabaseKey}`);
        }

        // Call our edge function with the authentication data
        const authUrl = `${finalSupabaseUrl}/functions/v1/auth${window.location.search}`;
        console.log('Calling auth endpoint:', authUrl);
        setDebugInfo(`Calling: ${authUrl}`);
        
        // Try calling the edge function - first without auth header to test if function exists
        let response;
        try {
          response = await fetch(authUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${finalSupabaseKey}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(30000), // 30 second timeout
          });
        } catch (fetchError) {
          console.error('Network error during auth:', fetchError);
          throw new Error(`Network error: ${fetchError.message}. Please check if the edge function is deployed to Supabase.`);
        }

        if (!response.ok) {
          // Try to get error details
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            // If we can't parse JSON, get the text response
            try {
              const errorText = await response.text();
              errorData = { error: errorText };
            } catch (e2) {
              errorData = { error: 'Unknown error' };
            }
          }
          console.error('Auth response error:', {
            status: response.status,
            statusText: response.statusText,
            errorData,
            url: authUrl
          });
          setDebugInfo(`HTTP ${response.status}: ${response.statusText} - ${JSON.stringify(errorData)}`);
          throw new Error(errorData.error || `Authentication failed (${response.status}): ${response.statusText}`);
        }

        const userData = await response.json();
        
        if (userData.error) {
          console.error('Auth response contained error:', userData);
          throw new Error(userData.error);
        }
        
        console.log('=== AUTH DEBUG END ===');

        console.log('Authentication successful:', userData);
        
        if (userData.usedFallback) {
          console.warn('Steam API was not available, using fallback user data');
        }

        // Store user data in auth store
        setUser({
          id: userData.id,
          steamId: userData.steamId,
          displayName: userData.displayName,
          avatarUrl: userData.avatarUrl,
          tradeLink: userData.tradeLink || null,
          referred_by: userData.referred_by,
          referral_code: userData.referral_code
        });

        setStatus('success');

        // Redirect to home page after a short delay
        setTimeout(() => {
          try {
           // Only show trade setup for NEW users without trade link
           if (userData.isNewUser && !userData.tradeLink) {
              // Redirect to home with flag to show trade setup modal
              navigate('/?setup_trade_link=true', { replace: true });
            } else {
              navigate('/', { replace: true });
            }
          } catch (navError) {
            console.error('Navigation error, fallback to window.location:', navError);
           window.location.href = (userData.isNewUser && !userData.tradeLink) ? '/?setup_trade_link=true' : '/';
          }
        }, 2000);

      } catch (error) {
        console.error('=== AUTH ERROR ===', error);
        setError(error instanceof Error ? error.message : 'Unknown authentication error');
        setDebugInfo(error instanceof Error ? error.stack || error.message : 'Unknown error');
        setStatus('error');
        
        // Auto-redirect to home after showing error
        setTimeout(() => {
          try {
            navigate('/?auth_error=true', { replace: true });
          } catch (navError) {
            console.error('Navigation error, fallback to window.location:', navError);
            window.location.href = '/?auth_error=true';
          }
        }, 5000);
      }
    };

    handleAuth();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="text-center max-w-md mx-auto p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {status === 'loading' && (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mx-auto mb-6"
              >
                <Loader className="w-16 h-16 text-blue-500" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Authenticating with Steam...
              </h2>
              <p className="text-gray-400">
                Please wait while we verify your Steam account
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Authentication Successful!
              </h2>
              <p className="text-gray-400">
                Welcome to CSMarket. Redirecting you now...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Authentication Failed
              </h2>
              <p className="text-gray-400 mb-6">
                {error || 'Something went wrong during authentication'}
              </p>
              
              {debugInfo && (
                <div className="bg-gray-800/50 p-4 rounded-lg mb-6 text-left">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Debug Information:
                  </h3>
                  <pre className="text-xs text-gray-400 overflow-auto max-h-32">
                    {debugInfo}
                  </pre>
                </div>
              )}
              
              <motion.button
                onClick={() => navigate('/')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition-all duration-300"
              >
                Return Home
              </motion.button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}