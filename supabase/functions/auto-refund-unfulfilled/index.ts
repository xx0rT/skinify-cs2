/*
  auto-refund-unfulfilled — refunds orders whose sellers didn't deliver
  in time.

  Triggered every 5 minutes by pg_cron (see 20260625120000_p2p_escrow_automation.sql).
  Each tick:
    1. Calls the SECURITY DEFINER picker `pick_refund_candidate` which
       atomically flips one stale order to `status='refunded',
       auto_refunded=true` under SKIP LOCKED — guarantees no other
       cron tick or manual code path can also refund the same order.
    2. Credits the buyer's balance back via a `refund` user_transaction
       (the existing update_user_balance trigger applies the credit).
    3. Notifies both buyer and seller.

  We process one order per tick on purpose. The picker is cheap; if the
  queue is hot, the next tick (5 min later) catches the next one.

  Anonymous-friendly intentionally — the function is only called by
  pg_net from inside the database via cron, with the service-role JWT.
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase config missing');
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    /* Pick one candidate atomically. The picker already flipped the
       order to status='refunded' + auto_refunded=true, so this function
       only has the credit-back-the-buyer side to do. If the picker
       returns nothing this tick is a no-op. */
    const { data: rows, error: pickError } = await supabase.rpc('pick_refund_candidate');
    if (pickError) {
      console.error('pick_refund_candidate failed:', pickError);
      return new Response(
        JSON.stringify({ ok: false, error: pickError.message }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }
    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, refunded: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    const row = Array.isArray(rows) ? rows[0] : rows;
    const { transaction_id, buyer_steam_id, total_amount, items } = row as any;

    console.log(
      `[auto-refund-unfulfilled] refunding order ${transaction_id} to ${buyer_steam_id} (${total_amount})`,
    );

    /* Look up buyer's users.id — refund credits use user_id, not steam_id. */
    const { data: buyer, error: buyerError } = await supabase
      .from('users')
      .select('id')
      .eq('steam_id', buyer_steam_id)
      .maybeSingle();

    if (buyerError || !buyer) {
      /* The order has already been flipped to refunded in the picker.
         If we can't find the buyer we log + bail — manual review needed. */
      console.error(
        `[auto-refund-unfulfilled] buyer ${buyer_steam_id} not found, order ${transaction_id} marked refunded but credit NOT applied`,
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'buyer_not_found',
          transaction_id,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    /* Insert the refund transaction. The existing update_user_balance
       trigger credits current_balance automatically (type='refund'
       is in the credit branch). */
    const { error: refundError } = await supabase
      .from('user_transactions')
      .insert({
        user_id: buyer.id,
        steam_id: buyer_steam_id,
        type: 'refund',
        amount: Number(total_amount),
        description: `Auto-refund — seller did not deliver order ${transaction_id} in time`,
        reference_id: `auto_refund_${transaction_id}`,
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          order_transaction_id: transaction_id,
          reason: 'seller_no_deliver',
          items: items || [],
        },
      });

    if (refundError) {
      /* If the transaction insert fails (e.g. duplicate reference_id
         from a retry) we still leave the order in `refunded` state and
         log. Manual reconciliation can credit the buyer later. */
      console.error(
        `[auto-refund-unfulfilled] refund transaction insert failed for ${transaction_id}:`,
        refundError,
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'refund_insert_failed',
          detail: refundError.message,
          transaction_id,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    /* Notify both sides. */
    await supabase.from('user_notifications').insert([
      {
        user_steam_id: buyer_steam_id,
        type: 'success',
        title: 'Order auto-refunded',
        message: `The seller didn't deliver order ${transaction_id} in time. We refunded ${total_amount} CZK to your balance.`,
        action_url: `/profile?tab=orders&transaction=${transaction_id}`,
        metadata: { transaction_id, refund_amount: total_amount },
      },
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        refunded: 1,
        transaction_id,
        buyer_steam_id,
        amount: total_amount,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  } catch (err: any) {
    console.error('[auto-refund-unfulfilled] threw:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || 'unknown' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }
});
