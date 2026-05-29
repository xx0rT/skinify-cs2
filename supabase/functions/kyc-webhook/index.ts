import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Payload-Digest',
};

interface SumsubWebhookPayload {
  applicantId: string;
  inspectionId: string;
  correlationId: string;
  externalUserId: string;
  type: string;
  reviewStatus: string;
  createdAt: string;
  reviewResult?: {
    reviewAnswer: string;
    rejectLabels?: string[];
    clientComment?: string;
    moderationComment?: string;
    reviewRejectType?: string;
  };
  applicantMemberOf?: string[];
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
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Sumsub secret key for signature verification
    const sumsubSecretKey = Deno.env.get('SUMSUB_SECRET_KEY');
    if (!sumsubSecretKey) {
      console.error('Missing Sumsub secret key');
      return new Response('Configuration error', { status: 500 });
    }

    // Verify webhook signature
    const payloadDigest = req.headers.get('X-Payload-Digest');
    if (!payloadDigest) {
      console.error('Missing X-Payload-Digest header');
      return new Response('Missing signature', { status: 401 });
    }

    // Get request body
    const rawBody = await req.text();

    // Verify signature
    const isValid = await verifyWebhookSignature(rawBody, payloadDigest, sumsubSecretKey);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response('Invalid signature', { status: 401 });
    }

    // Parse webhook payload
    const payload: SumsubWebhookPayload = JSON.parse(rawBody);
    console.log('Received Sumsub webhook:', payload.type, payload.reviewStatus);

    // Get user ID from externalUserId
    const userId = payload.externalUserId;
    if (!userId) {
      console.error('Missing externalUserId in webhook payload');
      return new Response('Invalid payload', { status: 400 });
    }

    // Get verification record
    const { data: verification, error: verificationError } = await supabase
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('sumsub_applicant_id', payload.applicantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (verificationError || !verification) {
      console.error('Verification not found:', verificationError);
      return new Response('Verification not found', { status: 404 });
    }

    // Process different webhook types
    let newStatus = verification.verification_status;
    let updateData: any = {
      sumsub_inspection_id: payload.inspectionId,
      updated_at: new Date().toISOString(),
    };

    switch (payload.type) {
      case 'applicantReviewed':
      case 'applicantWorkflowCompleted':
        if (payload.reviewStatus === 'completed') {
          if (payload.reviewResult?.reviewAnswer === 'GREEN') {
            // Approved
            newStatus = 'approved';
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 12);

            updateData = {
              ...updateData,
              verification_status: 'approved',
              approved_at: new Date().toISOString(),
              risk_score: 0,
              risk_level: 'low',
              aml_screening_status: 'clear',
              expires_at: expiryDate.toISOString(),
            };

            // Update user status
            await supabase
              .from('users')
              .update({
                kyc_status: 'approved',
                kyc_completed_at: new Date().toISOString(),
                kyc_expires_at: expiryDate.toISOString(),
                is_verified: true,
              })
              .eq('id', userId);

            // Lift restrictions
            await supabase
              .from('kyc_restrictions')
              .update({
                is_active: false,
                lifted_at: new Date().toISOString(),
                lift_reason: 'KYC verification approved',
              })
              .eq('user_id', userId)
              .eq('reason', 'kyc_pending');

            // Log audit event
            await supabase
              .from('kyc_audit_log')
              .insert({
                user_id: userId,
                kyc_verification_id: verification.id,
                event_type: 'verification_approved',
                event_description: 'KYC verification approved by Sumsub',
                old_status: verification.verification_status,
                new_status: 'approved',
                performed_by_role: 'system',
                metadata: { webhook_type: payload.type, review_answer: payload.reviewResult?.reviewAnswer },
              });

            // Send notification (you can implement this)
            console.log(`KYC approved for user ${userId}`);
          } else if (payload.reviewResult?.reviewAnswer === 'RED') {
            // Rejected
            newStatus = 'rejected';
            updateData = {
              ...updateData,
              verification_status: 'rejected',
              rejected_at: new Date().toISOString(),
              rejection_reasons: payload.reviewResult?.rejectLabels || [],
              rejection_labels: payload.reviewResult?.rejectLabels || [],
              risk_level: 'high',
            };

            // Update user status
            await supabase
              .from('users')
              .update({
                kyc_status: 'rejected',
              })
              .eq('id', userId);

            // Keep restrictions active
            await supabase
              .from('kyc_restrictions')
              .update({
                reason: 'kyc_failed',
                details: payload.reviewResult?.clientComment || 'Verification rejected by Sumsub',
              })
              .eq('user_id', userId)
              .eq('is_active', true);

            // Log audit event
            await supabase
              .from('kyc_audit_log')
              .insert({
                user_id: userId,
                kyc_verification_id: verification.id,
                event_type: 'verification_rejected',
                event_description: `KYC verification rejected: ${payload.reviewResult?.clientComment || 'No reason provided'}`,
                old_status: verification.verification_status,
                new_status: 'rejected',
                performed_by_role: 'system',
                metadata: {
                  webhook_type: payload.type,
                  review_answer: payload.reviewResult?.reviewAnswer,
                  reject_labels: payload.reviewResult?.rejectLabels,
                },
              });

            console.log(`KYC rejected for user ${userId}`);
          } else if (payload.reviewResult?.reviewAnswer === 'YELLOW') {
            // Requires manual review
            newStatus = 'review_required';
            updateData = {
              ...updateData,
              verification_status: 'review_required',
              reviewed_at: new Date().toISOString(),
            };

            // Update user status
            await supabase
              .from('users')
              .update({
                kyc_status: 'review_required',
              })
              .eq('id', userId);

            // Log audit event
            await supabase
              .from('kyc_audit_log')
              .insert({
                user_id: userId,
                kyc_verification_id: verification.id,
                event_type: 'manual_review_started',
                event_description: 'KYC verification requires manual review',
                old_status: verification.verification_status,
                new_status: 'review_required',
                performed_by_role: 'system',
                metadata: { webhook_type: payload.type, review_answer: payload.reviewResult?.reviewAnswer },
              });

            console.log(`KYC requires review for user ${userId}`);
          }
        }
        break;

      case 'applicantPending':
        // Documents submitted, awaiting review
        updateData = {
          ...updateData,
          verification_status: 'pending',
        };

        // Log audit event
        await supabase
          .from('kyc_audit_log')
          .insert({
            user_id: userId,
            kyc_verification_id: verification.id,
            event_type: 'documents_submitted',
            event_description: 'Documents submitted and awaiting review',
            new_status: 'pending',
            performed_by_role: 'system',
            metadata: { webhook_type: payload.type },
          });
        break;

      default:
        console.log(`Unhandled webhook type: ${payload.type}`);
        break;
    }

    // Update verification record
    const { error: updateError } = await supabase
      .from('kyc_verifications')
      .update(updateData)
      .eq('id', verification.id);

    if (updateError) {
      console.error('Error updating verification:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: newStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in kyc-webhook:', error);
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

// Verify Sumsub webhook signature
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secretKey: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const computedSignature = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return computedSignature === signature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}
