// netlify/functions/admin-product-delete.js
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
    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", adminId)
      .maybeSingle();

    if (adminError || !admin || admin.role !== "admin") {
      return {
        statusCode: 403,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Forbidden" }),
      };
    }

    const { id } = JSON.parse(event.body || "{}");

    if (!id) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Product id is required" }),
      };
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("[admin-product-delete]", error);
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

