// netlify/functions/admin-product-delete.js
import { createClient } from "@supabase/supabase-js";

console.log("[INIT] Supabase using service role key in admin-product-delete.js");

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
      console.error("[admin-product-delete] Error:", adminError);
      return errorResponse(
        adminError.status || 400,
        adminError.message,
        adminError.details || null
      );
    }

    if (!admin || admin.role !== "admin") {
      return errorResponse(403, "Forbidden");
    }

    const { id } = JSON.parse(event.body || "{}");

    if (!id) {
      return errorResponse(400, "Product id is required");
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log("[admin-product-delete] Success:", { adminId, id });
    return successResponse("Product deleted successfully", { id });
  } catch (error) {
    console.error("[admin-product-delete] Error:", error);
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
