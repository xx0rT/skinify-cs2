import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { orderId, buyerId, sellerId, action, itemIds } = await req.json()

    if (!orderId || !buyerId || !sellerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle different actions
    if (action === 'buyer_confirm') {
      // Buyer confirms they received the items
      const { data: log, error: logError } = await supabase
        .from('trade_verification_logs')
        .update({
          items_confirmed: true,
          buyer_confirmed_at: new Date().toISOString(),
          verification_status: 'verified'
        })
        .eq('order_id', orderId)
        .eq('buyer_id', buyerId)
        .select()
        .single()

      if (logError) throw logError

      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, marketplace_listings(price)')
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError

      // Create pending wallet entry for seller
      const holdUntil = new Date()
      holdUntil.setDate(holdUntil.getDate() + 7) // 7 days from now

      const { data: pendingWallet, error: walletError } = await supabase
        .from('pending_wallet')
        .insert({
          user_id: sellerId,
          order_id: orderId,
          amount: order.marketplace_listings.price,
          status: 'pending',
          hold_until: holdUntil.toISOString(),
          items_verification: JSON.stringify(itemIds || []),
          verified_at: new Date().toISOString()
        })
        .select()
        .single()

      if (walletError) throw walletError

      // Update order status
      await supabase
        .from('orders')
        .update({
          status: 'completed',
          pending_release: true
        })
        .eq('id', orderId)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Trade confirmed by buyer. Funds will be held for 7 days.',
          pendingWallet
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'webhook_verify') {
      // Steam webhook verification (when trade completes)
      const { data: log, error: logError } = await supabase
        .from('trade_verification_logs')
        .insert({
          order_id: orderId,
          buyer_id: buyerId,
          seller_id: sellerId,
          verification_type: 'webhook',
          verification_status: 'pending',
          items_sent: JSON.stringify(itemIds || []),
          items_confirmed: false
        })
        .select()
        .single()

      if (logError) throw logError

      // Send notification to buyer to confirm
      await supabase
        .from('notifications')
        .insert({
          user_id: buyerId,
          type: 'trade_confirmation',
          title: 'Confirm Item Receipt',
          message: 'Please confirm you have received your items from the seller.',
          metadata: JSON.stringify({ orderId, logId: log.id })
        })

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Trade logged. Waiting for buyer confirmation.',
          log
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'check_inventory') {
      // Check if buyer still has items (called after 7 days)
      const { data: pendingWallets, error: walletError } = await supabase
        .from('pending_wallet')
        .select('*')
        .eq('status', 'pending')
        .lte('hold_until', new Date().toISOString())

      if (walletError) throw walletError

      const results = []

      for (const wallet of pendingWallets || []) {
        // In production, this would call Steam API to check inventory
        // For now, we'll simulate verification
        const itemsStillOwned = true // Placeholder

        if (itemsStillOwned) {
          // Release funds
          const { error: releaseError } = await supabase
            .from('pending_wallet')
            .update({
              status: 'released',
              released_at: new Date().toISOString()
            })
            .eq('id', wallet.id)

          if (releaseError) throw releaseError

          // Add funds to seller's wallet
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              user_id: wallet.user_id,
              type: 'pending_release',
              amount: wallet.amount,
              description: `Funds released from escrow for order ${wallet.order_id}`,
              status: 'completed'
            })

          if (transactionError) throw transactionError

          // Notify seller
          await supabase
            .from('notifications')
            .insert({
              user_id: wallet.user_id,
              type: 'funds_released',
              title: 'Funds Released',
              message: `${wallet.amount} Kč has been released to your wallet.`,
              metadata: JSON.stringify({ orderId: wallet.order_id })
            })

          results.push({ walletId: wallet.id, status: 'released' })
        } else {
          // Items were refunded/not in inventory - cancel release
          await supabase
            .from('pending_wallet')
            .update({ status: 'cancelled' })
            .eq('id', wallet.id)

          results.push({ walletId: wallet.id, status: 'cancelled' })
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Processed ${results.length} pending wallets`,
          results
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Trade verification error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
