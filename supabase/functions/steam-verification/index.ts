import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface VerifyOwnershipRequest {
  steam_id: string;
  asset_id: string;
  appid?: number;
  contextid?: number;
}

interface InitiateTradeRequest {
  from_steam_id: string;
  to_steam_id: string;
  asset_ids: string[];
  trade_message?: string;
  order_id: string;
}

/**
 * Verify Steam item ownership via Steam Web API
 * @param steamId - Steam ID64 of the user
 * @param assetId - Asset ID of the item
 * @param apiKey - Steam Web API key
 * @returns Promise<boolean>
 */
async function verifyItemOwnership(
  steamId: string, 
  assetId: string, 
  apiKey: string,
  appid: number = 730,
  contextid: number = 2
): Promise<boolean> {
  try {
    console.log(`Verifying ownership: Steam ID ${steamId}, Asset ID ${assetId}`);
    
    const inventoryUrl = `https://steamcommunity.com/inventory/${steamId}/${appid}/${contextid}`;
    
    const response = await fetch(inventoryUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.error(`Steam inventory fetch failed: ${response.status}`);
      return false;
    }

    const inventoryData = await response.json();
    
    if (!inventoryData.success || !inventoryData.assets) {
      console.error('Steam inventory data invalid');
      return false;
    }

    // Check if asset exists in user's inventory
    const assetExists = inventoryData.assets.some((asset: any) => 
      asset.assetid === assetId
    );

    console.log(`Asset ${assetId} ownership verification: ${assetExists}`);
    return assetExists;

  } catch (error) {
    console.error('Ownership verification error:', error);
    return false;
  }
}

/**
 * Create Steam trade offer (mock implementation)
 * In production, use Steam Web API trade offer endpoints
 * @param fromSteamId - Sender's Steam ID
 * @param toSteamId - Recipient's Steam ID  
 * @param assetIds - Array of asset IDs to trade
 * @param message - Trade offer message
 * @returns Promise<string> - Trade offer ID
 */
async function createSteamTradeOffer(
  fromSteamId: string,
  toSteamId: string, 
  assetIds: string[],
  message: string = ''
): Promise<string> {
  // This is a mock implementation
  // In production, use Steam Web API:
  // POST https://api.steampowered.com/IEconService/SendTradeOffer/v1/
  
  console.log('Creating Steam trade offer:', {
    from: fromSteamId,
    to: toSteamId,
    assets: assetIds,
    message
  });

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Return mock trade offer ID
  const tradeOfferId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  
  console.log('Trade offer created:', tradeOfferId);
  return tradeOfferId;
}

/**
 * Get Steam trade offer status (mock implementation)
 * @param tradeOfferId - Trade offer ID
 * @returns Promise<string> - Trade status
 */
async function getTradeOfferStatus(tradeOfferId: string): Promise<string> {
  // Mock implementation - in production use Steam Web API
  console.log('Checking trade offer status:', tradeOfferId);
  
  // Simulate various trade states
  const statuses = ['pending', 'accepted', 'declined', 'cancelled', 'expired'];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  
  return randomStatus;
}

/**
 * Verify if a trade offer exists from seller to buyer
 * @param sellerSteamId - Seller's Steam ID
 * @param buyerSteamId - Buyer's Steam ID  
 * @param apiKey - Steam Web API key
 * @returns Promise<boolean> - True if trade offer was sent
 */
async function verifyTradeOfferExists(
  sellerSteamId: string,
  buyerSteamId: string,
  apiKey?: string
): Promise<boolean> {
  console.log(`=== CHECKING FOR TRADE OFFER ===`);
  console.log(`From seller: ${sellerSteamId}`);
  console.log(`To buyer: ${buyerSteamId}`);
  
  try {
    if (!apiKey) {
      console.log('DEMO MODE: Simulating trade offer detection');
      // In demo mode, simulate 70% chance trade was sent after 1 minute
      const timeBasedChance = Math.random() > 0.3; // 70% success rate
      console.log(`DEMO: Trade offer simulation result: ${timeBasedChance}`);
      return timeBasedChance;
    }
    
    // PRODUCTION CODE: Use Steam Web API to check trade offers
    // GET https://api.steampowered.com/IEconService/GetTradeOffers/v1/
    const tradeOffersUrl = `https://api.steampowered.com/IEconService/GetTradeOffers/v1/?key=${apiKey}&get_sent_offers=1&active_only=1&historical_only=0&time_historical_cutoff=${Math.floor(Date.now() / 1000) - 3600}`; // Last hour
    
    const response = await fetch(tradeOffersUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'CS2Marketplace/1.0'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      throw new Error(`Steam API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.response || !data.response.trade_offers_sent) {
      console.log('No sent trade offers found');
      return false;
    }
    
    // Look for recent trade offers to the specific buyer
    const recentTradeOffers = data.response.trade_offers_sent.filter((offer: any) => {
      // Check if trade offer is to the correct buyer and recent (within last hour)
      const offerTime = offer.time_created || 0;
      const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
      
      return offer.accountid_other === buyerSteamId && 
             offerTime > oneHourAgo &&
             (offer.trade_offer_state === 2 || offer.trade_offer_state === 9); // Active or Confirmed
    });
    
    const tradeOfferFound = recentTradeOffers.length > 0;
    
    if (tradeOfferFound) {
      console.log(`✅ Found ${recentTradeOffers.length} recent trade offer(s) to buyer`);
      console.log('Trade offer details:', recentTradeOffers[0]);
    } else {
      console.log('❌ No recent trade offers found to buyer');
    }
    
    return tradeOfferFound;
    
  } catch (error) {
    console.error('Error verifying trade offer:', error);
    // Return false on error to continue polling
    return false;
  }
}
/**
 * Main Steam verification handler
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
    const steamApiKey = Deno.env.get('STEAM_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST' && url.pathname.endsWith('/verify-ownership')) {
      // Verify item ownership
      const verifyData: VerifyOwnershipRequest = await req.json();
      
      console.log(`=== VERIFYING ITEM OWNERSHIP ===`);
      console.log('Verification request:', verifyData);

      if (!verifyData.steam_id || !verifyData.asset_id) {
        return new Response(
          JSON.stringify({ error: 'steam_id and asset_id are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      const ownershipVerified = steamApiKey 
        ? await verifyItemOwnership(
            verifyData.steam_id, 
            verifyData.asset_id, 
            steamApiKey,
            verifyData.appid || 730,
            verifyData.contextid || 2
          )
        : true; // Mock verification if no API key

      return new Response(
        JSON.stringify({
          verified: ownershipVerified,
          steam_id: verifyData.steam_id,
          asset_id: verifyData.asset_id,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );

    } else if (req.method === 'POST' && url.pathname.endsWith('/initiate-trade')) {
      // Initiate Steam trade offer
      const tradeData: InitiateTradeRequest = await req.json();
      
      console.log(`=== INITIATING STEAM TRADE ===`);
      console.log('Trade request:', tradeData);

      if (!tradeData.from_steam_id || !tradeData.to_steam_id || !tradeData.asset_ids) {
        return new Response(
          JSON.stringify({ error: 'from_steam_id, to_steam_id, and asset_ids are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Verify sender owns the assets
      if (steamApiKey) {
        for (const assetId of tradeData.asset_ids) {
          const owns = await verifyItemOwnership(tradeData.from_steam_id, assetId, steamApiKey);
          if (!owns) {
            return new Response(
              JSON.stringify({ 
                error: `Asset ${assetId} not found in sender's inventory`,
                verified: false
              }),
              { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
            );
          }
        }
      }

      // Create trade offer
      const tradeOfferId = await createSteamTradeOffer(
        tradeData.from_steam_id,
        tradeData.to_steam_id,
        tradeData.asset_ids,
        tradeData.trade_message || `Trade for order ${tradeData.order_id}`
      );

      // In production, save trade offer details to database
      console.log('Trade offer initiated:', tradeOfferId);

      return new Response(
        JSON.stringify({
          success: true,
          trade_offer_id: tradeOfferId,
          status: 'pending',
          message: 'Trade offer sent successfully',
          steam_trade_url: `https://steamcommunity.com/tradeoffer/${tradeOfferId}/`,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 201
        }
      );

    } else if (req.method === 'POST' && url.pathname.endsWith('/verify-trade-sent')) {
      // Verify if trade offer was actually sent to buyer
      console.log('=== VERIFYING TRADE OFFER WAS SENT ===');
      
      const verifyData = await req.json();
      const { transaction_id, seller_steam_id, buyer_steam_id } = verifyData;
      
      if (!transaction_id || !seller_steam_id || !buyer_steam_id) {
        return new Response(
          JSON.stringify({ error: 'transaction_id, seller_steam_id, and buyer_steam_id are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }
      
      console.log('Verifying trade for:', {
        transaction_id,
        seller_steam_id,
        buyer_steam_id
      });
      
      try {
        // Check if seller has sent a trade offer to buyer
        const tradeOfferSent = await verifyTradeOfferExists(seller_steam_id, buyer_steam_id, steamApiKey);
        
        console.log('Trade offer verification result:', tradeOfferSent);
        
        if (tradeOfferSent) {
          // Store trade offer info in database
          await supabase
            .from('orders')
            .update({
              steam_trade_url: `https://steamcommunity.com/tradeoffer/new/?partner=${buyer_steam_id}`,
              trade_offer_id: `pending_${Date.now()}`,
              escrow_timer_started_at: new Date().toISOString(),
              tracking_notes: 'Trade offer sent to buyer. Waiting for acceptance.',
              updated_at: new Date().toISOString()
            })
            .eq('transaction_id', transaction_id);
        }
        
        return new Response(
          JSON.stringify({
            trade_offer_sent: tradeOfferSent,
            verification_method: 'steam_api_check',
            transaction_id,
            timestamp: new Date().toISOString(),
            message: tradeOfferSent 
              ? 'Trade offer detected and verified' 
              : 'No trade offer found yet'
          }),
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
        
      } catch (verificationError) {
        console.error('Trade verification failed:', verificationError);
        
        return new Response(
          JSON.stringify({
            trade_offer_sent: false,
            error: 'Verification temporarily unavailable',
            verification_method: 'api_error',
            retry_suggested: true,
            timestamp: new Date().toISOString()
          }),
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      }
    } else if (req.method === 'GET' && url.pathname.endsWith('/trade-status')) {
      // Get trade offer status
      const tradeOfferId = url.searchParams.get('trade_offer_id');
      
      if (!tradeOfferId) {
        return new Response(
          JSON.stringify({ error: 'trade_offer_id parameter is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      console.log(`=== CHECKING TRADE STATUS ${tradeOfferId} ===`);

      const status = await getTradeOfferStatus(tradeOfferId);

      return new Response(
        JSON.stringify({
          trade_offer_id: tradeOfferId,
          status,
          timestamp: new Date().toISOString()
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
    console.error('=== STEAM VERIFICATION ERROR ===', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process Steam verification request',
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