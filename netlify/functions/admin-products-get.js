// netlify/functions/admin-products-get.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "GET") {
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
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify(data || null),
      };
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

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ data: data || [], count: count ?? 0 }),
    };
  } catch (error) {
    console.error("[admin-products-get]", error);
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

