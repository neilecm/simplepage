// netlify/functions/admin-update-order.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const adminId = event.headers["x-admin-id"];
  if (!adminId) {
    return {
      statusCode: 401,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  try {
    const { order_id, status } = JSON.parse(event.body || "{}");

    if (!order_id || !status) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "order_id and status are required" }),
      };
    }

    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", adminId)
      .single();

    if (adminError || !admin || admin.role !== "admin") {
      return {
        statusCode: 403,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Forbidden" }),
      };
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("order_id", order_id)
      .select(
        "order_id, user_id, customer_name, customer_email, total, shipping_cost, payment_status, shipping_provider, status, created_at"
      )
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("[admin-update-order]", error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-id",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

