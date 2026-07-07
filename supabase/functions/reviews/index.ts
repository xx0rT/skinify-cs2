/*
  reviews — public-profile trader reviews.

  The user_reviews table's RLS only serves the `authenticated` role,
  but Skinify's Steam-OpenID users run on the anon key — so reads AND
  writes must go through this service-role function. It also owns the
  eligibility rule so the client can't fake it:

    GET  ?steam_id=<profile>            → { reviews, stats, can_review }
         (optional x-steam-id header = viewer, used for can_review)
    POST { reviewed_steam_id, rating, comment }
         headers: x-steam-id = reviewer
         → verifies a completed order exists between the two users and
           that the reviewer hasn't already reviewed this user, then
           inserts with proper users.id uuids.
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-steam-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
};

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

async function userBySteamId(supabase: any, steamId: string) {
  const { data } = await supabase
    .from('users')
    .select('id, display_name, avatar_url')
    .eq('steam_id', steamId)
    .maybeSingle();
  return data;
}

async function hasCompletedTrade(supabase: any, a: string, b: string) {
  const { data } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'completed')
    .or(
      `and(buyer_steam_id.eq.${a},seller_steam_id.eq.${b}),and(buyer_steam_id.eq.${b},seller_steam_id.eq.${a})`,
    )
    .limit(1);
  return !!data && data.length > 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'Server misconfigured.' });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const profileSteamId = url.searchParams.get('steam_id') || '';
      if (!/^\d{17}$/.test(profileSteamId)) {
        return json(400, { error: 'steam_id query param required (17 digits).' });
      }
      const profileUser = await userBySteamId(supabase, profileSteamId);
      if (!profileUser) {
        return json(200, { reviews: [], can_review: false });
      }

      const { data: reviews, error } = await supabase
        .from('user_reviews')
        .select(
          `id, reviewer_id, rating, comment, is_verified_purchase, created_at,
           reviewer:users!user_reviews_reviewer_id_fkey(display_name, avatar_url)`,
        )
        .eq('reviewed_user_id', profileUser.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return json(500, { error: error.message });

      /* Eligibility for the viewer (when identified). */
      let canReview = false;
      const viewerSteamId = req.headers.get('x-steam-id') || '';
      if (/^\d{17}$/.test(viewerSteamId) && viewerSteamId !== profileSteamId) {
        const viewer = await userBySteamId(supabase, viewerSteamId);
        if (viewer) {
          const [traded, { data: existing }] = await Promise.all([
            hasCompletedTrade(supabase, viewerSteamId, profileSteamId),
            supabase
              .from('user_reviews')
              .select('id')
              .eq('reviewer_id', viewer.id)
              .eq('reviewed_user_id', profileUser.id)
              .maybeSingle(),
          ]);
          canReview = traded && !existing;
        }
      }

      return json(200, { reviews: reviews || [], can_review: canReview });
    }

    if (req.method === 'POST') {
      const reviewerSteamId = req.headers.get('x-steam-id') || '';
      if (!/^\d{17}$/.test(reviewerSteamId)) {
        return json(400, { error: 'x-steam-id header required.' });
      }
      const body = await req.json().catch(() => ({}));
      const reviewedSteamId = String(body?.reviewed_steam_id || '');
      const rating = Number(body?.rating);
      const comment = String(body?.comment || '').trim().slice(0, 1000);

      if (!/^\d{17}$/.test(reviewedSteamId)) {
        return json(400, { error: 'reviewed_steam_id required.' });
      }
      if (reviewedSteamId === reviewerSteamId) {
        return json(400, { error: 'You cannot review yourself.' });
      }
      if (!Number.isFinite(rating) || rating < 0.5 || rating > 5) {
        return json(400, { error: 'Rating must be between 0.5 and 5.' });
      }
      if (!comment) {
        return json(400, { error: 'Comment required.' });
      }

      const [reviewer, reviewed] = await Promise.all([
        userBySteamId(supabase, reviewerSteamId),
        userBySteamId(supabase, reviewedSteamId),
      ]);
      if (!reviewer || !reviewed) {
        return json(404, { error: 'User not found.' });
      }

      const traded = await hasCompletedTrade(supabase, reviewerSteamId, reviewedSteamId);
      if (!traded) {
        return json(403, {
          error: 'You can only review users after a completed trade with them.',
        });
      }

      const { data: existing } = await supabase
        .from('user_reviews')
        .select('id')
        .eq('reviewer_id', reviewer.id)
        .eq('reviewed_user_id', reviewed.id)
        .maybeSingle();
      if (existing) {
        return json(409, { error: 'You already reviewed this user.' });
      }

      /* The table's rating column is integer — round half-stars. */
      const { data: row, error } = await supabase
        .from('user_reviews')
        .insert({
          reviewer_id: reviewer.id,
          reviewed_user_id: reviewed.id,
          rating: Math.round(rating),
          comment,
          is_verified_purchase: true,
        })
        .select('id, created_at')
        .single();
      if (error) return json(500, { error: error.message });

      /* Tell the seller they got reviewed. */
      await supabase.from('user_notifications').insert({
        user_steam_id: reviewedSteamId,
        type: 'info',
        title: 'New review on your profile',
        message: `${reviewer.display_name || 'A trader'} rated you ${Math.round(rating)}/5.`,
        metadata: { review_id: row.id, rating: Math.round(rating) },
      });

      return json(201, { data: row });
    }

    return json(405, { error: 'Use GET or POST.' });
  } catch (e: any) {
    return json(500, { error: e?.message || 'Unexpected error.' });
  }
});
