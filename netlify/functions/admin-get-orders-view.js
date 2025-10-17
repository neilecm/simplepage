import { createClient } from "@supabase/supabase-js";

export async function handler(event) {
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing Supabase env vars" }) };
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(event.rawUrl || `http://x/?${new URLSearchParams(event.queryStringParameters || {})}`);
    const page  = Math.max(1, parseInt(url.searchParams.get("page")  || "1", 10));
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "10", 10));
    const q     = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "all").toLowerCase();

    let query = supabase
      .from("admin_orders_enriched")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status !== "all") query = query.eq("status", status);
    if (q) {
      query = query.or([
        `order_id.ilike.%${q}%`,
        `customer_name.ilike.%${q}%`,
        `shipping_method.ilike.%${q}%`,
        `payment_type.ilike.%${q}%`
      ].join(","));
    }

    const { data, count, error } = await query;
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };

    return { statusCode: 200, body: JSON.stringify({ data: data || [], count, page, limit }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || "Unknown error" }) };
  }
}
