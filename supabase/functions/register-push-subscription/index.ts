import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RegisterSubscriptionRequest {
  user_steam_id: string;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { user_steam_id, subscription }: RegisterSubscriptionRequest = await req.json();

    if (!user_steam_id || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Missing user_steam_id or subscription' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: existingSubscription } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_steam_id', user_steam_id)
      .eq('endpoint', subscription.endpoint)
      .maybeSingle();

    if (existingSubscription) {
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          subscription: subscription,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubscription.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Subscription updated' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error } = await supabase.from('push_subscriptions').insert({
      user_steam_id,
      endpoint: subscription.endpoint,
      subscription: subscription,
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: 'Subscription registered' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error registering push subscription:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
