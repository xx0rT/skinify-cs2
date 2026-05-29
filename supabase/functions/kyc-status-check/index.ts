import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    // Get user's KYC status from database
    const { data: userStatus } = await supabase
      .from('users')
      .select('kyc_status, kyc_completed_at, kyc_expires_at, kyc_required, kyc_required_reason, aml_risk_score')
      .eq('id', user.id)
      .single();

    // Get latest verification record
    const { data: verification } = await supabase
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Check for active restrictions
    const { data: restrictions } = await supabase
      .from('kyc_restrictions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Check if KYC is expired
    let isExpired = false;
    if (userStatus?.kyc_expires_at) {
      const expiryDate = new Date(userStatus.kyc_expires_at);
      isExpired = expiryDate < new Date();

      // Auto-expire if needed
      if (isExpired && userStatus.kyc_status === 'approved') {
        await supabase
          .from('users')
          .update({ kyc_status: 'expired' })
          .eq('id', user.id);

        if (verification) {
          await supabase
            .from('kyc_verifications')
            .update({ verification_status: 'expired' })
            .eq('id', verification.id);
        }

        // Add expiry restriction
        await supabase
          .from('kyc_restrictions')
          .insert({
            user_id: user.id,
            restriction_type: 'all_blocked',
            reason: 'kyc_expired',
            details: 'KYC verification has expired. Please renew.',
            is_active: true,
          });

        // Log audit event
        await supabase
          .from('kyc_audit_log')
          .insert({
            user_id: user.id,
            kyc_verification_id: verification?.id,
            event_type: 'verification_expired',
            event_description: 'KYC verification expired and requires renewal',
            old_status: 'approved',
            new_status: 'expired',
            performed_by_role: 'system',
          });
      }
    }

    // Calculate days until expiry
    let daysUntilExpiry = null;
    if (userStatus?.kyc_expires_at && !isExpired) {
      const expiryDate = new Date(userStatus.kyc_expires_at);
      const now = new Date();
      const diffTime = expiryDate.getTime() - now.getTime();
      daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Determine if user has valid KYC
    const hasValidKYC = userStatus?.kyc_status === 'approved' && !isExpired;

    return new Response(
      JSON.stringify({
        kycStatus: isExpired ? 'expired' : userStatus?.kyc_status || 'not_started',
        hasValidKYC,
        isExpired,
        daysUntilExpiry,
        kycRequired: userStatus?.kyc_required || false,
        kycRequiredReason: userStatus?.kyc_required_reason,
        completedAt: userStatus?.kyc_completed_at,
        expiresAt: userStatus?.kyc_expires_at,
        riskScore: userStatus?.aml_risk_score || 0,
        verification: verification ? {
          id: verification.id,
          status: isExpired ? 'expired' : verification.verification_status,
          level: verification.verification_level,
          submittedAt: verification.submitted_at,
          reviewedAt: verification.reviewed_at,
          rejectionReasons: verification.rejection_reasons,
          amlStatus: verification.aml_screening_status,
          pepStatus: verification.pep_status,
          sanctionsMatch: verification.sanctions_match,
        } : null,
        restrictions: restrictions?.map(r => ({
          type: r.restriction_type,
          reason: r.reason,
          details: r.details,
        })) || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in kyc-status-check:', error);
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
