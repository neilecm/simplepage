// netlify/functions/admin-get-order-details.js
import { createClient } from "@supabase/supabase-js";

console.log("[INIT] Supabase using service role key in admin-get-order-details.js");

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
  const orderId = event.queryStringParameters?.order_id;

  if (!adminId) {
    return errorResponse(401, "Unauthorized");
  }

  if (!orderId) {
    return errorResponse(400, "order_id is required");
  }

  try {
    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", adminId)
      .maybeSingle();

    if (adminError) {
      console.error("[admin-get-order-details] Error:", adminError);
      return errorResponse(
        adminError.status || 400,
        adminError.message,
        adminError.details || null
      );
    }

    if (!admin || admin.role !== "admin") {
      return errorResponse(403, "Forbidden");
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return errorResponse(404, "Order not found");
    }

    console.log("[admin-get-order-details] Success:", {
      adminId,
      orderId,
    });
    return successResponse("Order fetched successfully", data);
  } catch (error) {
    console.error("[admin-get-order-details] Error:", error);
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
