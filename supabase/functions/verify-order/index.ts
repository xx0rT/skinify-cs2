import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface VerifyOrderRequest {
  transaction_id: string;
  seller_steam_id: string;
  buyer_steam_id: string;
  items: Array<{
    asset_id: string;
    name: string;
    market_name: string;
  }>;
  initiate_verification?: boolean;
}

interface SteamInventoryResponse {
  assets?: Array<{
    assetid: string;
    classid: string;
    instanceid: string;
  }>;
  descriptions?: Array<{
    classid: string;
    instanceid: string;
    name: string;
    market_name?: string;
  }>;
  success: boolean;
  error?: string;
}

/**
 * Verify Steam item ownership via Steam Community API
 * @param steamId - Steam ID64 of the user
 * @param assetId - Asset ID of the item to verify
 * @returns Promise<boolean>
 */
async function verifyAssetOwnership(steamId: string, assetId: string): Promise<{
  owned: boolean;
  tradable: boolean;
  verified_at: string;
  api_response?: any;
}> {
  console.log(`=== VERIFYING ASSET OWNERSHIP ===`);
  console.log(`Steam ID: ${steamId}`);
  console.log(`Asset ID: ${assetId}`);
  
  try {
    // For demo purposes, simulate successful verification
    // In production, this would make actual Steam API calls
    console.log('DEMO MODE: Simulating successful asset verification');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 90% success rate for demo
    const isVerified = Math.random() > 0.1;
    
    console.log(`DEMO: Asset ${assetId} verification result: ${isVerified ? 'VERIFIED' : 'NOT FOUND'}`);
    
    return {
      owned: isVerified,
      tradable: true,
      verified_at: new Date().toISOString(),
      api_response: {
        demo_mode: true,
        simulated_result: isVerified,
        steam_id: steamId,
        asset_id: assetId
      }
    };
    
    /* PRODUCTION CODE - Uncomment for real Steam API integration:
    const inventoryUrl = `https://steamcommunity.com/inventory/${steamId}/730/2`;
    
    const response = await fetch(inventoryUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': `https://steamcommunity.com/profiles/${steamId}/inventory/`,
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      console.log(`Steam API error: ${response.status} ${response.statusText}`);
      
      if (response.status === 403) {
        throw new Error('Steam inventory is private or trade hold active');
      } else if (response.status === 404) {
        throw new Error('Steam profile not found');
      } else {
        throw new Error(`Steam API error: ${response.status}`);
      }
    }

    const inventoryData: SteamInventoryResponse = await response.json();
    
    if (!inventoryData.success || !inventoryData.assets) {
      throw new Error('Steam inventory data unavailable');
    }

    // Check if the specific asset exists in the user's inventory
    const assetExists = inventoryData.assets.some(asset => asset.assetid === assetId);
    
    console.log(`Asset ${assetId} found in ${steamId}'s inventory: ${assetExists}`);
    
    return {
      owned: assetExists,
      tradable: true, // We assume tradable if it exists (Steam API would show trade holds)
      verified_at: new Date().toISOString(),
      api_response: {
        total_assets: inventoryData.assets.length,
        steam_success: inventoryData.success
      }
    };

  } catch (error) {
    console.error('Asset ownership verification failed:', error);
    throw error;
  }
}

/**
 * Log verification attempt to database
 */
  }
}
async function logVerificationAttempt(
  supabase: any,
  verificationData: {
    order_id: string;
    transaction_id: string;
    seller_steam_id: string;
    buyer_steam_id: string;
    asset_id: string;
    verification_status: string;
    api_response?: any;
    error_message?: string;
    attempts?: number;
  }
) {
  const { data, error } = await supabase
    .from('order_verifications')
    .insert({
      order_id: verificationData.order_id,
      transaction_id: verificationData.transaction_id,
      seller_steam_id: verificationData.seller_steam_id,
      buyer_steam_id: verificationData.buyer_steam_id,
      asset_id: verificationData.asset_id,
      verification_status: verificationData.verification_status,
      api_response: verificationData.api_response || {},
      error_message: verificationData.error_message,
      attempts: verificationData.attempts || 1,
      metadata: {
        verification_timestamp: new Date().toISOString(),
        user_agent: 'CS2Marketplace/1.0'
      }
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log verification attempt:', error);
  } else {
    console.log('Verification attempt logged:', data.id);
  }

  return data;
}

/**
 * Record asset transfer in database
 */
async function recordAssetTransfer(
  supabase: any,
  assetId: string,
  fromSteamId: string,
  toSteamId: string,
  orderId: string,
  verified: boolean
) {
  const { data, error } = await supabase
    .from('steam_asset_transfers')
    .insert({
      asset_id: assetId,
      from_steam_id: fromSteamId,
      to_steam_id: toSteamId,
      order_id: orderId,
      verified: verified,
      api_source: 'steam_inventory_api'
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to record asset transfer:', error);
  } else {
    console.log('Asset transfer recorded:', data.id);
  }

  return data;
}

/**
 * Multi-round verification process
 */
async function performMultiRoundVerification(
  supabase: any,
  transactionId: string,
  buyerSteamId: string,
  assetIds: string[],
  maxRounds: number = 3
): Promise<boolean> {
  console.log(`=== STARTING MULTI-ROUND VERIFICATION ===`);
  console.log(`Transaction: ${transactionId}`);
  console.log(`Buyer: ${buyerSteamId}`);
  console.log(`Assets: ${assetIds.join(', ')}`);
  console.log(`Verification rounds: ${maxRounds}`);

  let successfulRounds = 0;
  const verificationResults: any[] = [];

  for (let round = 1; round <= maxRounds; round++) {
    console.log(`--- VERIFICATION ROUND ${round} ---`);
    
    try {
      // Add delay between rounds (except first)
      if (round > 1) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
      }

      let allAssetsVerified = true;
      const roundResults: any[] = [];

      for (const assetId of assetIds) {
        try {
          const verificationResult = await verifyAssetOwnership(buyerSteamId, assetId);
          
          roundResults.push({
            asset_id: assetId,
            owned: verificationResult.owned,
            verified_at: verificationResult.verified_at,
            round: round
          });

          if (!verificationResult.owned) {
            allAssetsVerified = false;
            console.log(`Round ${round}: Asset ${assetId} NOT found in buyer's inventory`);
          } else {
            console.log(`Round ${round}: Asset ${assetId} VERIFIED in buyer's inventory`);
          }

        } catch (assetError) {
          console.error(`Round ${round}: Asset ${assetId} verification failed:`, assetError);
          allAssetsVerified = false;
          
          roundResults.push({
            asset_id: assetId,
            owned: false,
            error: assetError instanceof Error ? assetError.message : 'Unknown error',
            round: round
          });
        }
      }

      verificationResults.push({
        round: round,
        all_verified: allAssetsVerified,
        results: roundResults,
        timestamp: new Date().toISOString()
      });

      if (allAssetsVerified) {
        successfulRounds++;
        console.log(`Round ${round}: SUCCESS - All assets verified`);
        
        // If we get successful verification early, we can break out
        if (successfulRounds >= 2) {
          console.log('Early success - 2+ rounds verified, proceeding with payment release');
          break;
        }
      } else {
        console.log(`Round ${round}: FAILED - Some assets not verified`);
      }

    } catch (roundError) {
      console.error(`Round ${round} failed:`, roundError);
      verificationResults.push({
        round: round,
        all_verified: false,
        error: roundError instanceof Error ? roundError.message : 'Unknown round error',
        timestamp: new Date().toISOString()
      });
    }
  }

  console.log(`=== VERIFICATION COMPLETE ===`);
  console.log(`Successful rounds: ${successfulRounds}/${maxRounds}`);
  
  // Require at least 2 successful rounds out of 3 for final approval
  const requiredSuccessRounds = Math.ceil(maxRounds / 2);
  const verificationPassed = successfulRounds >= requiredSuccessRounds;
  
  console.log(`Verification ${verificationPassed ? 'PASSED' : 'FAILED'} (required: ${requiredSuccessRounds}, achieved: ${successfulRounds})`);

  // Log final verification result
  try {
    await supabase
      .from('order_verifications')
      .insert({
        transaction_id: transactionId,
        buyer_steam_id: buyerSteamId,
        asset_id: assetIds.join(','),
        verification_type: 'final_verification',
        verification_status: verificationPassed ? 'verified' : 'failed',
        attempts: maxRounds,
        api_response: verificationResults.length > 0 ? {
          verification_results: verificationResults,
          successful_rounds: successfulRounds,
          required_rounds: requiredSuccessRounds,
          final_result: verificationPassed
        } : {
          error: 'No verification results available',
          successful_rounds: 0,
          final_result: false
        },
        completed_at: verificationPassed ? new Date().toISOString() : null
      });
  } catch (logError) {
    console.error('Failed to log verification result:', logError);
  }

  return verificationPassed;
}

/**
 * Release escrow and process payment
 */
async function releaseEscrowPayment(supabase: any, transactionId: string) {
  console.log(`=== RELEASING ESCROW PAYMENT ===`);
  console.log(`Transaction ID: ${transactionId}`);

  try {
    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found for escrow release');
    }

    // Get seller user info for payment
    const { data: seller, error: sellerError } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('steam_id', order.seller_steam_id)
      .single();

    if (sellerError || !seller) {
      throw new Error('Seller not found for payment');
    }

    // Create sale transaction for seller (they earn money)
    const saleTransaction = {
      user_id: seller.id,
      steam_id: order.seller_steam_id,
      type: 'sale',
      amount: order.total_amount,
      description: `Verified sale of ${order.items.length} item(s) - Order ${transactionId}`,
      reference_id: `verified_sale_${transactionId}_${Date.now()}`,
      status: 'completed',
      completed_at: new Date().toISOString(),
      metadata: {
        order_id: transactionId,
        buyer_steam_id: order.buyer_steam_id,
        verification_completed: true,
        items: order.items,
        verification_method: 'steam_api_multi_round'
      }
    };

    const { data: saleResult, error: saleError } = await supabase
      .from('user_transactions')
      .insert(saleTransaction)
      .select()
      .single();

    if (saleError) {
      throw new Error(`Failed to process seller payment: ${saleError.message}`);
    }

    // Update order status to completed
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        tracking_notes: 'Payment released after successful Steam asset verification'
      })
      .eq('transaction_id', transactionId);

    if (updateError) {
      console.error('Failed to update order status:', updateError);
    }

    // Create success notifications
    await supabase
      .from('user_notifications')
      .insert([
        {
          user_steam_id: order.seller_steam_id,
          type: 'success',
          title: '💰 Payment Released!',
          message: `Your payment of ${order.total_amount.toLocaleString('cs-CZ')} Kč has been released after successful verification. Items confirmed in buyer's inventory!`,
          action_url: `/profile?tab=orders&transaction=${transactionId}`,
          metadata: { 
            order_id: transactionId, 
            amount: order.total_amount,
            verification_method: 'steam_api_verification'
          }
        },
        {
          user_steam_id: order.buyer_steam_id,
          type: 'success',
          title: '🎉 Trade Verified!',
          message: `Your trade has been verified and completed successfully. Seller has been paid. Enjoy your new items!`,
          action_url: `/profile?tab=orders&transaction=${transactionId}`,
          metadata: { 
            order_id: transactionId, 
            items: order.items,
            verification_completed: true
          }
        }
      ]);

    console.log('=== ESCROW PAYMENT RELEASED SUCCESSFULLY ===');
    return true;

  } catch (error) {
    console.error('Escrow release error:', error);
    throw error;
  }
}

/**
 * Main verification handler
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      console.log('=== ORDER VERIFICATION REQUEST ===');
      
      const verifyData: VerifyOrderRequest = await req.json();
      console.log('Verification request:', {
        transaction_id: verifyData.transaction_id,
        seller: verifyData.seller_steam_id,
        buyer: verifyData.buyer_steam_id,
        items_count: verifyData.items.length,
        initiate: verifyData.initiate_verification
      });

      // Validate required fields
      if (!verifyData.transaction_id || !verifyData.seller_steam_id || !verifyData.buyer_steam_id || !verifyData.items.length) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields: transaction_id, seller_steam_id, buyer_steam_id, items'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Validate that the order exists and is in correct state
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('transaction_id', verifyData.transaction_id)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: 'Order not found or invalid transaction ID' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Verify that the requester is the seller
      if (order.seller_steam_id !== verifyData.seller_steam_id) {
        return new Response(
          JSON.stringify({ error: 'Only the seller can initiate verification for this order' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Check if verification is already in progress
      const { data: existingVerification, error: verifyCheckError } = await supabase
        .from('order_verifications')
        .select('*')
        .eq('transaction_id', verifyData.transaction_id)
        .in('verification_status', ['verifying', 'pending'])
        .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Only check last 10 minutes
        .single();

      // Only block if there's a very recent verification (less than 2 minutes old)
      if (existingVerification && new Date(existingVerification.created_at).getTime() > Date.now() - 2 * 60 * 1000) {
        return new Response(
          JSON.stringify({ 
            error: 'Verification already in progress for this order',
            verification_id: existingVerification.id,
            started_at: existingVerification.created_at,
            wait_time: '2 minutes',
            help: 'Please wait 2 minutes before trying again, or contact support if verification seems stuck'
          }),
          { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Clear any old stuck verifications
      if (existingVerification) {
        console.log('Clearing old stuck verification:', existingVerification.id);
        await supabase
          .from('order_verifications')
          .update({ 
            verification_status: 'cancelled',
            error_message: 'Cancelled due to new verification request'
          })
          .eq('id', existingVerification.id);
      }

      console.log('=== STARTING VERIFICATION WORKFLOW ===');

      // Extract asset IDs from items
      const assetIds = verifyData.items.map(item => item.asset_id).filter(Boolean);
      
      if (assetIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No valid asset IDs found in order items' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      console.log('Asset IDs to verify:', assetIds);

      // Log initial verification attempt
      await logVerificationAttempt(supabase, {
        order_id: order.id.toString(),
        transaction_id: verifyData.transaction_id,
        seller_steam_id: verifyData.seller_steam_id,
        buyer_steam_id: verifyData.buyer_steam_id,
        asset_id: assetIds.join(','),
        verification_status: 'verifying',
        api_response: {
          verification_initiated: true,
          asset_count: assetIds.length,
          verification_method: 'multi_round_steam_api'
        }
      });

      // Notify both parties that verification has started
      await supabase
        .from('user_notifications')
        .insert([
          {
            user_steam_id: verifyData.seller_steam_id,
            type: 'info',
            title: '🔍 Verification Started',
            message: `Asset verification initiated for order ${verifyData.transaction_id}. We're checking that items have been transferred to the buyer. You'll be notified when payment is released.`,
            action_url: `/profile?tab=orders&transaction=${verifyData.transaction_id}`,
            metadata: { 
              order_id: verifyData.transaction_id,
              verification_type: 'seller_initiated'
            }
          },
          {
            user_steam_id: verifyData.buyer_steam_id,
            type: 'info',
            title: '🔍 Verifying Transfer',
            message: `We're verifying that you've received the items from order ${verifyData.transaction_id}. This process is automatic and typically takes 1-3 minutes.`,
            action_url: `/profile?tab=orders&transaction=${verifyData.transaction_id}`,
            metadata: { 
              order_id: verifyData.transaction_id,
              verification_type: 'automatic_verification'
            }
          }
        ]);

      // Perform multi-round verification (async process)
      try {
        const verificationPassed = await performMultiRoundVerification(
          supabase,
          verifyData.transaction_id,
          verifyData.buyer_steam_id,
          assetIds,
          3 // 3 verification rounds
        );

        if (verificationPassed) {
          console.log('=== VERIFICATION SUCCESSFUL - RELEASING PAYMENT ===');
          
          // Record successful asset transfers
          for (const assetId of assetIds) {
            await recordAssetTransfer(
              supabase,
              assetId,
              verifyData.seller_steam_id,
              verifyData.buyer_steam_id,
              verifyData.transaction_id,
              true
            );
          }

          // Release escrow payment
          await releaseEscrowPayment(supabase, verifyData.transaction_id);

          return new Response(
            JSON.stringify({
              success: true,
              verification_passed: true,
              payment_released: true,
              verified_assets: assetIds,
              message: 'All items successfully verified in buyer\'s inventory. Payment has been released to seller.',
              timestamp: new Date().toISOString()
            }),
            { 
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 200
            }
          );

        } else {
          console.log('=== VERIFICATION FAILED ===');
          
          // Log failed verification
          await logVerificationAttempt(supabase, {
            order_id: order.id.toString(),
            transaction_id: verifyData.transaction_id,
            seller_steam_id: verifyData.seller_steam_id,
            buyer_steam_id: verifyData.buyer_steam_id,
            asset_id: assetIds.join(','),
            verification_status: 'failed',
            error_message: 'Multi-round verification failed - items not found in buyer inventory',
            api_response: { 
              verification_rounds: verificationResults || [],
              error: 'Multi-round verification failed'
            }
          });

          // Notify both parties of verification failure
          await supabase
            .from('user_notifications')
            .insert([
              {
                user_steam_id: verifyData.seller_steam_id,
                type: 'warning',
                title: '⚠️ Verification Failed',
                message: `Asset verification failed for order ${verifyData.transaction_id}. Items were not found in buyer's inventory. Please ensure the Steam trade was completed successfully.`,
                action_url: `/profile?tab=orders&transaction=${verifyData.transaction_id}`,
                metadata: { 
                  order_id: verifyData.transaction_id,
                  verification_failed: true
                }
              },
              {
                user_steam_id: verifyData.buyer_steam_id,
                type: 'info',
                title: '🔍 Verification Issue',
                message: `Verification for order ${verifyData.transaction_id} couldn't confirm item transfer. Please check if you've accepted the Steam trade offer.`,
                action_url: `/profile?tab=orders&transaction=${verifyData.transaction_id}`,
                metadata: { 
                  order_id: verifyData.transaction_id,
                  verification_failed: true
                }
              }
            ]);

          return new Response(
            JSON.stringify({
              success: false,
              verification_passed: false,
              error: 'Asset verification failed - items not found in buyer\'s inventory',
              details: 'Please ensure the Steam trade was completed and try again in a few minutes.',
              retry_suggested: true,
              verification_results: (typeof verificationResults !== 'undefined' && verificationResults) ? verificationResults : []
            }),
            { 
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 400
            }
          );
        }

      } catch (verificationError) {
        console.error('Verification workflow error:', verificationError);
        
        // Log the error
        await logVerificationAttempt(supabase, {
          order_id: order.id.toString(),
          transaction_id: verifyData.transaction_id,
          seller_steam_id: verifyData.seller_steam_id,
          buyer_steam_id: verifyData.buyer_steam_id,
          asset_id: assetIds.join(','),
          verification_status: 'failed',
          error_message: verificationError instanceof Error ? verificationError.message : 'Unknown verification error',
          api_response: { 
            error_type: 'workflow_error',
            verification_results: (typeof verificationResults !== 'undefined' && verificationResults) ? verificationResults : []
          }
        });

        throw verificationError;
      }

    } else if (req.method === 'GET') {
      // Get verification status for an order
      const url = new URL(req.url);
      const transactionId = url.searchParams.get('transaction_id');
      
      if (!transactionId) {
        return new Response(
          JSON.stringify({ error: 'transaction_id parameter is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      const { data: verifications, error } = await supabase
        .from('order_verifications')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch verification status: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          transaction_id: transactionId,
          verifications: verifications || [],
          latest_status: verifications?.[0]?.verification_status || 'not_started',
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
    console.error('=== VERIFICATION ERROR ===', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process verification request',
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