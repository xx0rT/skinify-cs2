import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CheckKYCRequest {
  action: 'deposit' | 'listing' | 'withdrawal';
  amount?: number; // in EUR
  cumulativeCheck?: boolean;
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

    // Parse request
    const requestData: CheckKYCRequest = await req.json();

    // Get system settings for thresholds
    const { data: settings } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', [
        'kyc_enabled',
        'kyc_deposit_threshold',
        'kyc_listing_threshold',
        'kyc_cumulative_threshold',
        'kyc_mandatory_regions',
      ]);

    const settingsMap = new Map(settings?.map(s => [s.key, s.value]) || []);

    // Check if KYC is globally enabled
    const kycEnabled = settingsMap.get('kyc_enabled') === 'true';
    if (!kycEnabled) {
      return new Response(
        JSON.stringify({
          required: false,
          reason: 'KYC system is not enabled',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user data
    const { data: userProfile } = await supabase
      .from('users')
      .select('kyc_status, kyc_expires_at, total_deposits, total_listing_value, country_code')
      .eq('id', user.id)
      .single();

    // Check if user already has valid KYC
    const hasValidKYC = userProfile?.kyc_status === 'approved' &&
      (!userProfile.kyc_expires_at || new Date(userProfile.kyc_expires_at) > new Date());

    if (hasValidKYC) {
      return new Response(
        JSON.stringify({
          required: false,
          hasValidKYC: true,
          reason: 'User has valid KYC verification',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse thresholds
    const depositThreshold = parseFloat(settingsMap.get('kyc_deposit_threshold') || '1000');
    const listingThreshold = parseFloat(settingsMap.get('kyc_listing_threshold') || '500');
    const cumulativeThreshold = parseFloat(settingsMap.get('kyc_cumulative_threshold') || '5000');

    let required = false;
    let reason = '';
    let thresholdExceeded = 0;

    // Check based on action type
    switch (requestData.action) {
      case 'deposit':
        if (requestData.amount && requestData.amount >= depositThreshold) {
          required = true;
          reason = 'deposit_threshold';
          thresholdExceeded = requestData.amount;
        }
        break;

      case 'listing':
        if (requestData.amount && requestData.amount >= listingThreshold) {
          required = true;
          reason = 'listing_threshold';
          thresholdExceeded = requestData.amount;
        }
        break;

      case 'withdrawal':
        // Withdrawals always require KYC for AML compliance
        required = true;
        reason = 'withdrawal_aml_requirement';
        break;
    }

    // Check cumulative transactions (last 12 months)
    if (requestData.cumulativeCheck && !required) {
      const totalDeposits = userProfile?.total_deposits || 0;
      const totalListings = userProfile?.total_listing_value || 0;
      const totalVolume = totalDeposits + totalListings + (requestData.amount || 0);

      if (totalVolume >= cumulativeThreshold) {
        required = true;
        reason = 'cumulative_threshold';
        thresholdExceeded = totalVolume;
      }
    }

    // Check mandatory regions
    const mandatoryRegions = JSON.parse(settingsMap.get('kyc_mandatory_regions') || '[]');
    if (!required && mandatoryRegions.includes(userProfile?.country_code)) {
      required = true;
      reason = 'mandatory_region';
    }

    // If KYC is required, add restriction and update user
    if (required && !userProfile?.kyc_required) {
      await supabase
        .from('users')
        .update({
          kyc_required: true,
          kyc_required_reason: reason,
        })
        .eq('id', user.id);

      // Add restriction based on action
      const restrictionType = requestData.action === 'deposit' ? 'deposit_blocked' :
                             requestData.action === 'listing' ? 'listing_blocked' :
                             'withdrawal_blocked';

      await supabase
        .from('kyc_restrictions')
        .insert({
          user_id: user.id,
          restriction_type: restrictionType,
          reason: 'kyc_required',
          details: `KYC required due to: ${reason}`,
          threshold_exceeded: thresholdExceeded,
          is_active: true,
        });

      // Log audit event
      await supabase
        .from('kyc_audit_log')
        .insert({
          user_id: user.id,
          event_type: 'threshold_exceeded',
          event_description: `KYC requirement triggered: ${reason}`,
          performed_by_role: 'system',
          metadata: {
            action: requestData.action,
            amount: requestData.amount,
            threshold_exceeded: thresholdExceeded,
            reason,
          },
        });
    }

    return new Response(
      JSON.stringify({
        required,
        reason,
        hasValidKYC,
        thresholds: {
          deposit: depositThreshold,
          listing: listingThreshold,
          cumulative: cumulativeThreshold,
        },
        currentTotals: {
          deposits: userProfile?.total_deposits || 0,
          listings: userProfile?.total_listing_value || 0,
        },
        thresholdExceeded,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in kyc-required-check:', error);
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
