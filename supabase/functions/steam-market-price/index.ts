import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SteamMarketResponse {
  success: boolean;
  lowest_price?: string;
  median_price?: string;
  volume?: string;
}

/* Steam prices move slowly — a fresh cache row is authoritative for
   30 minutes. Steam 429s datacenter IPs hard, so on any Steam failure
   we fall back to a stale row of ANY age rather than erroring. */
const CACHE_TTL_MS = 30 * 60 * 1000;

function ok(data: SteamMarketResponse, cached: boolean, stale = false): Response {
  return new Response(
    JSON.stringify({ success: true, data, cached, stale }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    }
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const itemName = url.searchParams.get("item");
    const currency = url.searchParams.get("currency") || "1";

    if (!itemName) {
      return new Response(
        JSON.stringify({ error: "missing item parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (itemName.length > 300 || !/^[\w \-:%()'.|À-ſ★™]+$/.test(itemName)) {
      return new Response(
        JSON.stringify({ error: "invalid item name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    /* 1. Cache lookup — fresh rows short-circuit Steam entirely. */
    let cachedRow: { payload: SteamMarketResponse; fetched_at: string } | null = null;
    try {
      const { data } = await db
        .from("steam_price_cache")
        .select("payload, fetched_at")
        .eq("market_hash_name", itemName)
        .eq("currency", currency)
        .maybeSingle();
      cachedRow = data as any;
    } catch (_) {
      /* cache is best-effort */
    }

    if (cachedRow && Date.now() - new Date(cachedRow.fetched_at).getTime() < CACHE_TTL_MS) {
      return ok(cachedRow.payload, true);
    }

    /* 2. Live fetch. */
    console.log(`[Steam Proxy] Fetching price for: ${itemName} (currency: ${currency})`);
    const steamUrl = `https://steamcommunity.com/market/priceoverview/?currency=${currency}&appid=730&market_hash_name=${encodeURIComponent(itemName)}`;

    let steamData: SteamMarketResponse | null = null;
    let steamStatus = 0;
    try {
      const steamResponse = await fetch(steamUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          "Accept": "application/json",
        },
      });
      steamStatus = steamResponse.status;
      if (steamResponse.ok) {
        const body = await steamResponse.json().catch(() => null);
        if (body?.success) steamData = body;
      }
    } catch (e) {
      console.error("[Steam Proxy] fetch failed:", e);
    }

    if (steamData) {
      /* Persist for the next 30 minutes (and as the stale fallback). */
      try {
        await db.from("steam_price_cache").upsert({
          market_hash_name: itemName,
          currency,
          payload: steamData,
          fetched_at: new Date().toISOString(),
        });
      } catch (_) {
        /* cache write is best-effort */
      }
      return ok(steamData, false);
    }

    /* 3. Steam failed (429 or otherwise) — serve stale cache if we have
       one; an old price beats no price for a comparison feature. */
    if (cachedRow) {
      console.warn(`[Steam Proxy] Steam ${steamStatus} — serving stale cache for ${itemName}`);
      return ok(cachedRow.payload, true, true);
    }

    console.error(`[Steam Proxy] Steam API error: ${steamStatus}, no cache for ${itemName}`);
    return new Response(
      JSON.stringify({ error: "steam api error", status: steamStatus }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Steam Proxy] Error:", error);
    return new Response(
      JSON.stringify({ error: "internal error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
