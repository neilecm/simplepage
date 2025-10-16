// netlify/functions/admin-update-order.js
export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "method-not-allowed" };

  try {
    const { id, patch } = JSON.parse(event.body || "{}");
    if (!id || !patch || typeof patch !== "object") {
      return { statusCode: 400, body: "missing id or patch" };
    }

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    const headers = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates"
    };

    // Upsert by primary key (order_id)
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify([{ order_id: id, ...patch }]),
    });
    const txt = await resp.text();
    if (!resp.ok) return { statusCode: resp.status, body: txt || "update-error" };

    return { statusCode: 200, body: txt || "{}" };
  } catch (e) {
    console.error("admin-update-order error", e);
    return { statusCode: 500, body: "server-error" };
  }
}
