/*
  Skinify Public API — v1.

  Single function that routes to the documented endpoint tree by URL path.
  Documented in /docs (the in-app reference). Endpoint surface:

    GET /v1/prices?market_hash_name=...
    GET /v1/listings?market_hash_name=...&type=...&rarity=...&sort=...
    GET /v1/listings/:id
    GET /v1/search?q=...&limit=...
    GET /v1/render?inspect=...
    GET /v1/trends?market_hash_name=...&days=30
    GET /v1/floor?names=...    (bulk)
    GET /v1/inventory/:steamId
    GET /v1/shops/:url
    GET /v1/shops/:url/listings

  Why one function instead of ten: less cold-start surface, shared
  rate-limit accounting, shared API-key auth, shared CORS. Each
  endpoint is short — branching is cheaper than separate deployments.

  Auth + rate limit:
    - Anonymous (no X-Skinify-Key header): 60 req/min/IP
    - Keyed: 600 req/min/key. Keys live in public.api_keys, validated
      on each request and lazily `last_used_at`-stamped.
    - Buckets are in-memory; on cold-start everyone gets a fresh
      allowance. Good enough for v1, no Redis required.

  Responses are JSON with a stable shape:
    { data: {...} | [...], meta: {...} }
  Errors:
    { error: { code, message, request_id } } with appropriate 4xx/5xx status.
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
      'X-Request-Id': newRequestId(),
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
  const requestId = newRequestId();
  return new Response(
    JSON.stringify({ error: { code, message, request_id: requestId } }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        ...extraHeaders,
      },
    },
  );
}

/* Short, sortable request id used in error envelopes and in the
   X-Request-Id header on every response. Format mirrors Stripe /
   Supabase: `req_<24 hex chars>`. Crypto.randomUUID is on Deno
   without polyfills. */
function newRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

/* FX rates anchored at CZK = 1. Mirrors the client-side
   currencyStore so docs examples + server output line up. We do
   the conversion server-side instead of in JSON post-processing
   so floor/median/max get the same rate without per-call drift.

   Update note: keep this in sync with src/store/currencyStore.ts;
   when one bumps, the other should within the same commit. */
const FX_RATES_FROM_CZK: Record<string, number> = {
  CZK: 1.0,
  USD: 0.0426,
  EUR: 0.0392,
  GBP: 0.0337,
  PLN: 0.1774,
  HUF: 8.73,
};

function convertFromCzk(value: number, targetCurrency: string): number {
  const rate = FX_RATES_FROM_CZK[targetCurrency.toUpperCase()];
  if (!rate) return value; // unknown currency → leave in CZK
  /* Round to 2dp for fiat, 4dp for HUF (which has large unit values). */
  const dp = targetCurrency.toUpperCase() === 'HUF' ? 0 : 2;
  return Math.round(value * rate * Math.pow(10, dp)) / Math.pow(10, dp);
}

function resolveCurrency(url: URL): string {
  const raw = (url.searchParams.get('currency') || 'CZK').toUpperCase();
  return FX_RATES_FROM_CZK[raw] ? raw : 'CZK';
}

async function resolveApiKey(
  supabase: any,
  headerKey: string | null,
): Promise<{ id: string; owner: string } | null> {
  if (!headerKey) return null;
  /* Also accept "Authorization: Bearer sk_live_..." as a fallback for
     clients that prefer the standard Authorization header — but the
     header value still has to start with our key prefix to qualify
     (so we don't accidentally match Supabase's own anon JWT). */
  const cleaned = headerKey.startsWith('Bearer ')
    ? headerKey.slice(7).trim()
    : headerKey.trim();
  if (!cleaned.startsWith('sk_live_') && !cleaned.startsWith('sk_test_')) {
    return null;
  }
  const { data } = await supabase
    .from('api_keys')
    .select('id, user_id, is_active')
    .eq('key', cleaned)
    .eq('is_active', true)
    .maybeSingle();
  if (!data) return null;
  /* Lazy last_used_at update — fire-and-forget so we don't add a
     round-trip to every API call. The 60-second floor avoids
     hammering the DB for high-rate clients. */
  void (async () => {
    try {
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);
    } catch {
      /* swallow — telemetry, not correctness */
    }
  })();
  return { id: data.id, owner: data.user_id };
}

/* ─── Endpoint: prices ──────────────────────────────────────────────
   Aggregates floor / median / max for one market_hash_name. */
async function pricesEndpoint(supabase: any, url: URL): Promise<Response> {
  const name = url.searchParams.get('market_hash_name');
  if (!name) {
    return jsonError(400, 'missing_param', 'market_hash_name is required');
  }
  const currency = resolveCurrency(url);

  const { data: listings, error } = await supabase
    .from('marketplace_listings')
    .select('price')
    .eq('market_hash_name', name)
    .eq('is_active', true)
    .limit(500);

  if (error) return jsonError(500, 'db_error', error.message);

  if (!listings || listings.length === 0) {
    return jsonOk({
      data: {
        market_hash_name: name,
        listings_count: 0,
        floor: null,
        median: null,
        max: null,
        currency,
      },
    });
  }

  const prices = listings
    .map((l: any) => Number(l.price))
    .filter(Number.isFinite)
    .sort((a: number, b: number) => a - b);
  const floor = convertFromCzk(prices[0], currency);
  const median = convertFromCzk(prices[Math.floor(prices.length / 2)], currency);
  const max = convertFromCzk(prices[prices.length - 1], currency);

  return jsonOk({
    data: {
      market_hash_name: name,
      listings_count: listings.length,
      floor,
      median,
      max,
      currency,
    },
  });
}

/* ─── Endpoint: listings ─────────────────────────────────────────────
   Read-only listings index with filters, sort, and cursor pagination. */
async function listingsEndpoint(supabase: any, url: URL): Promise<Response> {
  const name = url.searchParams.get('market_hash_name');
  const type = url.searchParams.get('type');
  const rarity = url.searchParams.get('rarity');
  const minPrice = Number(url.searchParams.get('min_price') || 0);
  const maxPrice = Number(url.searchParams.get('max_price') || 0);
  const sort = (url.searchParams.get('sort') || 'newest').toLowerCase();
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('limit') || 25)),
  );
  const currency = resolveCurrency(url);
  const cursor = decodeCursor(url.searchParams.get('cursor'));

  let query = supabase
    .from('marketplace_listings')
    .select(
      'id, market_hash_name, item_name, item_type, condition, rarity, price, image_url, float_value, created_at, users:user_id(display_name)',
    )
    .eq('is_active', true)
    .limit(limit + 1); // +1 to compute meta.next without a count(*)

  if (name) query = query.eq('market_hash_name', name);
  if (type) query = query.eq('item_type', type);
  if (rarity) query = query.eq('rarity', rarity);
  if (minPrice > 0) {
    const minCzk = currency === 'CZK' ? minPrice : minPrice / FX_RATES_FROM_CZK[currency];
    query = query.gte('price', minCzk);
  }
  if (maxPrice > 0) {
    const maxCzk = currency === 'CZK' ? maxPrice : maxPrice / FX_RATES_FROM_CZK[currency];
    query = query.lte('price', maxCzk);
  }

  switch (sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true }).order('id', { ascending: true });
      if (cursor?.id) query = query.gt('id', cursor.id);
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false }).order('id', { ascending: false });
      if (cursor?.id) query = query.lt('id', cursor.id);
      break;
    case 'float_asc':
      query = query.order('float_value', { ascending: true }).order('id', { ascending: true });
      if (cursor?.id) query = query.gt('id', cursor.id);
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false }).order('id', { ascending: false });
      if (cursor?.id) query = query.lt('id', cursor.id);
      break;
  }

  const { data, error } = await query;
  if (error) return jsonError(500, 'db_error', error.message);

  const all = data || [];
  const hasMore = all.length > limit;
  const rows = hasMore ? all.slice(0, limit) : all;
  const nextCursor = hasMore && rows.length > 0
    ? encodeCursor({ id: rows[rows.length - 1].id })
    : null;

  const items = rows.map((l: any) => mapListingRow(l, currency));
  return jsonOk({
    data: items,
    meta: { count: items.length, limit, next: nextCursor },
  });
}

/* Shared row → JSON-shape mapper used by /v1/listings, /v1/listings/:id,
   /v1/shops/:url/listings. Keeps the public response shape stable
   across endpoints. */
function mapListingRow(l: any, currency: string) {
  return {
    id: String(l.id),
    market_hash_name: l.market_hash_name,
    item_name: l.item_name,
    item_type: l.item_type,
    condition: l.condition,
    rarity: l.rarity,
    price: convertFromCzk(Number(l.price), currency),
    currency,
    image_url: l.image_url,
    float: l.float_value,
    listed_at: l.created_at,
    seller_name: l.users?.display_name || null,
    url: `https://skinify.gg/item/${l.id}`,
  };
}

/* Cursor: opaque base64-encoded JSON. We could use signed cursors;
   for v1 the contents are not security-sensitive (just an id), so a
   plain encode is fine. */
function encodeCursor(payload: Record<string, any>): string {
  return btoa(JSON.stringify(payload)).replace(/=+$/, '');
}
function decodeCursor(raw: string | null): { id?: number } | null {
  if (!raw) return null;
  try {
    /* btoa rejects unpadded — restore padding. */
    const padded = raw + '='.repeat((4 - (raw.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/* ─── Endpoint: listing detail ──────────────────────────────────────── */
async function listingDetailEndpoint(
  supabase: any,
  url: URL,
  id: string,
): Promise<Response> {
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return jsonError(400, 'invalid_id', 'listing id must be numeric');
  }
  const currency = resolveCurrency(url);

  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(
      'id, market_hash_name, item_name, item_type, condition, rarity, price, image_url, float_value, stickers, created_at, users:user_id(display_name)',
    )
    .eq('id', numId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return jsonError(500, 'db_error', error.message);
  if (!data) return jsonError(404, 'not_found', `Listing ${id} not found.`);

  return jsonOk({
    data: {
      ...mapListingRow(data, currency),
      stickers: data.stickers || [],
    },
  });
}

/* ─── Endpoint: search ──────────────────────────────────────────────── */
async function searchEndpoint(supabase: any, url: URL): Promise<Response> {
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return jsonError(400, 'invalid_query', 'q must be at least 2 characters');
  }
  const limit = Math.min(25, Math.max(1, Number(url.searchParams.get('limit') || 10)));
  const currency = resolveCurrency(url);

  /* Postgres ILIKE on market_hash_name + a small alias map for common
     misspellings ("ak" → "AK-47"). Tolerates one missing dash. */
  const aliases: Record<string, string> = {
    ak: 'AK-47',
    'ak47': 'AK-47',
    'm4': 'M4A4',
    'm4a': 'M4A4',
    m9: 'M9 Bayonet',
    awp: 'AWP',
    deagle: 'Desert Eagle',
    karambit: 'Karambit',
  };
  const normalized = q.toLowerCase();
  const aliasHit = aliases[normalized] || aliases[normalized.replace(/[\s-]+/g, '')];
  const pattern = `%${(aliasHit || q).replace(/[%_]/g, (m) => `\\${m}`)}%`;

  /* Group by market_hash_name (cheap aggregation in JS — public API
     can't run group-by directly via the JS SDK without an RPC). */
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('market_hash_name, price, image_url')
    .ilike('market_hash_name', pattern)
    .eq('is_active', true)
    .limit(limit * 8); // 8x so groupings have enough rows to compute a floor

  if (error) return jsonError(500, 'db_error', error.message);

  const grouped = new Map<string, { count: number; floor: number; image: string | null }>();
  for (const row of data || []) {
    const entry = grouped.get(row.market_hash_name) || {
      count: 0,
      floor: Infinity,
      image: null,
    };
    entry.count += 1;
    const p = Number(row.price);
    if (Number.isFinite(p) && p < entry.floor) entry.floor = p;
    if (!entry.image && row.image_url) entry.image = row.image_url;
    grouped.set(row.market_hash_name, entry);
  }

  const items = Array.from(grouped.entries())
    .slice(0, limit)
    .map(([name, info]) => ({
      market_hash_name: name,
      listings_count: info.count,
      floor: convertFromCzk(info.floor, currency),
      currency,
      image_url: info.image,
      url: `https://skinify.gg/marketplace?q=${encodeURIComponent(name)}`,
    }));

  return jsonOk({ data: items, meta: { query: aliasHit || q, count: items.length } });
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

/* ─── Endpoint: trends ──────────────────────────────────────────────
   Daily aggregate (floor / median / volume) for one market_hash_name
   over the last N days. Reads marketplace_price_history (price ticks)
   and aggregates by day in-memory — cheaper than a pg view for the
   low call volume this endpoint sees in v1.

   When no history exists for the requested name we return an empty
   array with the same envelope — callers can render an empty
   sparkline rather than error-handling 404s. */
async function trendsEndpoint(supabase: any, url: URL): Promise<Response> {
  const name = url.searchParams.get('market_hash_name');
  if (!name) {
    return jsonError(400, 'missing_param', 'market_hash_name is required');
  }
  const allowedWindows = [7, 30, 90, 180, 365];
  const requestedDays = Number(url.searchParams.get('days') || 30);
  const days = allowedWindows.includes(requestedDays) ? requestedDays : 30;
  const currency = resolveCurrency(url);

  /* Get every listing id that ever matched this name (active or not). */
  const { data: listings, error: listingsErr } = await supabase
    .from('marketplace_listings')
    .select('id')
    .eq('market_hash_name', name)
    .limit(2000);
  if (listingsErr) return jsonError(500, 'db_error', listingsErr.message);
  const ids = (listings || []).map((l: any) => l.id);
  if (ids.length === 0) {
    return jsonOk({ data: [], meta: { days, currency } });
  }

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data: ticks, error: ticksErr } = await supabase
    .from('marketplace_price_history')
    .select('price, recorded_at')
    .in('listing_id', ids)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true })
    .limit(10_000);
  if (ticksErr) return jsonError(500, 'db_error', ticksErr.message);

  const buckets = new Map<string, number[]>();
  for (const tick of ticks || []) {
    const day = String(tick.recorded_at).slice(0, 10);
    const arr = buckets.get(day) || [];
    arr.push(Number(tick.price));
    buckets.set(day, arr);
  }
  const series = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, prices]) => {
      const sorted = prices.filter(Number.isFinite).sort((a, b) => a - b);
      const floor = sorted[0];
      const median = sorted[Math.floor(sorted.length / 2)];
      return {
        day,
        floor: convertFromCzk(floor, currency),
        median: convertFromCzk(median, currency),
        volume: sorted.length,
      };
    });

  return jsonOk({ data: series, meta: { days, currency, count: series.length } });
}

/* ─── Endpoint: floor (bulk) ────────────────────────────────────────
   Cheapest active listing for up to 100 names in one request.
   Returns an object keyed by market_hash_name so callers can do
   O(1) lookups in their own code. */
async function floorEndpoint(supabase: any, url: URL): Promise<Response> {
  const raw = url.searchParams.get('names');
  if (!raw) {
    return jsonError(400, 'missing_param', 'names is required (comma-separated)');
  }
  const names = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 100);
  if (names.length === 0) {
    return jsonError(400, 'invalid_query', 'no valid names in query');
  }
  const currency = resolveCurrency(url);

  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('market_hash_name, price')
    .in('market_hash_name', names)
    .eq('is_active', true)
    .limit(names.length * 50);
  if (error) return jsonError(500, 'db_error', error.message);

  const floorMap: Record<string, { floor: number | null; currency: string }> = {};
  for (const n of names) floorMap[n] = { floor: null, currency };
  for (const row of data || []) {
    const p = Number(row.price);
    if (!Number.isFinite(p)) continue;
    const current = floorMap[row.market_hash_name];
    if (current && (current.floor === null || p < current.floor)) {
      current.floor = p;
    }
  }
  for (const n of names) {
    if (floorMap[n].floor !== null) {
      floorMap[n].floor = convertFromCzk(floorMap[n].floor as number, currency);
    }
  }
  return jsonOk({ data: floorMap, meta: { count: names.length, currency } });
}

/* ─── Endpoint: inventory ────────────────────────────────────────────
   Public Steam inventory snapshot proxied via the existing
   user-inventory edge function (which already knows how to talk to
   Steam and cache the result). We add a thin layer of Skinify-priced
   suggestions on top. */
async function inventoryEndpoint(
  supabase: any,
  url: URL,
  steamId: string,
): Promise<Response> {
  if (!/^\d{17}$/.test(steamId)) {
    return jsonError(400, 'invalid_steam_id', 'steamId must be a 17-digit Steam 64 id');
  }
  const fresh = url.searchParams.get('fresh') === '1';
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return jsonError(500, 'config', 'Supabase config missing');
  }

  try {
    const proxyRes = await fetch(
      `${supabaseUrl}/functions/v1/user-inventory?steamId=${steamId}${fresh ? '&fresh=1' : ''}`,
      { headers: { Authorization: `Bearer ${serviceKey}` } },
    );
    if (!proxyRes.ok) {
      return jsonError(
        502,
        'upstream',
        `inventory upstream returned ${proxyRes.status}`,
      );
    }
    const inv = await proxyRes.json();
    const items = Array.isArray(inv?.items) ? inv.items : [];

    /* Bulk-floor lookup so each item can carry a Skinify-priced
       suggestion. We chunk into 100-name batches to stay inside the
       PG `in` clause comfort zone. */
    const names = Array.from(
      new Set(items.map((it: any) => it.market_hash_name).filter(Boolean)),
    );
    const floors = new Map<string, number>();
    for (let i = 0; i < names.length; i += 100) {
      const batch = names.slice(i, i + 100);
      const { data } = await supabase
        .from('marketplace_listings')
        .select('market_hash_name, price')
        .in('market_hash_name', batch)
        .eq('is_active', true);
      for (const row of data || []) {
        const p = Number(row.price);
        if (!Number.isFinite(p)) continue;
        const prev = floors.get(row.market_hash_name);
        if (prev === undefined || p < prev) floors.set(row.market_hash_name, p);
      }
    }

    const currency = resolveCurrency(url);
    const decorated = items.map((it: any) => {
      const floor = floors.get(it.market_hash_name);
      return {
        asset_id: it.asset_id,
        market_hash_name: it.market_hash_name,
        suggested_price:
          floor !== undefined ? convertFromCzk(floor, currency) : null,
        tradable: Boolean(it.tradable),
      };
    });
    const estimated = decorated.reduce(
      (acc, it) => acc + (it.suggested_price || 0),
      0,
    );

    return jsonOk({
      data: {
        steam_id: steamId,
        items_count: decorated.length,
        estimated_value: Math.round(estimated * 100) / 100,
        currency,
        items: decorated,
      },
    });
  } catch (err: any) {
    return jsonError(502, 'upstream', err?.message || 'inventory proxy failed');
  }
}

/* ─── Endpoint: shop ─────────────────────────────────────────────── */
async function shopEndpoint(supabase: any, shopUrl: string): Promise<Response> {
  if (!shopUrl) {
    return jsonError(400, 'missing_param', 'shop url segment is required');
  }
  const { data, error } = await supabase
    .from('user_shops')
    .select('shop_url, shop_name, description, created_at, users:user_id(display_name)')
    .eq('shop_url', shopUrl)
    .maybeSingle();
  if (error) return jsonError(500, 'db_error', error.message);
  if (!data) return jsonError(404, 'not_found', `Shop ${shopUrl} not found.`);

  /* Counts come from the listings table; we keep them out of the main
     row read so the shop row stays cheap. */
  const { count: tradesCount } = await supabase
    .from('marketplace_listings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', (data as any).user_id);

  return jsonOk({
    data: {
      url: data.shop_url,
      display_name: data.shop_name || data.users?.display_name || data.shop_url,
      trades_count: tradesCount || 0,
      rating: null, // wire up when reviews table ships
      joined_at: data.created_at,
      shop_url: `https://skinify.gg/shop/${data.shop_url}`,
    },
  });
}

/* ─── Endpoint: shop listings ──────────────────────────────────────── */
async function shopListingsEndpoint(
  supabase: any,
  url: URL,
  shopUrl: string,
): Promise<Response> {
  if (!shopUrl) {
    return jsonError(400, 'missing_param', 'shop url segment is required');
  }
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('limit') || 25)),
  );
  const currency = resolveCurrency(url);
  const cursor = decodeCursor(url.searchParams.get('cursor'));

  /* Resolve the shop's owning user_id first — single row lookup. */
  const { data: shop, error: shopErr } = await supabase
    .from('user_shops')
    .select('user_id')
    .eq('shop_url', shopUrl)
    .maybeSingle();
  if (shopErr) return jsonError(500, 'db_error', shopErr.message);
  if (!shop) return jsonError(404, 'not_found', `Shop ${shopUrl} not found.`);

  let query = supabase
    .from('marketplace_listings')
    .select(
      'id, market_hash_name, item_name, item_type, condition, rarity, price, image_url, float_value, created_at, users:user_id(display_name)',
    )
    .eq('user_id', shop.user_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);
  if (cursor?.id) query = query.lt('id', cursor.id);

  const { data, error } = await query;
  if (error) return jsonError(500, 'db_error', error.message);

  const all = data || [];
  const hasMore = all.length > limit;
  const rows = hasMore ? all.slice(0, limit) : all;
  const nextCursor = hasMore && rows.length > 0
    ? encodeCursor({ id: rows[rows.length - 1].id })
    : null;

  return jsonOk({
    data: rows.map((l: any) => mapListingRow(l, currency)),
    meta: { count: rows.length, limit, next: nextCursor, shop_url: shopUrl },
  });
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

  /* Route. Specific paths win over prefix matches; we test the
     "/{x}/listings" and bulk routes BEFORE the generic /v1/listings
     prefix so the more specific patterns aren't shadowed. */

  const shopListingsMatch = path.match(/^\/v1\/shops\/([^/]+)\/listings\/?$/);
  if (shopListingsMatch) {
    return withHeaders(
      await shopListingsEndpoint(supabase, url, decodeURIComponent(shopListingsMatch[1])),
      limitHeaders,
    );
  }
  const shopMatch = path.match(/^\/v1\/shops\/([^/]+)\/?$/);
  if (shopMatch) {
    return withHeaders(
      await shopEndpoint(supabase, decodeURIComponent(shopMatch[1])),
      limitHeaders,
    );
  }
  const inventoryMatch = path.match(/^\/v1\/inventory\/([^/]+)\/?$/);
  if (inventoryMatch) {
    return withHeaders(
      await inventoryEndpoint(supabase, url, decodeURIComponent(inventoryMatch[1])),
      limitHeaders,
    );
  }
  const listingDetailMatch = path.match(/^\/v1\/listings\/([^/]+)\/?$/);
  if (listingDetailMatch) {
    return withHeaders(
      await listingDetailEndpoint(supabase, url, decodeURIComponent(listingDetailMatch[1])),
      limitHeaders,
    );
  }

  if (path.startsWith('/v1/prices')) {
    return withHeaders(await pricesEndpoint(supabase, url), limitHeaders);
  }
  if (path.startsWith('/v1/listings')) {
    return withHeaders(await listingsEndpoint(supabase, url), limitHeaders);
  }
  if (path.startsWith('/v1/search')) {
    return withHeaders(await searchEndpoint(supabase, url), limitHeaders);
  }
  if (path.startsWith('/v1/render')) {
    return withHeaders(await renderEndpoint(supabase, url), limitHeaders);
  }
  if (path.startsWith('/v1/trends')) {
    return withHeaders(await trendsEndpoint(supabase, url), limitHeaders);
  }
  if (path.startsWith('/v1/floor')) {
    return withHeaders(await floorEndpoint(supabase, url), limitHeaders);
  }

  /* Discovery: GET / returns the list of available endpoints. */
  if (path === '' || path === '/' || path === '/v1' || path === '/v1/') {
    return jsonOk(
      {
        data: {
          name: 'Skinify Public API',
          version: '1.0',
          documentation: 'https://skinify.gg/docs',
          endpoints: [
            { path: '/v1/prices', description: 'Floor / median / max for a market_hash_name' },
            { path: '/v1/listings', description: 'Read-only listings index (filter + sort + cursor)' },
            { path: '/v1/listings/{id}', description: 'Single listing detail' },
            { path: '/v1/search', description: 'Fuzzy search across active listings' },
            { path: '/v1/render', description: 'CSFloat-rendered preview image (302 redirect)' },
            { path: '/v1/trends', description: 'Daily price aggregates (7/30/90/180/365 day windows)' },
            { path: '/v1/floor', description: 'Bulk floor prices for up to 100 names per request' },
            { path: '/v1/inventory/{steamId}', description: 'Public Steam inventory snapshot' },
            { path: '/v1/shops/{url}', description: 'Public shop metadata' },
            { path: '/v1/shops/{url}/listings', description: 'Listings inside a shop' },
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
