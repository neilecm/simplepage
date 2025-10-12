// netlify/functions/admin-product-save.js
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

    const payload = JSON.parse(event.body || "{}");
    const {
      id,
      name,
      description,
      category,
      price,
      stock,
      sku,
      weight,
      status = "active",
      variations = [],
      attributes = {},
      images = [],
      video = null,
      min_qty,
      max_qty,
    } = payload;

    if (!name || !category || price === undefined || stock === undefined || !sku) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const now = new Date().toISOString();

    const record = {
      name,
      description,
      category,
      price,
      stock,
      sku,
      weight,
      status,
      variations,
      attributes,
      images,
      video,
      min_qty,
      max_qty,
      updated_at: now,
    };

    if (!id) {
      record.id = randomUUID();
      record.created_at = now;
      const { data, error } = await supabase
        .from("products")
        .insert([record])
        .select()
        .single();

      if (error) throw error;

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ success: true, product: data }),
      };
    }

    const { data, error } = await supabase
      .from("products")
      .update(record)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true, product: data }),
    };
  } catch (error) {
    console.error("[admin-product-save]", error);
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

