const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PAYU_CONFIG = {
  posId: "500150",
  clientId: "500150",
  clientSecret: "6a5190563e1268839e1264f399052f81",
  secondKey: "b800fed5958e7541377be057e3069175",
  apiUrl: "https://secure.snd.payu.com",
};

const CZK_TO_USD_RATE = 0.042;

async function getPayUAccessToken(): Promise<string> {
  const tokenUrl = `${PAYU_CONFIG.apiUrl}/pl/standard/user/oauth/authorize`;
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: PAYU_CONFIG.clientId,
    client_secret: PAYU_CONFIG.clientSecret,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PayU OAuth error:", errorText);
    throw new Error(`Failed to get PayU access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body with error handling
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: "Request must be valid JSON"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { amount, userId, userEmail, steamId, description } = requestBody;

    console.log("=== RECEIVED PAYMENT REQUEST ===");
    console.log("Amount:", amount);
    console.log("User ID:", userId);
    console.log("Steam ID:", steamId);
    console.log("Email:", userEmail);

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 50) {
      return new Response(
        JSON.stringify({ error: "Minimum deposit is 50 Kč" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate userId
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Convert CZK to USD cents
    const amountInUsd = Math.round(amount * CZK_TO_USD_RATE * 100) / 100;
    const amountInCents = Math.round(amountInUsd * 100);

    console.log("=== CREATING PAYU PAYMENT ===");
    console.log("Amount in CZK:", amount);
    console.log("Amount in USD:", amountInUsd);
    console.log("Amount in cents:", amountInCents);

    // Get PayU access token
    let accessToken;
    try {
      accessToken = await getPayUAccessToken();
    } catch (tokenError) {
      console.error("Failed to get access token:", tokenError);
      return new Response(
        JSON.stringify({
          error: "Payment system authentication failed",
          details: tokenError instanceof Error ? tokenError.message : "Unknown error"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build URLs
    const origin = req.headers.get("origin") || "http://localhost:5173";
    const continueUrl = `${origin}/profile?tab=balance&payment=success`;
    const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/payu-webhook`;

    // Get customer IP with fallback
    const customerIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      "8.8.8.8";

    console.log("Customer IP:", customerIp);

    // Generate email
    const buyerEmail = userEmail ||
      (steamId ? `steam_${steamId}@csgo-marketplace.com` : `user_${userId}@csgo-marketplace.com`);

    // Build PayU order
    const orderData = {
      notifyUrl,
      continueUrl,
      customerIp,
      merchantPosId: PAYU_CONFIG.posId,
      description: description || `CS:GO Marketplace Deposit - ${amount} Kč`,
      currencyCode: "USD",
      totalAmount: amountInCents,
      extOrderId: `deposit_${userId}_${Date.now()}`,
      buyer: {
        email: buyerEmail,
        language: "en",
      },
      products: [
        {
          name: `Wallet Top-up ${amount} Kč`,
          unitPrice: amountInCents,
          quantity: 1,
        },
      ],
    };

    console.log("=== PAYU ORDER DATA ===");
    console.log(JSON.stringify(orderData, null, 2));

    // Create PayU order
    const orderResponse = await fetch(`${PAYU_CONFIG.apiUrl}/api/v2_1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    });

    const responseText = await orderResponse.text();
    console.log("=== PAYU RESPONSE ===");
    console.log("Status:", orderResponse.status);
    console.log("Response:", responseText);

    if (!orderResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "PayU API error",
          details: responseText,
          status: orderResponse.status
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse PayU response
    let orderResult;
    try {
      orderResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse PayU response:", parseError);
      return new Response(
        JSON.stringify({
          error: "Invalid response from PayU",
          details: responseText
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (orderResult.status?.statusCode !== "SUCCESS") {
      return new Response(
        JSON.stringify({
          error: "PayU order creation failed",
          statusCode: orderResult.status?.statusCode,
          details: orderResult
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderResult.orderId,
        redirectUri: orderResult.redirectUri,
        extOrderId: orderData.extOrderId,
        amountCzk: amount,
        amountUsd: amountInUsd,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("=== PAYU PAYMENT ERROR ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to create PayU payment",
        type: error?.constructor?.name || "Unknown",
        details: error instanceof Error ? error.stack : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
