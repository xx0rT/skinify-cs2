import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GDPRRequestBody {
  requestType: 'access' | 'rectification' | 'erasure' | 'restriction' | 'portability' | 'objection';
  description?: string;
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

    // Handle GET - List user's GDPR requests
    if (req.method === 'GET') {
      const { data: requests, error: requestsError } = await supabase
        .from('gdpr_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (requestsError) {
        throw requestsError;
      }

      return new Response(
        JSON.stringify({
          requests: requests || [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle POST - Create new GDPR request
    if (req.method === 'POST') {
      const requestData: GDPRRequestBody = await req.json();

      // Validate request type
      const validTypes = ['access', 'rectification', 'erasure', 'restriction', 'portability', 'objection'];
      if (!requestData.requestType || !validTypes.includes(requestData.requestType)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid request type',
            validTypes,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check for existing pending request of the same type
      const { data: existingRequest } = await supabase
        .from('gdpr_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('request_type', requestData.requestType)
        .in('status', ['pending', 'processing'])
        .single();

      if (existingRequest) {
        return new Response(
          JSON.stringify({
            error: `You already have a ${requestData.requestType} request in progress`,
            existingRequest,
          }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Create GDPR request
      const { data: newRequest, error: createError } = await supabase
        .from('gdpr_requests')
        .insert({
          user_id: user.id,
          request_type: requestData.requestType,
          description: requestData.description || null,
          status: 'pending',
          requested_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Log audit event
      await supabase
        .from('kyc_audit_log')
        .insert({
          user_id: user.id,
          event_type: 'gdpr_request_created',
          event_description: `GDPR ${requestData.requestType} request created`,
          performed_by: user.id,
          performed_by_role: 'user',
          metadata: {
            request_type: requestData.requestType,
            request_id: newRequest.id,
          },
        });

      // Handle immediate actions for certain request types
      if (requestData.requestType === 'access') {
        // For access requests, immediately gather user data
        const userData = await gatherUserData(supabase, user.id);

        // Update request with data
        await supabase
          .from('gdpr_requests')
          .update({
            requested_data: userData,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', newRequest.id);

        return new Response(
          JSON.stringify({
            success: true,
            request: {
              ...newRequest,
              status: 'completed',
              requested_data: userData,
            },
            message: 'Your data has been compiled and is ready for download',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          request: newRequest,
          message: `Your ${requestData.requestType} request has been submitted and will be processed within 30 days`,
          estimatedCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in gdpr-request:', error);
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

// Helper function to gather all user data for access requests
async function gatherUserData(supabase: any, userId: string): Promise<any> {
  try {
    // Gather data from all relevant tables
    const [
      { data: userProfile },
      { data: kycVerifications },
      { data: kycDocuments },
      { data: transactions },
      { data: orders },
      { data: listings },
      { data: restrictions },
      { data: notifications },
    ] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('kyc_verifications').select('*').eq('user_id', userId),
      supabase.from('kyc_documents').select('*').eq('user_id', userId),
      supabase.from('balance_transactions').select('*').eq('user_id', userId),
      supabase.from('orders').select('*').eq('buyer_id', userId),
      supabase.from('marketplace_listings').select('*').eq('user_id', userId),
      supabase.from('kyc_restrictions').select('*').eq('user_id', userId),
      supabase.from('notifications').select('*').eq('user_id', userId),
    ]);

    return {
      profile: userProfile,
      kyc: {
        verifications: kycVerifications || [],
        documents: kycDocuments?.map(doc => ({
          ...doc,
          document_number: '[REDACTED]', // Never expose full document numbers
        })) || [],
      },
      financial: {
        transactions: transactions || [],
        orders: orders || [],
      },
      marketplace: {
        listings: listings || [],
      },
      restrictions: restrictions || [],
      notifications: notifications || [],
      exportDate: new Date().toISOString(),
      dataRetentionPolicy: 'Data is retained as per our privacy policy and applicable regulations',
    };
  } catch (error) {
    console.error('Error gathering user data:', error);
    throw error;
  }
}
