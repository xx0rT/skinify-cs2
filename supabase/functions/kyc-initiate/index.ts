import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface InitiateKYCRequest {
  verificationLevel?: 'basic' | 'enhanced';
  verificationType?: 'individual' | 'business';
  gdprConsent: boolean;
  privacyPolicyVersion?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Sumsub API credentials from environment
    const sumsubAppToken = Deno.env.get('SUMSUB_APP_TOKEN');
    const sumsubSecretKey = Deno.env.get('SUMSUB_SECRET_KEY');
    const sumsubApiUrl = Deno.env.get('SUMSUB_API_URL') || 'https://api.sumsub.com';

    if (!sumsubAppToken || !sumsubSecretKey) {
      console.error('Missing Sumsub credentials');
      return new Response(
        JSON.stringify({
          error: 'KYC service not configured. Please contact support.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const requestData: InitiateKYCRequest = await req.json();

    // Validate GDPR consent
    if (!requestData.gdprConsent) {
      return new Response(
        JSON.stringify({
          error: 'GDPR consent is required to proceed with verification',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user already has an active or pending verification
    const { data: existingVerification } = await supabase
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', user.id)
      .in('verification_status', ['pending', 'approved'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingVerification) {
      // If approved and not expired, return existing data
      if (
        existingVerification.verification_status === 'approved' &&
        (!existingVerification.expires_at || new Date(existingVerification.expires_at) > new Date())
      ) {
        return new Response(
          JSON.stringify({
            message: 'You already have a valid KYC verification',
            verification: existingVerification,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // If pending, return the existing verification
      if (existingVerification.verification_status === 'pending') {
        // Generate new SDK token for the existing applicant
        const sdkToken = await generateSumsubSDKToken(
          existingVerification.sumsub_applicant_id,
          requestData.verificationLevel || 'basic',
          sumsubAppToken,
          sumsubSecretKey
        );

        return new Response(
          JSON.stringify({
            message: 'Continuing existing verification',
            verification: existingVerification,
            sdkToken,
            sumsubAppToken,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Get user details
    const { data: userProfile } = await supabase
      .from('users')
      .select('steam_id, username, email, country_code')
      .eq('id', user.id)
      .single();

    // Create applicant in Sumsub
    const externalUserId = user.id;
    const levelName = requestData.verificationLevel === 'enhanced' ? 'basic-kyc-level-enhanced' : 'basic-kyc-level';

    const applicantData = {
      externalUserId,
      info: {
        firstName: userProfile?.username || 'User',
        lastName: userProfile?.steam_id || '',
        dob: null,
        country: userProfile?.country_code || 'US',
      },
      email: userProfile?.email || '',
      phone: '',
      fixedInfo: {
        country: userProfile?.country_code || 'US',
      },
    };

    // Create Sumsub applicant
    const sumsubApplicant = await createSumsubApplicant(
      applicantData,
      levelName,
      sumsubAppToken,
      sumsubSecretKey,
      sumsubApiUrl
    );

    if (!sumsubApplicant || !sumsubApplicant.id) {
      throw new Error('Failed to create Sumsub applicant');
    }

    // Calculate expiry date (12 months from now)
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 12);

    // Get client IP and user agent
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Create verification record in database
    const { data: verification, error: verificationError } = await supabase
      .from('kyc_verifications')
      .insert({
        user_id: user.id,
        sumsub_applicant_id: sumsubApplicant.id,
        verification_status: 'pending',
        verification_level: requestData.verificationLevel || 'basic',
        verification_type: requestData.verificationType || 'individual',
        gdpr_consent_given: true,
        gdpr_consent_date: new Date().toISOString(),
        gdpr_privacy_policy_version: requestData.privacyPolicyVersion || '1.0',
        ip_address: ipAddress,
        user_agent: userAgent,
        country_code: userProfile?.country_code || null,
        expires_at: expiryDate.toISOString(),
        metadata: {
          sumsub_level: levelName,
        },
      })
      .select()
      .single();

    if (verificationError) {
      console.error('Error creating verification record:', verificationError);
      throw verificationError;
    }

    // Update user status
    await supabase
      .from('users')
      .update({
        kyc_status: 'pending',
      })
      .eq('id', user.id);

    // Add KYC restriction
    await supabase
      .from('kyc_restrictions')
      .insert({
        user_id: user.id,
        restriction_type: 'deposit_blocked',
        reason: 'kyc_pending',
        details: 'Verification in progress',
        is_active: true,
      });

    // Log audit event
    await supabase
      .from('kyc_audit_log')
      .insert({
        user_id: user.id,
        kyc_verification_id: verification.id,
        event_type: 'verification_initiated',
        event_description: `KYC verification initiated with level: ${requestData.verificationLevel || 'basic'}`,
        new_status: 'pending',
        performed_by: user.id,
        performed_by_role: 'user',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: {
          verification_level: requestData.verificationLevel || 'basic',
          verification_type: requestData.verificationType || 'individual',
        },
      });

    // Generate SDK token for frontend
    const sdkToken = await generateSumsubSDKToken(
      sumsubApplicant.id,
      requestData.verificationLevel || 'basic',
      sumsubAppToken,
      sumsubSecretKey
    );

    return new Response(
      JSON.stringify({
        success: true,
        verification,
        sdkToken,
        sumsubAppToken,
        applicantId: sumsubApplicant.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in kyc-initiate:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to create Sumsub applicant
async function createSumsubApplicant(
  applicantData: any,
  levelName: string,
  appToken: string,
  secretKey: string,
  apiUrl: string
): Promise<any> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = 'POST';
  const path = `/resources/applicants?levelName=${levelName}`;

  const signature = await generateSumsubSignature(method, path, timestamp, secretKey, applicantData);

  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Token': appToken,
      'X-App-Access-Ts': timestamp,
      'X-App-Access-Sig': signature,
    },
    body: JSON.stringify(applicantData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Sumsub API error:', errorText);
    throw new Error(`Sumsub API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Helper function to generate SDK token
async function generateSumsubSDKToken(
  applicantId: string,
  levelName: string,
  appToken: string,
  secretKey: string
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = 'POST';
  const path = `/resources/accessTokens?userId=${applicantId}&levelName=basic-kyc-level${levelName === 'enhanced' ? '-enhanced' : ''}`;

  const signature = await generateSumsubSignature(method, path, timestamp, secretKey);

  const apiUrl = Deno.env.get('SUMSUB_API_URL') || 'https://api.sumsub.com';
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: {
      'X-App-Token': appToken,
      'X-App-Access-Ts': timestamp,
      'X-App-Access-Sig': signature,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to generate SDK token: ${response.status}`);
  }

  const data = await response.json();
  return data.token;
}

// Helper function to generate Sumsub signature
async function generateSumsubSignature(
  method: string,
  path: string,
  timestamp: string,
  secretKey: string,
  body?: any
): Promise<string> {
  const bodyString = body ? JSON.stringify(body) : '';
  const message = timestamp + method.toUpperCase() + path + bodyString;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
