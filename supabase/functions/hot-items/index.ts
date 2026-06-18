import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface PromoteItemRequest {
  listing_id: string;
  user_steam_id: string;
  asset_id: string;
  payment_method: 'balance' | 'card';
  duration_hours?: number; // Default 24 hours
}

/**
 * Create notification for hot item events
 */
async function createNotification(
  supabase: any,
  userSteamId: string,
  type: string,
  title: string,
  message: string,
  actionUrl?: string,
  metadata?: any
) {
  try {
    const { data, error } = await supabase
      .from('user_notifications')
      .insert({
        user_steam_id: userSteamId,
        type,
        title,
        message,
        action_url: actionUrl,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create notification:', error);
    } else {
      console.log('Notification created:', data.id);
    }

    return data;
  } catch (error) {
    console.error('Notification creation error:', error);
    return null;
  }
}

/**
 * Main hot items handler
 */
Deno.serve(async (req) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const url = new URL(req.url);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      // Get active hot items for landing page
      console.log('=== FETCHING ACTIVE HOT ITEMS ===');
      
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const category = url.searchParams.get('category');
      
      // Get hot items with listing details
      let query = supabase
        .from('hot_items')
        .select(`
          *,
          marketplace_listings!inner (
            id,
            item_name,
            market_hash_name,
            item_type,
            rarity,
            condition,
            price,
            image_url,
            float_value,
            pattern_template,
            stickers,
            description,
            created_at
          ),
          users!inner (
            display_name,
            avatar_url
          )
        `)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());
      
      // Filter by category if provided
      if (category && category !== 'all') {
        query = query.ilike('marketplace_listings.item_type', `%${category}%`);
      }
      
      const { data: hotItems, error } = await query
        .order('promoted_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch hot items:', error);
        throw new Error(`Failed to fetch hot items: ${error.message}`);
      }

      // Format for frontend
      const formattedHotItems = (hotItems || []).map(hotItem => ({
        id: hotItem.marketplace_listings.id.toString(),
        name: hotItem.marketplace_listings.item_name,
        market_name: hotItem.marketplace_listings.market_hash_name,
        type: hotItem.marketplace_listings.item_type,
        rarity: hotItem.marketplace_listings.rarity,
        condition: hotItem.marketplace_listings.condition,
        price: Number(hotItem.marketplace_listings.price),
        priceChange: Math.random() * 20 - 10, // Mock price change
        image: hotItem.marketplace_listings.image_url,
        expiresIn: calculateTimeRemaining(hotItem.expires_at),
        itemCount: 1,
        itemId: hotItem.asset_id,
        special: hotItem.marketplace_listings.item_name.includes('StatTrak™') ? 'stattrak' :
                hotItem.marketplace_listings.item_name.includes('Souvenir') ? 'souvenir' : undefined,
        favorite: false,
        tradable: true,
        marketable: true,
        float: hotItem.marketplace_listings.float_value,
        patternTemplate: hotItem.marketplace_listings.pattern_template,
        stickers: hotItem.marketplace_listings.stickers,
        seller: {
          steamId: hotItem.user_steam_id,
          name: hotItem.users.display_name || 'Unknown'
        },
        isHot: true,
        promotedAt: hotItem.promoted_at,
        expiresAt: hotItem.expires_at,
        hotViews: hotItem.views,
        hotClicks: hotItem.clicks
      }));

      console.log(`Fetched ${formattedHotItems.length} active hot items`);

      return new Response(
        JSON.stringify({
          items: formattedHotItems,
          total: formattedHotItems.length,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );

    } else if (req.method === 'POST') {
      // Promote item to hot status
      console.log('=== PROMOTING ITEM TO HOT STATUS ===');
      
      const promoteData: PromoteItemRequest = await req.json();
      console.log('Promotion request:', promoteData);

      if (!promoteData.listing_id || !promoteData.user_steam_id || !promoteData.asset_id) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields: listing_id, user_steam_id, asset_id'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Validate user owns the listing
      const { data: listing, error: listingError } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('id', promoteData.listing_id)
        .eq('steam_id', promoteData.user_steam_id)
        .eq('is_active', true)
        .single();

      if (listingError || !listing) {
        return new Response(
          JSON.stringify({ error: 'Listing not found or not owned by user' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Check if item is already promoted and active
      const { data: existingHotItem } = await supabase
        .from('hot_items')
        .select('*')
        .eq('listing_id', promoteData.listing_id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existingHotItem) {
        return new Response(
          JSON.stringify({ 
            error: 'Item is already promoted as hot item',
            expires_at: existingHotItem.expires_at
          }),
          { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      /* Promotion: 49 CZK for a 7-day featured boost. The fee is the
         fixed CZK figure quoted to sellers in the UI — no FX conversion
         here so the seller's bill matches what the listing modal
         showed. The previous $5 USD value was demo-stage and got
         multiplied by an ancient rate into ~118 CZK. */
      const durationHours = promoteData.duration_hours || 24 * 7;
      const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
      const promotionFeeCZK = 49;
      const promotionFee = promotionFeeCZK;
      
      console.log('=== PROCESSING PROMOTION PAYMENT ===');
      console.log(`Fee: ${promotionFee} USD (${promotionFeeCZK} CZK)`);
      
      // Get user's current balance
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('steam_id', promoteData.user_steam_id)
        .single();

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'User not found for payment processing' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      const currentBalance = Number(user.current_balance || 0);

      if (currentBalance < promotionFeeCZK) {
        return new Response(
          JSON.stringify({
            error: 'Insufficient balance for promotion',
            required_amount: promotionFeeCZK,
            current_balance: currentBalance,
            deficit: promotionFeeCZK - currentBalance
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      console.log('=== BALANCE CHECK PASSED ===');
      console.log('Current balance:', currentBalance);
      console.log('Fee amount (CZK):', promotionFeeCZK);
      console.log('Expected balance after:', currentBalance - promotionFeeCZK);
      console.log('Transaction type will be: purchase (should SUBTRACT from balance)');

      // Create promotion fee transaction (trigger will auto-update balance)
      // CRITICAL: type='purchase' means the trigger will SUBTRACT the amount from balance
      const promotionTransaction = {
        user_id: user.id,
        steam_id: promoteData.user_steam_id,
        type: 'purchase',
        amount: promotionFeeCZK,
        description: `Hot item promotion fee for "${listing.item_name}" - 24 hours featured placement`,
        reference_id: `hot_promotion_${promoteData.listing_id}_${Date.now()}`,
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          promotion_type: 'hot_item',
          listing_id: promoteData.listing_id,
          duration_hours: durationHours,
          fee_usd: promotionFee,
          fee_czk: promotionFeeCZK,
          item_name: listing.item_name,
          payment_source: 'account_balance'
        }
      };

      const { data: feeTransaction, error: feeError } = await supabase
        .from('user_transactions')
        .insert(promotionTransaction)
        .select()
        .single();

      if (feeError) {
        console.error('Failed to create promotion fee transaction:', feeError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to process promotion payment',
            details: feeError.message
          }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      console.log('=== TRANSACTION CREATED ===');
      console.log('Transaction ID:', feeTransaction.id);
      console.log('Transaction type:', feeTransaction.type);
      console.log('Transaction amount:', feeTransaction.amount);
      console.log('Balance before transaction:', feeTransaction.balance_before);
      console.log('Balance after transaction:', feeTransaction.balance_after);
      console.log('Expected final balance:', currentBalance - promotionFeeCZK);

      // Verify the balance was actually deducted
      if (feeTransaction.balance_after > feeTransaction.balance_before) {
        console.error('⚠️ WARNING: Balance INCREASED instead of DECREASED!');
        console.error('This is a database trigger error - purchase should subtract!');
      } else {
        console.log('✅ Balance correctly deducted by trigger');
      }

      console.log('Creating hot item promotion:', {
        listing_id: promoteData.listing_id,
        user_steam_id: promoteData.user_steam_id,
        duration_hours: durationHours,
        fee_paid: promotionFeeCZK
      });

      // Create hot item record
      const { data: hotItem, error: hotItemError } = await supabase
        .from('hot_items')
        .insert({
          listing_id: promoteData.listing_id,
          user_steam_id: promoteData.user_steam_id,
          asset_id: promoteData.asset_id,
          item_name: listing.item_name,
          market_hash_name: listing.market_hash_name,
          item_type: listing.item_type,
          rarity: listing.rarity,
          condition: listing.condition,
          price: listing.price,
          image_url: listing.image_url,
          expires_at: expiresAt,
          payment_amount: promotionFeeCZK,
          payment_currency: 'CZK',
          payment_reference: feeTransaction.reference_id,
          is_active: true
        })
        .select()
        .single();

      if (hotItemError) {
        console.error('Failed to create hot item:', hotItemError);
        throw new Error(`Failed to promote item: ${hotItemError.message}`);
      }

      console.log('✅ Hot item created, promotion fee will be deducted by database trigger');

      // Create success notification
      await createNotification(
        supabase,
        promoteData.user_steam_id,
        'success',
        '🔥 Item Promoted to Hot!',
        `Your item "${listing.item_name}" is now featured as a hot item for ${durationHours} hours! Promotion fee of ${promotionFeeCZK.toLocaleString('cs-CZ')} Kč has been charged to your account.`,
        `/profile?tab=listings`,
        {
          hot_item_id: hotItem.id,
          listing_id: promoteData.listing_id,
          duration_hours: durationHours,
          expires_at: expiresAt,
          promotion_fee_paid: promotionFeeCZK,
          transaction_id: feeTransaction.id
        }
      );

      console.log('✅ Item promoted to hot status:', hotItem.id);

      return new Response(
        JSON.stringify({
          success: true,
          hot_item: hotItem,
          message: 'Item successfully promoted to hot status',
          expires_at: expiresAt,
          duration_hours: durationHours
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 201
        }
      );

    } else if (req.method === 'DELETE') {
      // Remove hot item promotion
      const hotItemId = url.searchParams.get('id');
      const userSteamId = url.searchParams.get('user_steam_id');

      if (!hotItemId || !userSteamId) {
        return new Response(
          JSON.stringify({ error: 'hot_item_id and user_steam_id are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Deactivate hot item (user can only deactivate their own)
      const { data: deactivatedHotItem, error } = await supabase
        .from('hot_items')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', hotItemId)
        .eq('user_steam_id', userSteamId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to remove hot item: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Hot item promotion removed',
          deactivated_item: deactivatedHotItem
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error) {
    console.error('=== HOT ITEMS ERROR ===', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process hot items request',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});

/**
 * Calculate time remaining until expiration
 */
function calculateTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Expired';
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}