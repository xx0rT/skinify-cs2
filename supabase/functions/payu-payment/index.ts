import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PAYU_CONFIG = {
  posId: "4416072",
  clientId: "4416072",
  clientSecret: "c2fca2d6579e0258a2e70206caa64052",
  secondKey: "547630fe34bf8ddb3c4133b3ec3619a1",
  apiUrl: "https://secure.payu.com",
  oauthUrl: "https://secure.payu.com/pl/standard/user/oauth/authorize",
  ordersUrl: "https://secure.payu.com/api/v2_1/orders",
};

async function getPayUAccessToken(): Promise<string> {
  const tokenUrl = `${PAYU_CONFIG.apiUrl}/pl/standard/user/oauth/authorize`;
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: PAYU_CONFIG.clientId,
    client_secret: PAYU_CONFIG.clientSecret,
  });

  console.log("=== REQUESTING OAUTH TOKEN ===");
  console.log("Client ID:", PAYU_CONFIG.clientId);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OAuth error:", errorText);
    throw new Error(`Failed to get OAuth token: ${response.status}`);
  }

  const data = await response.json();
  console.log("OAuth token received");
  return data.access_token;
}

async function checkPaymentStatus(orderId: string, userId: string) {
  console.log("=== CHECKING PAYMENT STATUS ===");
  console.log("Order ID:", orderId);
  console.log("User ID:", userId);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let actualOrderId = orderId;

  if (orderId.startsWith('deposit_')) {
    console.log("Received extOrderId, looking up PayU orderId...");
    const { data: txData } = await supabase
      .from("user_transactions")
      .select("metadata")
      .eq("reference_id", orderId)
      .maybeSingle();

    if (txData?.metadata?.orderId) {
      actualOrderId = txData.metadata.orderId;
      console.log("Found PayU orderId:", actualOrderId);
    }
  }

  const accessToken = await getPayUAccessToken();
  const orderUrl = `${PAYU_CONFIG.apiUrl}/api/v2_1/orders/${actualOrderId}`;

  const orderResponse = await fetch(orderUrl, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!orderResponse.ok) {
    const errorText = await orderResponse.text();
    console.error("PayU API error:", orderResponse.status, errorText);
    throw new Error(`Failed to fetch order status: ${orderResponse.status}`);
  }

  const orderData = await orderResponse.json();
  const order = orderData.orders?.[0];

  console.log("=== ORDER DATA ===");
  console.log("Order status:", order?.status);
  console.log("Order amount:", order?.totalAmount);
  console.log("Order currency:", order?.currencyCode);
  console.log("Full order data:", JSON.stringify(order, null, 2));

  if (!order) {
    console.error("No order found in response:", orderData);
    throw new Error("Order not found");
  }

  const orderStatus = order.status?.toUpperCase();
  console.log("Normalized order status:", orderStatus);

  if (orderStatus === "COMPLETED") {
    const amountInHaleru = parseInt(order.totalAmount);
    const amountInCzk = Math.round(amountInHaleru / 100);

    console.log("Payment COMPLETED! Amount:", amountInCzk, "Kč");

    const { data: userData } = await supabase
      .from("users")
      .select("id, steam_id, current_balance")
      .eq("id", userId)
      .maybeSingle();

    if (!userData) {
      throw new Error("User not found");
    }

    const extOrderId = order.extOrderId || orderId;

    const { data: existingTx } = await supabase
      .from("user_transactions")
      .select("id")
      .eq("reference_id", extOrderId)
      .eq("status", "completed")
      .maybeSingle();

    if (existingTx) {
      console.log("Payment already processed");
      return {
        success: true,
        status: "completed",
        alreadyProcessed: true,
        currentBalance: userData.current_balance,
      };
    }

    const currentBalance = userData.current_balance || 0;
    const newBalance = currentBalance + amountInCzk;

    console.log("Updating balance:", currentBalance, "->", newBalance);

    const { error: txError } = await supabase.from("user_transactions").insert({
      user_id: userId,
      steam_id: userData.steam_id,
      type: "deposit",
      amount: amountInCzk,
      balance_before: currentBalance,
      balance_after: newBalance,
      description: `PayU deposit - ${amountInCzk.toLocaleString()} Kč`,
      reference_id: extOrderId,
      payment_method: "payu",
      metadata: order,
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    if (txError) {
      console.error("Error inserting transaction:", txError);
      throw new Error(`Failed to insert transaction: ${txError.message}`);
    }

    const { error: balanceError } = await supabase
      .from("users")
      .update({ current_balance: newBalance })
      .eq("id", userId);

    if (balanceError) {
      console.error("Error updating balance:", balanceError);
      throw new Error(`Failed to update balance: ${balanceError.message}`);
    }

    console.log("Balance updated successfully!");

    await supabase.from("notifications").insert({
      user_id: userId,
      type: "payment",
      title: "Deposit Successful",
      message: `Your deposit of ${amountInCzk.toLocaleString()} Kč has been credited to your account.`,
      data: {
        amount: amountInCzk,
        orderId: actualOrderId,
        paymentMethod: "payu",
      },
    });

    return {
      success: true,
      status: "completed",
      amount: amountInCzk,
      newBalance,
    };
  }

  console.log(`Payment status is ${orderStatus}, not COMPLETED yet`);

  return {
    success: true,
    status: orderStatus || order.status,
    payuStatus: order.status,
    message: `Payment status: ${orderStatus || order.status}`,
    orderId: order.orderId,
    extOrderId: order.extOrderId,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const checkStatus = url.searchParams.get("checkStatus");

    if (checkStatus === "true") {
      const body = await req.json();
      const { orderId, userId } = body;

      if (!orderId || !userId) {
        return new Response(
          JSON.stringify({ error: "orderId and userId required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await checkPaymentStatus(orderId, userId);
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { amount, userId, userEmail, steamId, customerIp: providedIp, description } = await req.json();

    console.log("=== PAYMENT REQUEST ===");
    console.log("Amount:", amount, "CZK");
    console.log("User ID:", userId);

    if (!amount || amount < 50) {
      return new Response(
        JSON.stringify({ error: "Minimum deposit is 50 Kč" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountInHaleru = Math.round(amount * 100);
    const origin = req.headers.get("origin") || "http://localhost:5173";
    const continueUrl = `${origin}/profile?tab=balance&payment=success`;
    const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/payu-webhook`;

    const customerIp = providedIp || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const buyerEmail = userEmail || (steamId ? `user_${steamId}@csgo-marketplace.com` : `user_${userId}@csgo-marketplace.com`);
    const extOrderId = `deposit_${userId}_${Date.now()}`;

    const orderData = {
      notifyUrl,
      continueUrl,
      customerIp,
      merchantPosId: PAYU_CONFIG.posId,
      description: description || `Deposit ${amount.toLocaleString()} Kč`,
      currencyCode: "CZK",
      totalAmount: amountInHaleru,
      extOrderId,
      buyer: {
        email: buyerEmail,
        language: "en",
      },
      products: [{
        name: `Wallet Top-up ${amount.toLocaleString()} Kč`,
        unitPrice: amountInHaleru,
        quantity: 1,
      }],
    };

    console.log("=== ORDER DATA ===");
    console.log("POS ID:", orderData.merchantPosId);
    console.log("Amount:", orderData.totalAmount);
    console.log("Ext Order ID:", orderData.extOrderId);

    const accessToken = await getPayUAccessToken();
    const orderUrl = `${PAYU_CONFIG.apiUrl}/api/v2_1/orders`;

    console.log("=== SENDING TO PAYU ===");
    console.log("URL:", orderUrl);

    const orderResponse = await fetch(orderUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
      redirect: "manual",
    });

    const contentType = orderResponse.headers.get("content-type") || "";
    const responseText = await orderResponse.text();

    console.log("=== PAYU RESPONSE ===");
    console.log("Status:", orderResponse.status);
    console.log("Content-Type:", contentType);
    console.log("Response length:", responseText.length);

    if (orderResponse.status === 302 || orderResponse.status === 303) {
      console.log("Got 302/303 redirect - trying to parse JSON from body");
    }

    if (!orderResponse.ok && orderResponse.status !== 302 && orderResponse.status !== 303) {
      console.error("PayU error:", responseText);
      return new Response(
        JSON.stringify({
          error: "PayU API error",
          details: responseText,
          status: orderResponse.status
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payuResponse = JSON.parse(responseText);
    console.log("=== PAYMENT CREATED ===");
    console.log("Status:", payuResponse.status?.statusCode);
    console.log("Order ID:", payuResponse.orderId);

    if (payuResponse.status?.statusCode === "SUCCESS" && payuResponse.redirectUri) {
      return new Response(
        JSON.stringify({
          success: true,
          redirectUri: payuResponse.redirectUri,
          orderId: payuResponse.orderId,
          extOrderId,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Payment failed",
        details: payuResponse
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("=== ERROR ===");
    console.error(error);

    return new Response(
      JSON.stringify({
        error: "Payment processing failed",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
