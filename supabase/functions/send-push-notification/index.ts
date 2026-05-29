import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SendPushRequest {
  user_steam_id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
  url?: string;
}

async function sendWebPush(subscription: any, payload: any) {
  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('VAPID keys not configured, skipping web push');
      return false;
    }

    const webpush = await import('npm:web-push@3.6.7');

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    await webpush.sendNotification(subscription, JSON.stringify(payload));

    return true;
  } catch (error) {
    console.error('Failed to send web push:', error);
    if (error.statusCode === 410 || error.statusCode === 404) {
      return 'expired';
    }
    return false;
  }
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

    const { user_steam_id, title, body, icon, badge, tag, requireInteraction, data, url }: SendPushRequest = await req.json();

    if (!user_steam_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_steam_id', user_steam_id);

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No subscriptions found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const payload = {
      title,
      body,
      icon: icon || '/image.png',
      badge: badge || '/image.png',
      tag: tag || 'notification',
      requireInteraction: requireInteraction || false,
      data: {
        ...data,
        url: url || '/',
      },
    };

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const result = await sendWebPush(sub.subscription, payload);

        if (result === 'expired') {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        }

        return result;
      })
    );

    const successCount = results.filter((r) => r === true).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} notification(s)`,
        total: subscriptions.length,
        sent: successCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending push notification:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
