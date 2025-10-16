// netlify/functions/payment-callback.js
import crypto from "crypto";
import fetch from "node-fetch"; // ensure bundled, or global fetch if runtime supports

const { MIDTRANS_SERVER_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

function sha512(input) {
  return crypto.createHash("sha512").update(input).digest("hex");
}

function verifySignature({ order_id, status_code, gross_amount, signature_key }) {
  if (!MIDTRANS_SERVER_KEY) return false; // if missing, fail closed
  const local = sha512(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`);
  return local === String(signature_key);
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 200, body: "ok" }; // Midtrans may probe; stay 200
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 200, body: "invalid-json" };
  }

  const {
    order_id,
    status_code,
    gross_amount,
    transaction_status,        // capture, settlement, deny, cancel, expire, pending
    fraud_status,              // accept, challenge
    payment_type,
    transaction_time,
    transaction_id,
    signature_key,
  } = payload;

  // 1) Verify signature; if invalid, return 200 quickly.
  if (!verifySignature({ order_id, status_code, gross_amount, signature_key })) {
    console.warn("payment-callback: invalid signature", { order_id, status_code, gross_amount });
    return { statusCode: 200, body: "invalid-signature" };
  }

  // 2) Map Midtrans status -> your order status (adjust as you like)
  const statusMap = {
    capture: fraud_status === "accept" ? "paid" : "review",
    settlement: "paid",
    pending: "pending",
    deny: "failed",
    expire: "expired",
    cancel: "canceled",
    refund: "refunded",
    partial_refund: "refunded",
    chargeback: "chargeback",
  };
  const status = statusMap[transaction_status] || transaction_status || "unknown";

  // 3) Upsert to Supabase via Service Role (no RLS worries). Keep this minimal.
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify([{
        order_id,
        status,
        total: Number(gross_amount) || null,
        payment_type,
        transaction_time,
        transaction_id,
        raw: payload // optional: store raw webhook for debugging
      }]),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("supabase upsert failed", res.status, txt);
      // Still return 200 so Midtrans won’t retry forever; you can alert/monitor on this
      return { statusCode: 200, body: "upsert-error" };
    }
  } catch (e) {
    console.error("supabase fetch error", e);
    return { statusCode: 200, body: "upsert-exception" };
  }

  // 4) Always 200, quickly.
  return { statusCode: 200, body: "ok" };
}
