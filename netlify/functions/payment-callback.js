// netlify/functions/payment-callback.js
import crypto from "crypto";
const { MIDTRANS_SERVER_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const fetch2 = (...a) => import("node-fetch").then(({default: f}) => f(...a));

const sha512 = s => crypto.createHash("sha512").update(s).digest("hex");
const ok = body => ({ statusCode: 200, body });

const mapStatus = (tx, fraud) => {
  if (tx === "capture")     return fraud === "accept" ? "paid" : "review";
  if (tx === "settlement")  return "paid";
  if (tx === "pending")     return "pending";
  if (tx === "deny")        return "failed";
  if (tx === "expire")      return "expired";
  if (tx === "cancel")      return "canceled";
  if (tx === "refund" || tx === "partial_refund") return "refunded";
  if (tx === "chargeback")  return "chargeback";
  return tx || "unknown";
};

export async function handler(event) {
  if (event.httpMethod !== "POST") return ok("ok");

  let p = {};
  try { p = JSON.parse(event.body || "{}"); } catch { return ok("invalid-json"); }

  const { order_id, status_code, gross_amount, signature_key } = p;
  const valid = MIDTRANS_SERVER_KEY &&
    sha512(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`) === String(signature_key || "");
  if (!valid) return ok("invalid-signature");

  // Parse transaction_time to timestamptz if present
  let txTime = null;
  if (p.transaction_time) {
    const iso = p.transaction_time.replace(" ", "T") + "Z"; // Midtrans sends "YYYY-MM-DD HH:mm:ss"
    txTime = new Date(iso).toISOString();
  }

  const row = {
    order_id: p.order_id,
    transaction_id: p.transaction_id || null,
    transaction_status: p.transaction_status || null,
    fraud_status: p.fraud_status || null,
    status_code: p.status_code || null,
    status_message: p.status_message || null,
    payment_type: p.payment_type || null,
    gross_amount: p.gross_amount ? Number(p.gross_amount) : null,
    currency: p.currency || null,
    approval_code: p.approval_code || null,
    bank: p.bank || null,
    channel_response_code: p.channel_response_code || null,
    channel_response_message: p.channel_response_message || null,
    card_type: p.card_type || null,
    masked_card: p.masked_card || null,
    eci: p.eci || null,
    three_ds_version: p.three_ds_version || null,
    merchant_id: p.merchant_id || null,
    transaction_time: txTime,
    signature_key: p.signature_key || null,
    raw: p,
    status: mapStatus(p.transaction_status, p.fraud_status)
  };

  const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  };

  try {
    // 1) Log every webhook
    await fetch2(`${SUPABASE_URL}/rest/v1/webhook_events`, {
      method: "POST",
      headers,
      body: JSON.stringify([{ order_id: row.order_id, transaction_id: row.transaction_id, payload: p }])
    });

    // 2) Upsert the order (merge on conflict)
    await fetch2(`${SUPABASE_URL}/rest/v1/orders`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify([row])
    });
  } catch (e) {
    console.error("supabase error", e);
    // Still return 200 so Midtrans doesn’t retry forever
    return ok("upsert-exception");
  }

  return ok("ok");
}
