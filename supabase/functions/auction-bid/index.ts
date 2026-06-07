// supabase/functions/auction-bid/index.ts
//
// POST /functions/v1/auction-bid
//   body: { listing_id, steam_id, amount }
//   → places a bid on an auction listing after validating:
//     - the listing exists, is active, and listing_type = 'auction'
//     - auction_end_time is still in the future
//     - amount >= max(current_bid + min increment, minimum_bid)
//     - bidder is not the seller
//
// GET /functions/v1/auction-bid?listing_id=<uuid>
//   → returns the bid history for a listing with bidder names anonymised
//     to "Bidder #abcd" handles. Used by the item detail page and the
//     marketplace card.

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const MIN_INCREMENT = 1.0; // 1 CZK (~$0.04) minimum step between bids

/* Deterministic 6-char hex handle: stable per (listing_id + bidder).
   This way a single bidder's history within one auction stays
   consistent ("Bidder #a1f2c8 placed 3 bids"), while their identity
   across different listings cannot be correlated. */
async function makeHandle(listingId: string, steamId: string): Promise<string> {
  const data = new TextEncoder().encode(`${listingId}:${steamId}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.slice(0, 3).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS, status: 200 });
  }

  const sbUrl = Deno.env.get('SUPABASE_URL');
  const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!sbUrl || !sbKey) {
    return new Response(
      JSON.stringify({ error: 'Service not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } },
    );
  }
  const supabase = createClient(sbUrl, sbKey);

  try {
    /* ─────────── GET — bid history ─────────── */
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const listingId = url.searchParams.get('listing_id');
      if (!listingId) {
        return new Response(
          JSON.stringify({ error: 'listing_id is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } },
        );
      }

      const { data, error } = await supabase
        .from('auction_bids')
        .select('id, bidder_handle, amount, created_at')
        .eq('listing_id', listingId)
        .order('amount', { ascending: false })
        .limit(50);

      if (error) throw error;
      return new Response(JSON.stringify({ bids: data || [] }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=5',
          ...CORS,
        },
      });
    }

    /* ─────────── POST — place a bid ─────────── */
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const listingId = String(body.listing_id || '').trim();
      const steamId = String(body.steam_id || '').trim();
      const amount = Number(body.amount);

      if (!listingId || !steamId || !Number.isFinite(amount) || amount <= 0) {
        return new Response(
          JSON.stringify({
            error: 'listing_id, steam_id, and a positive amount are required',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } },
        );
      }

      /* Pull the listing & validate it's an active future auction */
      const { data: listing, error: listErr } = await supabase
        .from('marketplace_listings')
        .select(
          'id, steam_id, listing_type, is_active, auction_end_time, minimum_bid, current_bid, buyout_price',
        )
        .eq('id', listingId)
        .maybeSingle();

      if (listErr || !listing) {
        return new Response(
          JSON.stringify({ error: 'Listing not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...CORS } },
        );
      }
      if (!listing.is_active) {
        return new Response(
          JSON.stringify({ error: 'Listing is no longer active' }),
          { status: 409, headers: { 'Content-Type': 'application/json', ...CORS } },
        );
      }
      if (listing.listing_type !== 'auction') {
        return new Response(
          JSON.stringify({ error: 'Listing is not an auction' }),
          { status: 409, headers: { 'Content-Type': 'application/json', ...CORS } },
        );
      }
      if (listing.auction_end_time && new Date(listing.auction_end_time).getTime() <= Date.now()) {
        return new Response(
          JSON.stringify({ error: 'Auction has ended' }),
          { status: 409, headers: { 'Content-Type': 'application/json', ...CORS } },
        );
      }
      if (String(listing.steam_id) === steamId) {
        return new Response(
          JSON.stringify({ error: 'You cannot bid on your own auction' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...CORS } },
        );
      }

      const minBid =
        Math.max(
          Number(listing.minimum_bid || 0),
          Number(listing.current_bid || 0) + MIN_INCREMENT,
        );

      if (amount < minBid) {
        return new Response(
          JSON.stringify({
            error: `Bid must be at least ${minBid.toFixed(2)} CZK`,
            min_bid: minBid,
          }),
          { status: 422, headers: { 'Content-Type': 'application/json', ...CORS } },
        );
      }

      /* Buyout shortcut — if the bid meets/exceeds buyout, end the
         auction immediately. */
      const isBuyout =
        listing.buyout_price && amount >= Number(listing.buyout_price);

      const handle = await makeHandle(listingId, steamId);

      const { error: insertErr } = await supabase.from('auction_bids').insert({
        listing_id: listingId,
        bidder_steam_id: steamId,
        bidder_handle: `#${handle}`,
        amount,
      });
      if (insertErr) throw insertErr;

      if (isBuyout) {
        /* End the auction. We just flip is_active off and set
           current_bid to the buyout amount; an order/escrow flow can
           pick this up out of band. */
        await supabase
          .from('marketplace_listings')
          .update({
            is_active: false,
            auction_end_time: new Date().toISOString(),
            current_bid: amount,
          })
          .eq('id', listingId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          handle: `#${handle}`,
          amount,
          buyout: !!isBuyout,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json', ...CORS } },
      );
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || 'Unexpected error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } },
    );
  }
});
