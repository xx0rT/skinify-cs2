import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { createHash } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/* PayU "second key" (signature key) — production value lives in
   Supabase function secrets as PAYU_SECOND_KEY. The previous hardcoded
   sandbox key has been removed. */
const PAYU_SECOND_KEY = Deno.env.get("PAYU_SECOND_KEY") || "";

/* PayU signs notifications with MD5(rawBody + secondKey) and ships the
   result in the OpenPayU-Signature header as a semicolon-delimited list,
   e.g. `sender=checkout;signature=<md5>;algorithm=MD5;content=DOCUMENT`.
   Earlier this function used HMAC-SHA256, which never matched a real
   signature — verification only ever passed because the fallback string
   compare also accepted unsigned payloads. Now we parse the header
   properly and require an exact algorithm + signature match. */
function parseSignatureHeader(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k && v) out[k.toLowerCase()] = v;
  }
  return out;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function verifyPayUSignature(body: string, header: string): boolean {
  if (!PAYU_SECOND_KEY) {
    console.error("PAYU_SECOND_KEY not configured — rejecting webhook");
    return false;
  }
  const parsed = parseSignatureHeader(header);
  const algo = (parsed.algorithm || "MD5").toUpperCase();
  const received = (parsed.signature || "").toLowerCase();
  if (!received) return false;
  if (algo !== "MD5") {
    console.error("Unexpected PayU signature algorithm:", algo);
    return false;
  }
  const expected = createHash("md5")
    .update(body + PAYU_SECOND_KEY, "utf8")
    .digest("hex")
    .toLowerCase();
  return timingSafeEqualHex(received, expected);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const bodyText = await req.text();
    const signature = req.headers.get("OpenPayu-Signature") || "";

    console.log("=== PAYU WEBHOOK RECEIVED ===");
    console.log("Body:", bodyText);
    console.log("Signature header:", signature);

    if (!verifyPayUSignature(bodyText, signature)) {
      console.error("Invalid PayU signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const notification = JSON.parse(bodyText);
    const order = notification.order;

    console.log("=== PAYU ORDER NOTIFICATION ===");
    console.log("Order ID:", order.orderId);
    console.log("Ext Order ID:", order.extOrderId);
    console.log("Status:", order.status);
    console.log("Total Amount (cents):", order.totalAmount);
    console.log("Currency:", order.currencyCode);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const extOrderId = order.extOrderId;
    const userIdMatch = extOrderId.match(/deposit_([a-f0-9-]+)_/);

    if (!userIdMatch) {
      console.error("Could not extract user ID from extOrderId:", extOrderId);
      return new Response(
        JSON.stringify({ error: "Invalid order ID format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = userIdMatch[1];
    const amountInHaleru = parseInt(order.totalAmount);
    const amountInCzk = Math.round(amountInHaleru / 100);

    console.log("User ID:", userId);
    console.log("Amount in haléřů:", amountInHaleru);
    console.log("Amount in CZK:", amountInCzk);

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, steam_id, current_balance")
      .eq("id", userId)
      .maybeSingle();

    if (userError || !userData) {
      console.error("Error fetching user:", userError);
      throw new Error("User not found");
    }

    const { data: existingTransaction } = await supabase
      .from("user_transactions")
      .select("id, status")
      .eq("reference_id", extOrderId)
      .maybeSingle();

    if (existingTransaction) {
      console.log("Transaction already processed:", extOrderId);

      if (existingTransaction.status !== order.status) {
        await supabase
          .from("user_transactions")
          .update({
            status: order.status === "COMPLETED" ? "completed" : order.status === "CANCELED" ? "cancelled" : "failed",
            metadata: order,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingTransaction.id);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Already processed" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const currentBalance = userData.current_balance || 0;
    const newBalance = order.status === "COMPLETED" ? currentBalance + amountInCzk : currentBalance;

    const { error: txError } = await supabase
      .from("user_transactions")
      .insert({
        user_id: userId,
        steam_id: userData.steam_id,
        type: "deposit",
        amount: amountInCzk,
        balance_before: currentBalance,
        balance_after: newBalance,
        description: `PayU deposit - ${amountInCzk.toLocaleString()} Kč`,
        reference_id: order.orderId,
        payment_method: "payu",
        metadata: order,
        status: order.status === "COMPLETED" ? "completed" : order.status === "CANCELED" ? "cancelled" : "pending",
        completed_at: order.status === "COMPLETED" ? new Date().toISOString() : null,
      });

    if (txError) {
      console.error("Error creating transaction:", txError);
      throw txError;
    }

    if (order.status === "COMPLETED") {
      console.log("Payment completed, crediting user balance");

      const { error: balanceError } = await supabase
        .from("users")
        .update({ current_balance: newBalance })
        .eq("id", userId);

      if (balanceError) {
        console.error("Error updating balance:", balanceError);
        throw balanceError;
      }

      console.log(`Balance updated: ${currentBalance} -> ${newBalance}`);

      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          type: "payment",
          title: "Deposit Successful",
          message: `Your deposit of ${amountInCzk.toLocaleString()} Kč has been credited to your account.`,
          data: {
            amount: amountInCzk,
            orderId: order.orderId,
            paymentMethod: "payu",
          },
        });

      if (notifError) {
        console.error("Error creating notification:", notifError);
      }
    } else if (order.status === "CANCELED" || order.status === "REJECTED") {
      console.log("Payment failed or canceled:", order.status);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("=== PAYU WEBHOOK ERROR ===");
    console.error(error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Webhook processing failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
