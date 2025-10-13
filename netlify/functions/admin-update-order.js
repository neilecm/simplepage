// netlify/functions/admin-update-order.js
import { createClient } from "@supabase/supabase-js";

console.log("[INIT] Supabase using service role key in admin-update-order.js");

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
    const { order_id, status } = JSON.parse(event.body || "{}");

    if (!order_id || !status) {
      return errorResponse(400, "order_id and status are required");
    }

    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", adminId)
      .single();

    if (adminError) {
      console.error("[admin-update-order] Error:", adminError);
      return errorResponse(
        adminError.status || 400,
        adminError.message,
        adminError.details || null
      );
    }

    if (!admin || admin.role !== "admin") {
      return errorResponse(403, "Forbidden");
    }

    const updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("orders")
      .update({ status, updated_at })
      .eq("order_id", order_id)
      .select(
        "order_id, user_id, customer_name, customer_email, total, shipping_cost, payment_status, shipping_provider, status, created_at, updated_at"
      )
      .single();

    if (error) throw error;

    console.log("[admin-update-order] Success:", { adminId, order_id, status });
    return successResponse("Order updated successfully", data);
  } catch (error) {
    console.error("[admin-update-order] Error:", error);
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
