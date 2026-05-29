import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use service role client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, shopId, listingId, steamId } = body;

    console.log('Toggle shop item request:', body);
    console.log('Parsed values:', { action, shopId, listingId, steamId });

    if (!steamId) {
      throw new Error('Steam ID is required');
    }

    if (!action || !shopId || !listingId) {
      throw new Error(`Missing required fields: action=${action}, shopId=${shopId}, listingId=${listingId}`);
    }

    // Verify the shop belongs to the user
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, steam_id')
      .eq('steam_id', steamId)
      .maybeSingle();

    console.log('User lookup result:', { userRecord, userError });

    if (userError) {
      throw new Error(`Database error looking up user: ${userError.message}`);
    }

    if (!userRecord) {
      throw new Error(`User not found for Steam ID: ${steamId}`);
    }

    const { data: shop, error: shopError } = await supabase
      .from('user_shops')
      .select('id, user_id')
      .eq('id', shopId)
      .eq('user_id', userRecord.id)
      .maybeSingle();

    console.log('Shop lookup result:', { shop, shopError, expectedUserId: userRecord.id });

    if (shopError) {
      throw new Error(`Database error looking up shop: ${shopError.message}`);
    }

    if (!shop) {
      throw new Error(`Shop not found (ID: ${shopId}) or you don't have access. Your user ID: ${userRecord.id}`);
    }

    if (action === 'add') {
      // Add item to shop
      console.log('Attempting to insert shop item...');
      const insertData = {
        shop_id: shopId,
        listing_id: parseInt(listingId),
        is_featured: false,
        display_order: 0
      };
      console.log('Insert data:', insertData);

      const { data, error } = await supabase
        .from('shop_items')
        .insert([insertData])
        .select();

      if (error) {
        console.error('Insert error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Failed to add item to shop: ${error.message} (${error.code})`);
      }

      console.log('Successfully added item to shop:', data);

      return new Response(
        JSON.stringify({ success: true, data }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } else if (action === 'remove') {
      // Remove item from shop
      console.log('Attempting to remove shop item...');

      const { error } = await supabase
        .from('shop_items')
        .delete()
        .eq('shop_id', shopId)
        .eq('listing_id', parseInt(listingId));

      if (error) {
        console.error('Delete error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Failed to remove item from shop: ${error.message}`);
      }

      console.log('Successfully removed item from shop');

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } else {
      throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in toggle-shop-item:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
