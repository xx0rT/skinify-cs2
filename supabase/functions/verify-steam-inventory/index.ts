import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface InventoryItem {
  assetid: string;
  classid: string;
  instanceid: string;
  market_hash_name: string;
}

interface SteamInventoryResponse {
  success: boolean;
  assets?: InventoryItem[];
  descriptions?: any[];
}

/**
 * Verify Steam Inventory
 * Checks if buyer has received items in their Steam inventory
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const steamApiKey = Deno.env.get('STEAM_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    if (!steamApiKey) {
      throw new Error('Steam API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      console.log('=== VERIFY STEAM INVENTORY ===');

      const body = await req.json().catch(() => ({} as any));

      /* ─── Cron mode ─────────────────────────────────────────────────
         Called every 60s by pg_cron. Picks ONE pending unverified
         order at a time and runs the same per-order verification logic
         as the manual-confirm path. Picking one keeps Steam rate-limit
         pressure flat; if the queue is hot the cron picks the next one
         on the next tick.

         Order selection rules:
           - status='pending', payment_status='completed', trade_verified=false
           - last_inventory_check_at IS NULL OR < now() - 2 min
             (throttle so we don't hammer Steam for one slow order)
           - inventory_check_attempts < 30 (auto-escalate to support
             after roughly 30 polls = ~30 minutes of trying)
           - FOR UPDATE SKIP LOCKED so a parallel cron run can't pick
             the same row.

         When the chosen order verifies, fall through to the existing
         success path. When it fails, we increment the attempt counter
         and return a benign 200 so cron logs stay quiet. */
      if (body.mode === 'cron') {
        console.log('[verify-steam-inventory] cron tick');
        const { data: candidate, error: pickError } = await supabase.rpc(
          'pick_inventory_check_candidate',
        );
        if (pickError) {
          console.error('pick_inventory_check_candidate failed:', pickError);
          return new Response(
            JSON.stringify({ ok: true, picked: 0, error: pickError.message }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
          );
        }
        if (!candidate || candidate.length === 0) {
          /* Nothing to do this tick — return success so the cron log
             doesn't fill up with red. */
          return new Response(
            JSON.stringify({ ok: true, picked: 0 }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
          );
        }
        /* `candidate` is a single row [{transaction_id, buyer_steam_id, items}] */
        const row = Array.isArray(candidate) ? candidate[0] : candidate;
        /* Re-enter the same path the manual call uses by overriding
           the variables below. We can't `await req.json()` again so we
           hand-construct the values. */
        body.transaction_id = row.transaction_id;
        body.buyer_steam_id = row.buyer_steam_id;
        body.items_to_verify = row.items || [];
      }

      const { transaction_id, buyer_steam_id, items_to_verify } = body;

      if (!transaction_id || !buyer_steam_id || !items_to_verify) {
        return new Response(
          JSON.stringify({
            error: 'Missing required fields: transaction_id, buyer_steam_id, items_to_verify'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log('Verifying inventory for:', buyer_steam_id);
      console.log('Transaction:', transaction_id);
      console.log('Items to verify:', items_to_verify.length);

      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('transaction_id', transaction_id)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Fetch buyer's CS:GO inventory from Steam API
      const steamId64 = buyer_steam_id;
      const appId = 730; // CS:GO
      const contextId = 2; // In-game items

      try {
        const inventoryUrl = `https://steamcommunity.com/inventory/${steamId64}/${appId}/${contextId}?l=english&count=5000`;

        console.log('Fetching Steam inventory...');
        const inventoryResponse = await fetch(inventoryUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!inventoryResponse.ok) {
          console.error('Failed to fetch inventory:', inventoryResponse.status);

          // If inventory is private or inaccessible, log it but don't block
          if (inventoryResponse.status === 403) {
            console.warn('Inventory is private or unavailable');

            // Update order with verification attempt
            await supabase
              .from('orders')
              .update({
                inventory_check_attempted: true,
                inventory_check_result: 'private_inventory',
                inventory_check_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('transaction_id', transaction_id);

            return new Response(
              JSON.stringify({
                success: false,
                verified: false,
                reason: 'inventory_private',
                message: 'Buyer inventory is private. Manual verification required.',
                allow_manual_confirm: true
              }),
              { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }

          throw new Error(`Steam API returned ${inventoryResponse.status}`);
        }

        const inventoryData: SteamInventoryResponse = await inventoryResponse.json();

        if (!inventoryData.success || !inventoryData.assets) {
          throw new Error('Invalid inventory response from Steam');
        }

        console.log(`Fetched ${inventoryData.assets.length} items from inventory`);

        // Create a map of inventory items by market_hash_name
        const inventoryMap = new Map<string, number>();

        // Match assets with descriptions to get market names
        if (inventoryData.descriptions) {
          for (const asset of inventoryData.assets) {
            const description = inventoryData.descriptions.find(
              (desc: any) => desc.classid === asset.classid && desc.instanceid === asset.instanceid
            );

            if (description && description.market_hash_name) {
              const count = inventoryMap.get(description.market_hash_name) || 0;
              inventoryMap.set(description.market_hash_name, count + 1);
            }
          }
        }

        // Verify each item from the order
        const verificationResults = [];
        let allItemsFound = true;

        for (const item of items_to_verify) {
          const marketName = item.market_name || item.name;
          const inInventory = inventoryMap.has(marketName) && inventoryMap.get(marketName)! > 0;

          verificationResults.push({
            item_name: marketName,
            found: inInventory,
            expected: true
          });

          if (!inInventory) {
            allItemsFound = false;
            console.warn(`Item NOT found in inventory: ${marketName}`);
          } else {
            console.log(`✅ Item verified in inventory: ${marketName}`);
          }
        }

        // Update order with verification results
        const verifiedAt = new Date().toISOString();
        await supabase
          .from('orders')
          .update({
            inventory_verified: allItemsFound,
            inventory_check_attempted: true,
            inventory_check_result: allItemsFound ? 'verified' : 'items_missing',
            inventory_check_details: verificationResults,
            inventory_check_at: verifiedAt,
            updated_at: verifiedAt
          })
          .eq('transaction_id', transaction_id);

        // ── Start the 8-day escrow clock on confirmed delivery ──
        // The seller's sale funds were placed in pending with
        // escrow_awaiting_delivery=true and NO start time. Now that the
        // asset(s) are confirmed in the buyer's inventory, stamp
        // escrow_start_at on every matching sale transaction. Only from
        // this moment does auto-escrow-release count the 8 days. If items
        // were NOT all found, we leave the clock unstarted so funds stay
        // held until a later successful check (or manual review).
        if (allItemsFound) {
          const { data: saleTxns } = await supabase
            .from('user_transactions')
            .select('id, metadata')
            .eq('type', 'sale')
            .contains('metadata', { order_id: transaction_id });

          for (const tx of saleTxns || []) {
            const meta = tx.metadata || {};
            // Idempotent: don't reset the clock if already started.
            if (meta.escrow_start_at) continue;
            await supabase
              .from('user_transactions')
              .update({
                metadata: {
                  ...meta,
                  escrow_awaiting_delivery: false,
                  escrow_start_at: verifiedAt,
                  hold_until: new Date(
                    new Date(verifiedAt).getTime() + 8 * 24 * 60 * 60 * 1000,
                  ).toISOString(),
                  delivery_confirmed_at: verifiedAt,
                },
                updated_at: verifiedAt,
              })
              .eq('id', tx.id);
          }
          console.log(
            `Escrow clock started for ${saleTxns?.length || 0} sale txn(s) on order ${transaction_id}`,
          );
        }

        console.log(`Verification result: ${allItemsFound ? 'ALL ITEMS FOUND' : 'SOME ITEMS MISSING'}`);

        return new Response(
          JSON.stringify({
            success: true,
            verified: allItemsFound,
            items_checked: verificationResults.length,
            items_found: verificationResults.filter(r => r.found).length,
            verification_details: verificationResults,
            message: allItemsFound
              ? 'All items verified in buyer inventory'
              : 'Some items are missing from buyer inventory'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );

      } catch (steamError) {
        console.error('Steam API error:', steamError);

        // Log the error but allow manual verification
        await supabase
          .from('orders')
          .update({
            inventory_check_attempted: true,
            inventory_check_result: 'api_error',
            inventory_check_error: steamError.message,
            inventory_check_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('transaction_id', transaction_id);

        return new Response(
          JSON.stringify({
            success: false,
            verified: false,
            reason: 'api_error',
            error: steamError.message,
            message: 'Unable to verify inventory automatically. Manual verification required.',
            allow_manual_confirm: true
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('=== INVENTORY VERIFICATION ERROR ===', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to verify inventory',
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
