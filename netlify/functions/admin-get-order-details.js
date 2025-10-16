// netlify/functions/admin-get-order-details.js
export async function handler(event) {
  try {
    const url = new URL(event.rawUrl || event.headers["x-nf-request-url"]);
    const id = url.searchParams.get("id");
    if (!id) return { statusCode: 400, body: "missing id" };

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    const headers = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    };

    const query = `order_id=eq.${encodeURIComponent(id)}&select=*`;
    const detailUrl = `${SUPABASE_URL}/rest/v1/orders?${query}`;

    const resp = await fetch(detailUrl, { headers });
    const text = await resp.text();
    if (!resp.ok) return { statusCode: resp.status, body: text || "fetch-error" };

    return { statusCode: 200, body: text || "[]" };
  } catch (e) {
    console.error("admin-get-order-details error", e);
    return { statusCode: 500, body: "server-error" };
  }
}
