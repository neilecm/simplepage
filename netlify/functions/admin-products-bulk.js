// netlify/functions/admin-products-bulk.js
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

console.log("[INIT] Supabase using service role key in admin-products-bulk.js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
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
      console.error("[admin-products-bulk] Error:", adminError);
      return errorResponse(
        adminError.status || 400,
        adminError.message,
        adminError.details || null
      );
    }

    if (!admin || admin.role !== "admin") {
      return errorResponse(403, "Forbidden");
    }

    const body = JSON.parse(event.body || "{}");
    const products = Array.isArray(body.products) ? body.products : [];

    if (!products.length) {
      return errorResponse(400, "No products supplied");
    }

    const now = new Date().toISOString();
    const records = products.map((item) => ({
      id: item.id || randomUUID(),
      name: item.name || "Untitled Product",
      description: item.description || "",
      category: item.category || "General",
      price: Number(item.price) || 0,
      stock: Number(item.stock) || 0,
      sku: item.sku || randomUUID(),
      weight: Number(item.weight) || 0,
      status: item.status || "active",
      variations: item.variations || [],
      attributes: item.attributes || {},
      images: item.images || [],
      video: item.video || null,
      min_qty: item.min_qty ?? null,
      max_qty: item.max_qty ?? null,
      created_at: item.created_at || now,
      updated_at: now,
    }));

    const { data, error } = await supabase
      .from("products")
      .upsert(records)
      .select();

    if (error) throw error;

    const result = { count: data?.length ?? 0 };
    console.log("[admin-products-bulk] Success:", {
      adminId,
      inserted: result.count,
    });
    return successResponse("Products imported successfully", result);
  } catch (error) {
    console.error("[admin-products-bulk] Error:", error);
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
