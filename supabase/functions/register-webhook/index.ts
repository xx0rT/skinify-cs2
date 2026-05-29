import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * Register Revolut webhook with correct format and validation
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    console.log('=== REVOLUT WEBHOOK REGISTRATION START ===');
    
    const revolutSecretKey = Deno.env.get('REVOLUT_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!revolutSecretKey) {
      return new Response(
        JSON.stringify({
          error: 'REVOLUT_SECRET_KEY is not configured',
          instructions: 'Set REVOLUT_SECRET_KEY in Supabase Project Settings → Edge Functions → Secrets',
          your_key: 'sk_xRucp2gz4S2LH7OoSypxT08i75ogXnW-CbISONX5925y0Sw13mn0qlG9NsXKhBDS'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not configured');
    }

    // The webhook endpoint URL
    const webhookUrl = `${supabaseUrl}/functions/v1/revolut-webhook`;
    console.log('Webhook URL to register:', webhookUrl);

    // Determine API endpoint based on environment
    const apiUrl = revolutSecretKey.startsWith('sk_sandbox')
      ? 'https://sandbox-merchant.revolut.com/api/1.0/webhooks'
      : 'https://merchant.revolut.com/api/1.0/webhooks';

    console.log('API endpoint:', apiUrl);
    console.log('Environment:', revolutSecretKey.startsWith('sk_sandbox') ? 'sandbox' : 'production');

    // Check if webhook is already registered
    console.log('=== CHECKING EXISTING WEBHOOKS ===');

    const checkResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${revolutSecretKey}`,
        'Content-Type': 'application/json',
        'Revolut-Api-Version': '2024-09-01'
      }
    });

    if (checkResponse.ok) {
      const existingWebhooks = await checkResponse.json();
      console.log('Existing webhooks:', existingWebhooks);
      
      // Check if our webhook URL is already registered
      const isAlreadyRegistered = existingWebhooks.some((webhook: any) => 
        webhook.url === webhookUrl
      );
      
      if (isAlreadyRegistered) {
        console.log('✅ WEBHOOK ALREADY REGISTERED');
        return new Response(
          JSON.stringify({
            success: true,
            webhook_registered: true,
            message: 'Webhook is already registered',
            webhook_url: webhookUrl,
            existing_webhooks: existingWebhooks
          }),
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      }
    }

    // Use the EXACT payload format that works with Revolut API
    const webhookPayload = {
      url: webhookUrl,
      events: ['ORDER_COMPLETED', 'ORDER_AUTHORISED', 'ORDER_PAYMENT_COMPLETED']
    };

    console.log('=== REGISTERING NEW WEBHOOK ===');
    console.log('Payload:', JSON.stringify(webhookPayload, null, 2));

    const registerResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${revolutSecretKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Revolut-Api-Version': '2024-09-01'
      },
      body: JSON.stringify(webhookPayload)
    });

    console.log('Registration response status:', registerResponse.status);
    const responseText = await registerResponse.text();
    console.log('Registration response body:', responseText);

    if (registerResponse.ok) {
      const webhookData = JSON.parse(responseText);
      console.log('✅ WEBHOOK REGISTERED SUCCESSFULLY');
      
      return new Response(
        JSON.stringify({
          success: true,
          webhook_registered: true,
          webhook_data: webhookData,
          webhook_url: webhookUrl,
          message: 'Webhook registered successfully! Your payments will now be processed automatically.',
          test_instructions: {
            step1: 'Make a test deposit',
            step2: 'Complete payment in Revolut window',
            step3: 'Webhook will automatically add funds to your account'
          }
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );
    } else {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { error: responseText };
      }

      console.error('❌ WEBHOOK REGISTRATION FAILED');
      console.error('Error data:', errorData);

      // Provide specific guidance based on error code
      const errorCode = errorData.code;
      let troubleshootingAdvice = {};

      if (errorCode === 1041) {
        troubleshootingAdvice = {
          error_code: 1041,
          description: 'Webhook validation failed',
          possible_causes: [
            'Webhook URL is not publicly accessible',
            'Webhook endpoint does not respond to Revolut validation',
            'SSL certificate issues with the webhook URL'
          ],
          solutions: [
            'Test webhook URL manually: ' + webhookUrl,
            'Check Supabase edge function deployment status',
            'Verify webhook responds with 200 OK for validation requests',
            'Try manual webhook registration in Revolut Merchant Dashboard'
          ]
        };
      } else if (errorCode === 1000) {
        troubleshootingAdvice = {
          error_code: 1000,
          description: 'General API error',
          solutions: [
            'Check API key is valid and active',
            'Verify API key has webhook permissions',
            'Try refreshing API key in Revolut dashboard'
          ]
        };
      }

      return new Response(
        JSON.stringify({
          success: false,
          webhook_registered: false,
          error: 'Webhook registration failed',
          error_details: errorData,
          troubleshooting: troubleshootingAdvice,
          manual_registration: {
            message: 'You can register the webhook manually',
            steps: [
              '1. Go to Revolut Business Dashboard',
              '2. Navigate to Developer API > Webhooks',
              '3. Add new webhook with URL: ' + webhookUrl,
              '4. Select events: ORDER_COMPLETED, ORDER_AUTHORISED',
              '5. Save webhook configuration'
            ],
            webhook_url: webhookUrl
          }
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400
        }
      );
    }

  } catch (error) {
    console.error('=== WEBHOOK REGISTRATION ERROR ===', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        webhook_registered: false,
        error: 'Webhook registration failed',
        details: error.message,
        manual_fallback: {
          message: 'Register webhook manually in Revolut dashboard',
          webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/revolut-webhook`,
          events: ['ORDER_COMPLETED', 'ORDER_AUTHORISED']
        },
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
    );
  }
});