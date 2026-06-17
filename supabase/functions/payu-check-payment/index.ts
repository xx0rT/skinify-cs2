import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/* Production PayU credentials read from Supabase function secrets.
   See payu-payment/index.ts for the full env-var list. */
const PAYU_CONFIG = {
  posId: Deno.env.get("PAYU_POS_ID") || "",
  clientId: Deno.env.get("PAYU_CLIENT_ID") || "",
  clientSecret: Deno.env.get("PAYU_CLIENT_SECRET") || "",
  apiUrl: Deno.env.get("PAYU_API_URL") || "https://secure.payu.com",
};

function assertPayUConfig() {
  const missing: string[] = [];
  if (!PAYU_CONFIG.clientId) missing.push("PAYU_CLIENT_ID");
  if (!PAYU_CONFIG.clientSecret) missing.push("PAYU_CLIENT_SECRET");
  if (missing.length > 0) {
    throw new Error(`PayU not configured: missing env var(s) ${missing.join(", ")}`);
  }
}

async function getPayUAccessToken(): Promise<string> {
  assertPayUConfig();
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
    throw new Error(`Failed to get OAuth token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { orderId, userId } = await req.json();

    console.log("=== CHECKING PAYU ORDER STATUS ===");
    console.log("Order ID received:", orderId);
    console.log("User ID:", userId);

    if (!orderId || !userId) {
      return new Response(
        JSON.stringify({ error: "orderId and userId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let actualOrderId = orderId;

    if (orderId.startsWith('deposit_')) {
      console.log("Received extOrderId, looking up PayU orderId in database...");
      const { data: txData } = await supabase
        .from("user_transactions")
        .select("metadata")
        .eq("reference_id", orderId)
        .maybeSingle();

      if (txData?.metadata?.orderId) {
        actualOrderId = txData.metadata.orderId;
        console.log("Found PayU orderId:", actualOrderId);
      } else {
        console.log("Could not find PayU orderId, will try with extOrderId");
      }
    }

    const accessToken = await getPayUAccessToken();
    const orderUrl = `${PAYU_CONFIG.apiUrl}/api/v2_1/orders/${actualOrderId}`;

    console.log("Fetching order from PayU:", orderUrl);

    const orderResponse = await fetch(orderUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("PayU API response status:", orderResponse.status);

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error("PayU API error:", orderResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch order status",
          details: errorText,
          status: orderResponse.status
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderData = await orderResponse.json();
    const order = orderData.orders?.[0];

    console.log("Order status:", order?.status);
    console.log("Order amount:", order?.totalAmount);
    console.log("Order extOrderId:", order?.extOrderId);

    if (!order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.status === "COMPLETED") {
      const amountInHaleru = parseInt(order.totalAmount);
      const amountInCzk = Math.round(amountInHaleru / 100);

      console.log("Payment COMPLETED! Amount:", amountInCzk, "Kč");

      const { data: userData } = await supabase
        .from("users")
        .select("id, steam_id, balance")
        .eq("id", userId)
        .maybeSingle();

      if (!userData) {
        throw new Error("User not found");
      }

      console.log("User found:", userData.steam_id, "Current balance:", userData.balance);

      const extOrderId = order.extOrderId || orderId;

      const { data: existingTx } = await supabase
        .from("user_transactions")
        .select("id")
        .eq("reference_id", extOrderId)
        .eq("status", "completed")
        .maybeSingle();

      if (existingTx) {
        console.log("Payment already processed");
        return new Response(
          JSON.stringify({
            success: true,
            status: "completed",
            alreadyProcessed: true,
            currentBalance: userData.balance,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const currentBalance = userData.balance || 0;
      const newBalance = currentBalance + amountInCzk;

      console.log("Inserting transaction and updating balance...");
      console.log("Balance change:", currentBalance, "->", newBalance);

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

      console.log("Transaction inserted successfully");

      const { error: balanceError } = await supabase
        .from("users")
        .update({ balance: newBalance })
        .eq("id", userId);

      if (balanceError) {
        console.error("Error updating balance:", balanceError);
        throw new Error(`Failed to update balance: ${balanceError.message}`);
      }

      console.log(`Balance updated successfully: ${currentBalance} -> ${newBalance}`);

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "payment",
        title: "Deposit Successful",
        message: `Your deposit of ${amountInCzk.toLocaleString()} Kč has been credited to your account.`,
        data: {
          amount: amountInCzk,
          orderId: orderId,
          paymentMethod: "payu",
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          status: "completed",
          amount: amountInCzk,
          newBalance,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: order.status,
        message: "Payment not yet completed",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("=== ERROR ===");
    console.error(error);

    return new Response(
      JSON.stringify({
        error: "Failed to check payment status",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
