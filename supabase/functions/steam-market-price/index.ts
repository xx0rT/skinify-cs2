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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const itemName = url.searchParams.get("item");
    const currency = url.searchParams.get("currency") || "1";

    if (!itemName) {
      return new Response(
        JSON.stringify({ error: "missing item parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (itemName.length > 300 || !/^[\w \-:%()'.|\u00C0-\u017F]+$/.test(itemName)) {
      return new Response(
        JSON.stringify({ error: "invalid item name" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Steam Proxy] Fetching price for: ${itemName} (currency: ${currency})`);

    const steamUrl = `https://steamcommunity.com/market/priceoverview/?currency=${currency}&appid=730&market_hash_name=${encodeURIComponent(itemName)}`;

    const steamResponse = await fetch(steamUrl, {
      headers: {
        "User-Agent": "CS2Marketplace/1.0",
      },
    });

    if (!steamResponse.ok) {
      console.error(`[Steam Proxy] Steam API error: ${steamResponse.status}`);
      return new Response(
        JSON.stringify({
          error: "steam api error",
          status: steamResponse.status,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const steamData: SteamMarketResponse = await steamResponse.json();

    console.log(`[Steam Proxy] Response for ${itemName}:`, steamData);

    return new Response(
      JSON.stringify({
        success: true,
        data: steamData,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60",
        },
      }
    );
  } catch (error) {
    console.error("[Steam Proxy] Error:", error);
    return new Response(
      JSON.stringify({
        error: "internal error",
        details: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
