// supabase/functions/skin-float/index.ts
//
// Proxies CSFloat's inspect API so the browser doesn't need to know
// our API key. Two ways to call it:
//
//   GET /functions/v1/skin-float?inspect=<full inspect link or hex param>
//   GET /functions/v1/skin-float?s=<s>&a=<a>&d=<d>&m=<m>
//
// Returns: { float, paint_seed, paint_index, def_index, rarity,
//            stickers: [{ slot, sticker_id, name, image }], ... }
//
// Requires Supabase secret CSFLOAT_API_KEY. Without it, the function
// returns a stub response so the UI keeps working in dev — callers
// should handle a `stub: true` flag if they want to badge unknown
// data differently.
//
// Caching: 1h public + 1d stale-while-revalidate. Float doesn't change
// for a given asset, so an aggressive cache is safe.

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const CSFLOAT_BASE = 'https://api.csgofloat.com/';

interface InspectParams {
  s?: string;
  a?: string;
  d?: string;
  m?: string;
  /** Full raw `csgo_econ_action_preview` URL — we parse the params out. */
  inspectLink?: string;
}

function parseInspectLink(link: string): InspectParams {
  // Steam inspect links look like:
  // steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S<s>A<a>D<d>
  // or  M<m>A<a>D<d>
  const decoded = decodeURIComponent(link);
  const out: InspectParams = {};
  const sMatch = decoded.match(/[\sSs]S(\d+)/);
  const mMatch = decoded.match(/[\sMm]M(\d+)/);
  const aMatch = decoded.match(/[\sAa]A(\d+)/);
  const dMatch = decoded.match(/[\sDd]D(\d+)/);
  if (sMatch) out.s = sMatch[1];
  if (mMatch) out.m = mMatch[1];
  if (aMatch) out.a = aMatch[1];
  if (dMatch) out.d = dMatch[1];
  return out;
}

async function lookupFloat(p: InspectParams, apiKey: string) {
  /* CSFloat accepts ?url=<inspect-link> OR the individual s/a/d/m
     params. We always send the rebuilt URL so we don't have to babysit
     CSFloat API param semantics. */
  if (!p.a || !p.d || (!p.s && !p.m)) {
    throw new Error('Need at least s|m + a + d to look up a float.');
  }
  const url = p.s
    ? `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S${p.s}A${p.a}D${p.d}`
    : `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M${p.m}A${p.a}D${p.d}`;

  const apiUrl = `${CSFLOAT_BASE}?url=${encodeURIComponent(url)}`;

  /* CSFloat accepts the API key in the Authorization header. Some
     accounts have keys that need a "Bearer " prefix and others don't —
     try the bare key first (current behaviour) and fall back to Bearer
     on 401 so we work across both. */
  const tryFetch = async (auth: string) =>
    fetch(apiUrl, {
      headers: { Authorization: auth },
      /* CSFloat can hold a request open while it talks to the GC. Cap
         the wait so a stuck request doesn't tie up an edge function
         worker. */
      signal: AbortSignal.timeout(20000),
    });

  let res = await tryFetch(apiKey);
  if (res.status === 401 || res.status === 403) {
    res = await tryFetch(`Bearer ${apiKey}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`CSFloat ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS, status: 200 });
  }
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const url = new URL(req.url);
  const params: InspectParams = {
    s: url.searchParams.get('s') || undefined,
    a: url.searchParams.get('a') || undefined,
    d: url.searchParams.get('d') || undefined,
    m: url.searchParams.get('m') || undefined,
  };
  const inspectLink = url.searchParams.get('inspect') || url.searchParams.get('url');
  if (inspectLink) Object.assign(params, parseInspectLink(inspectLink));

  if (!params.a || !params.d || (!params.s && !params.m)) {
    return new Response(
      JSON.stringify({
        error: 'Missing parameters. Provide ?inspect=<link> or ?s=&a=&d= / ?m=&a=&d=',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } },
    );
  }

  const apiKey = Deno.env.get('CSFLOAT_API_KEY');

  /* No API key → return a clearly-labelled stub so the UI can render
     placeholders without 500ing. Useful in dev / first-time install. */
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        stub: true,
        float: null,
        paint_seed: null,
        paint_index: null,
        def_index: null,
        stickers: [],
        message:
          'CSFLOAT_API_KEY not set in Supabase secrets. Add it to enable real float lookups.',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
          ...CORS,
        },
      },
    );
  }

  /* Lightweight per-row cache via the public.skin_floats table if it
     exists. Float never changes for a given asset_id, so once we cache
     it we never have to hit CSFloat again. Failures are swallowed so
     the lookup still proceeds. */
  let supabase: ReturnType<typeof createClient> | null = null;
  try {
    const sbUrl = Deno.env.get('SUPABASE_URL');
    const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (sbUrl && sbKey) supabase = createClient(sbUrl, sbKey);
  } catch {
    supabase = null;
  }

  const cacheKey = `${params.s || params.m}:${params.a}:${params.d}`;
  if (supabase) {
    try {
      const { data } = await supabase
        .from('skin_floats')
        .select('payload')
        .eq('cache_key', cacheKey)
        .maybeSingle();
      if (data?.payload) {
        return new Response(JSON.stringify(data.payload), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            'X-Float-Cache': 'hit',
            ...CORS,
          },
        });
      }
    } catch {
      /* Table doesn't exist or RLS blocks read — skip cache, hit CSFloat. */
    }
  }

  try {
    const data = await lookupFloat(params, apiKey);
    /* CSFloat returns { iteminfo: {...} } — flatten to the fields the
       UI actually uses. Keep the raw payload too so callers needing
       paint index / def index / origin etc. can still get them. */
    const ii = data.iteminfo || data;
    const payload = {
      float: ii.floatvalue ?? null,
      paint_seed: ii.paintseed ?? null,
      paint_index: ii.paintindex ?? null,
      def_index: ii.defindex ?? null,
      origin: ii.origin ?? null,
      rarity: ii.rarity ?? null,
      /* CSFloat ships a rendered preview of this exact float+seed
         combination at `iteminfo.imageurl`. Surface it so the item
         detail hero can show the real skin pattern instead of the
         generic Steam thumbnail. */
      preview_image: ii.imageurl || ii.image_url || null,
      stickers: Array.isArray(ii.stickers)
        ? ii.stickers.map((s: any) => ({
            slot: s.slot,
            sticker_id: s.stickerId ?? s.sticker_id,
            name: s.name,
            image: s.image || s.icon_url,
            wear: s.wear ?? 0,
          }))
        : [],
    };

    /* Best-effort cache write — no await on the response, so a slow
       insert doesn't add latency to this request's reply. */
    if (supabase) {
      supabase
        .from('skin_floats')
        .upsert(
          {
            cache_key: cacheKey,
            payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'cache_key' },
        )
        .then(() => {})
        .catch(() => {});
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        ...CORS,
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Float lookup failed.' }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...CORS },
      },
    );
  }
});
