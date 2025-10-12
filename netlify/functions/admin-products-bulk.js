// netlify/functions/admin-products-bulk.js
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

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

    const body = JSON.parse(event.body || "{}");
    const products = Array.isArray(body.products) ? body.products : [];

    if (!products.length) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "No products supplied" }),
      };
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

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true, count: data?.length ?? 0 }),
    };
  } catch (error) {
    console.error("[admin-products-bulk]", error);
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

