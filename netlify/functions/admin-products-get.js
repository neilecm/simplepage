// netlify/functions/admin-products-get.js
import { createClient } from "@supabase/supabase-js";

console.log("[INIT] Supabase using service role key in admin-products-get.js");

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
      .maybeSingle();

    if (adminError) {
      console.error("[admin-products-get] Error:", adminError);
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
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 10);
    const search = params.search || "";
    const status = params.status;
    const id = params.id;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (id) {
      query = query.eq("id", id).maybeSingle();
      const { data, error } = await query;
      if (error) throw error;
      console.log("[admin-products-get] Success:", { adminId, id });
      return successResponse("Product fetched successfully", data || null);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,sku.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query.range(from, to);
    if (error) throw error;

    const result = { records: data || [], count: count ?? 0 };
    console.log("[admin-products-get] Success:", {
      adminId,
      count: result.records.length,
    });
    return successResponse("Products fetched successfully", result);
  } catch (error) {
    console.error("[admin-products-get] Error:", error);
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
