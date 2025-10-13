// netlify/functions/admin-get-orders.js
import { createClient } from "@supabase/supabase-js";

console.log("[INIT] Supabase using service role key in admin-get-orders.js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "GET") {
    return errorResponse(405, "Method not allowed");
  }

  const adminId = event.headers["x-admin-id"];
  if (!adminId) {
    return errorResponse(401, "Unauthorized");
  }

  try {
    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", adminId)
      .single();

    if (adminError) {
      console.error("[admin-get-orders] Error:", adminError);
      return errorResponse(
        adminError.status || 400,
        adminError.message,
        adminError.details || null
      );
    }

    if (!admin || admin.role !== "admin") {
      return errorResponse(403, "Forbidden");
    }

    const params = event.queryStringParameters || {};
    const status = params.status;
    const search = params.search;
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 50);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("orders")
      .select(
        "order_id, user_id, customer_name, customer_email, total, shipping_cost, payment_status, shipping_provider, status, created_at, updated_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `order_id.ilike.%${search}%,customer_name.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const result = { records: data || [], count: count ?? 0 };
    console.log("[admin-get-orders] Success:", {
      adminId,
      count: result.records.length,
    });
    return successResponse("Orders fetched successfully", result);
  } catch (error) {
    console.error("[admin-get-orders] Error:", error);
    return errorResponse(error.status || 500, error.message, error.details || null);
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-id",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

const successResponse = (message, data) => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json", ...corsHeaders() },
  body: JSON.stringify({ message, data }),
});

const errorResponse = (status, message, details = null) => ({
  statusCode: status || 500,
  headers: { "Content-Type": "application/json", ...corsHeaders() },
  body: JSON.stringify({
    message: message || "Unexpected server error",
    details,
  }),
});
