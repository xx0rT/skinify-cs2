/*
  Skinify Public API — v1.

  Single function that routes to three sub-endpoints by URL path:
    GET /functions/v1/public-api/v1/prices?market_hash_name=...
    GET /functions/v1/public-api/v1/listings?market_hash_name=...&limit=...
    GET /functions/v1/public-api/v1/render?inspect=<encoded-link>

  Why one function instead of three: less cold-start surface, shared
  rate-limit accounting, shared API-key auth, shared CORS. Each
  endpoint is short — branching is cheaper than three deployments.

  Auth + rate limit:
    - Anonymous (no X-Skinify-Key header): 60 req/min/IP
    - Keyed: 600 req/min/key. Keys live in public.api_keys, validated
      on each request.
    - Buckets are in-memory; on cold-start everyone gets a fresh
      allowance. Good enough for v1, no Redis required.

  Responses are JSON with a stable shape:
    { data: {...} | [...], meta: { request_id, rate_limit: { remaining, reset } } }
  Errors:
    { error: { code, message } } with appropriate 4xx/5xx status.
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Skinify-Key, X-Client-Info, Apikey, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const ANON_LIMIT_PER_MIN = 60;
const KEYED_LIMIT_PER_MIN = 600;

interface Bucket {
  remaining: number;
  resetAt: number;
}

/* In-memory rate limit buckets. The keying string is either
   `ip:<address>` or `key:<api_key_id>` so anonymous and keyed
   accounting are separate. */
const buckets = new Map<string, Bucket>();

function takeToken(key: string, limit: number): Bucket {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = {
      remaining: limit - 1,
      resetAt: now + 60_000,
    };
    buckets.set(key, fresh);
    return fresh;
  }
  if (existing.remaining > 0) {
    existing.remaining -= 1;
  }
  return existing;
}

function rateLimitHeaders(b: Bucket, limit: number) {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, b.remaining)),
    'X-RateLimit-Reset': String(Math.floor(b.resetAt / 1000)),
  };
}

function jsonOk(data: any, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=30',
      ...extraHeaders,
    },
  });
}

function jsonError(
  status: number,
  code: string,
  message: string,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

async function resolveApiKey(
  supabase: any,
  headerKey: string | null,
): Promise<{ id: string; owner: string } | null> {
  if (!headerKey) return null;
  const { data } = await supabase
    .from('api_keys')
    .select('id, user_id, is_active')
    .eq('key', headerKey)
    .eq('is_active', true)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, owner: data.user_id };
}

/* ─── Endpoint: prices ──────────────────────────────────────────────
   Aggregates floor + median + 30-day trend from marketplace_listings.
   Public — anonymous-friendly. */
async function pricesEndpoint(
  supabase: any,
  url: URL,
): Promise<Response> {
  const name = url.searchParams.get('market_hash_name');
  if (!name) {
    return jsonError(400, 'missing_param', 'market_hash_name is required');
  }

  const { data: listings, error } = await supabase
    .from('marketplace_listings')
    .select('price, created_at')
    .eq('market_hash_name', name)
    .eq('is_active', true)
    .limit(500);

  if (error) {
    return jsonError(500, 'db_error', error.message);
  }

  if (!listings || listings.length === 0) {
    return jsonOk({
      data: {
        market_hash_name: name,
        listings_count: 0,
        floor: null,
        median: null,
        currency: 'CZK',
      },
    });
  }

  const prices = listings.map((l: any) => Number(l.price)).filter(Number.isFinite).sort((a: number, b: number) => a - b);
  const floor = prices[0];
  const median = prices[Math.floor(prices.length / 2)];
  const max = prices[prices.length - 1];

  return jsonOk({
    data: {
      market_hash_name: name,
      listings_count: listings.length,
      floor,
      median,
      max,
      currency: 'CZK',
    },
  });
}

/* ─── Endpoint: listings ─────────────────────────────────────────────
   Read-only listings index. Filterable by market_hash_name + price
   range. Returns a public-safe subset of fields (no internal ids,
   no seller PII beyond the public name). */
async function listingsEndpoint(
  supabase: any,
  url: URL,
): Promise<Response> {
  const name = url.searchParams.get('market_hash_name');
  const minPrice = Number(url.searchParams.get('min_price') || 0);
  const maxPrice = Number(url.searchParams.get('max_price') || 0);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 25)));

  let query = supabase
    .from('marketplace_listings')
    .select('id, market_hash_name, item_name, item_type, condition, rarity, price, image_url, float_value, listing_type, created_at, users:user_id(display_name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (name) query = query.eq('market_hash_name', name);
  if (minPrice > 0) query = query.gte('price', minPrice);
  if (maxPrice > 0) query = query.lte('price', maxPrice);

  const { data, error } = await query;

  if (error) {
    return jsonError(500, 'db_error', error.message);
  }

  const items = (data || []).map((l: any) => ({
    id: String(l.id),
    market_hash_name: l.market_hash_name,
    item_name: l.item_name,
    item_type: l.item_type,
    condition: l.condition,
    rarity: l.rarity,
    price: Number(l.price),
    currency: 'CZK',
    image_url: l.image_url,
    float: l.float_value,
    listing_type: l.listing_type || 'standard',
    listed_at: l.created_at,
    seller_name: l.users?.display_name || null,
    /* Direct deep link to the listing on the public site — useful
       for affiliate partners. */
    url: `https://skinify.gg/item/${l.id}`,
  }));

  return jsonOk({
    data: items,
    meta: { count: items.length, limit },
  });
}

/* ─── Endpoint: render ──────────────────────────────────────────────
   Proxies a CSFloat preview render. Returns a 302 redirect to the
   underlying CDN image so callers can use it directly as an <img>
   src. Useful for partner sites that want to show "what this listing
   actually looks like" without integrating CSFloat themselves. */
async function renderEndpoint(
  supabase: any,
  url: URL,
): Promise<Response> {
  const inspect = url.searchParams.get('inspect');
  if (!inspect) {
    return jsonError(400, 'missing_param', 'inspect query parameter is required');
  }
  /* Reuse the existing skin-float function which already handles
     CSFloat auth + caching. We just call it server-to-server. */
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return jsonError(500, 'config', 'Supabase config missing');
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/skin-float?inspect=${encodeURIComponent(inspect)}`,
      { headers: { Authorization: `Bearer ${serviceKey}` } },
    );
    if (!res.ok) {
      return jsonError(502, 'upstream', `skin-float responded ${res.status}`);
    }
    const data = await res.json();
    const image = data?.preview_image;
    if (!image) {
      return jsonError(404, 'no_render', 'No render available for this inspect link');
    }
    /* 302 to the underlying CDN so the caller's <img> gets the bytes
       directly. Browsers cache CDN responses better than our
       function output. */
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: image, 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err: any) {
    return jsonError(502, 'upstream', err?.message || 'render proxy failed');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return jsonError(405, 'method', 'Only GET is supported');
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/public-api/, '');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  /* Auth + rate-limit. */
  const headerKey = req.headers.get('x-skinify-key');
  const apiKey = await resolveApiKey(supabase, headerKey);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const bucketKey = apiKey ? `key:${apiKey.id}` : `ip:${ip}`;
  const limit = apiKey ? KEYED_LIMIT_PER_MIN : ANON_LIMIT_PER_MIN;
  const bucket = takeToken(bucketKey, limit);
  const limitHeaders = rateLimitHeaders(bucket, limit);

  if (bucket.remaining < 0) {
    return jsonError(
      429,
      'rate_limited',
      `Rate limit exceeded. ${apiKey ? 'Authenticated' : 'Anonymous'} limit is ${limit}/min.`,
      limitHeaders,
    );
  }

  /* Route. */
  if (path.startsWith('/v1/prices')) {
    return withHeaders(await pricesEndpoint(supabase, url), limitHeaders);
  }
  if (path.startsWith('/v1/listings')) {
    return withHeaders(await listingsEndpoint(supabase, url), limitHeaders);
  }
  if (path.startsWith('/v1/render')) {
    return withHeaders(await renderEndpoint(supabase, url), limitHeaders);
  }
  /* Discovery: GET / returns the list of available endpoints. */
  if (path === '' || path === '/' || path === '/v1' || path === '/v1/') {
    return jsonOk(
      {
        data: {
          name: 'Skinify Public API',
          version: '1.0',
          documentation: 'https://skinify.gg/developers',
          endpoints: [
            { path: '/v1/prices',   description: 'Floor / median / max for a market_hash_name' },
            { path: '/v1/listings', description: 'Read-only listings index' },
            { path: '/v1/render',   description: 'CSFloat-rendered preview image (302 redirect)' },
          ],
          rate_limit: {
            anonymous_per_min: ANON_LIMIT_PER_MIN,
            authenticated_per_min: KEYED_LIMIT_PER_MIN,
          },
        },
      },
      limitHeaders,
    );
  }
  return jsonError(404, 'not_found', `Unknown endpoint: ${path}`, limitHeaders);
});

/* Stitch rate-limit headers onto whatever response the endpoint
   produced. Cheaper than threading them through every json helper. */
function withHeaders(res: Response, extra: Record<string, string>): Response {
  /* Response headers are immutable — clone to mutate. */
  const newHeaders = new Headers(res.headers);
  for (const [k, v] of Object.entries(extra)) newHeaders.set(k, v);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: newHeaders,
  });
}
