// netlify/functions/admin-get-orders.js
export async function handler(event) {
  try {
    const url = new URL(event.rawUrl || event.headers["x-nf-request-url"]);

    const page  = Math.max(1, parseInt(url.searchParams.get("page")  || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));

    // Ask for total only when explicitly requested (slower on large tables)
    const includeTotal = (url.searchParams.get("includeTotal") || "false").toLowerCase() === "true";

    const status = url.searchParams.get("status") || "all";
    const q = url.searchParams.get("q") || "";

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, body: "missing env" };
    }

    const headers = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };
    if (includeTotal) {
      // cheaper than exact, still gives an estimate fast
      headers.Prefer = "count=planned";
    }

    // Build REST query
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("order", "created_at.desc");
    params.set("limit", String(limit));
    params.set("offset", String((page - 1) * limit));

    const filters = [];
    if (status && status !== "all") filters.push(`status=eq.${encodeURIComponent(status)}`);
    if (q) filters.push(`order_id=ilike.*${encodeURIComponent(q)}*`);
    const filterStr = filters.length ? `&${filters.join("&")}` : "";

    const listUrl = `${SUPABASE_URL}/rest/v1/orders?${params.toString()}${filterStr}`;

    // Add an 8s guard so Netlify Dev (10s) doesn't kill us mid-flight
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000);

    const resp = await fetch(listUrl, { headers, signal: ac.signal });
    clearTimeout(t);

    const text = await resp.text();
    if (!resp.ok) {
      return { statusCode: resp.status, body: text || "fetch-error" };
    }

    const data = text ? JSON.parse(text) : [];
    let total = null;
    if (includeTotal) {
      const cr = resp.headers.get("content-range"); // e.g. "0-9/127"
      if (cr && cr.includes("/")) total = parseInt(cr.split("/")[1], 10);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ data, total, page, limit }),
    };
  } catch (e) {
    // If we aborted due to timeout, surface a friendly message
    if (e && e.name === "AbortError") {
      return { statusCode: 504, body: "timeout" };
    }
    console.error("admin-get-orders error", e);
    return { statusCode: 500, body: "server-error" };
  }
}
