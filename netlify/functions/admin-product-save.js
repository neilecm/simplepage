// netlify/functions/admin-product-save.js
import { createClient } from "@supabase/supabase-js";

console.log("[INIT] Supabase using service role key in admin-product-save.js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");
const encodePath = (path = "") =>
  path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const ensurePublicMediaUrl = (value) => {
  if (typeof value !== "string" || !value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  const base = trimTrailingSlash(process.env.SUPABASE_URL || "");
  const cleaned = value.startsWith("public/") ? value.slice(7) : value;
  const encodedPath = encodePath(cleaned);
  return base
    ? `${base}/storage/v1/object/public/product_media/${encodedPath}`
    : value;
};

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

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (parseError) {
    console.error("[admin-product-save]", {
      action: "parse",
      error: parseError,
    });
    return errorResponse(400, "Invalid JSON body");
  }

  const {
    id,
    user_id: userId,
    name,
    description,
    category,
    price,
    stock,
    sku,
    weight,
    variations = [],
    attributes = {},
    images = [],
    video = null,
    status = "active",
    min_qty,
    max_qty,
  } = body;
  const normalizedImages = Array.isArray(images)
    ? images.map((item) => ensurePublicMediaUrl(item))
    : [];
  const normalizedVideo = ensurePublicMediaUrl(video);

  if (!userId) {
    return errorResponse(400, "Missing user identifier");
  }

  try {
    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (adminError) {
      console.error("[admin-product-save]", {
        action: "admin-check",
        sku,
        error: adminError,
      });
      return errorResponse(400, adminError.message, adminError.details || null);
    }

    if (!admin || admin.role !== "admin") {
      return errorResponse(403, "Access denied: admin only");
    }

    if (
      !name ||
      price === undefined ||
      stock === undefined ||
      !sku ||
      weight === undefined
    ) {
      return errorResponse(
        400,
        "Missing required fields: name, price, stock, sku, weight"
      );
    }

    const now = new Date().toISOString();

    const payload = {
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
      images: normalizedImages,
      video: normalizedVideo,
      min_qty,
      max_qty,
      updated_at: now,
    };
    console.log("[UPLOAD FIX] using public bucket path", {
      imageCount: normalizedImages.length,
      hasVideo: Boolean(normalizedVideo),
    });

    let data;
    let error;
    const action = id ? "update" : "insert";

    const payloadSize = event.body ? Buffer.byteLength(event.body, "utf8") : 0;
    console.log("[admin-product-save]", {
      action,
      sku,
      imageCount: normalizedImages.length,
      payloadSize,
    });

    if (id) {
      ({ data, error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", id)
        .select());
    } else {
      ({ data, error } = await supabase
        .from("products")
        .insert([{ ...payload }])
        .select());
    }

    if (error) {
      console.error("[admin-product-save]", {
        action,
        sku,
        error,
      });
      return errorResponse(error.status || 400, error.message, error.details || null);
    }

    const product = Array.isArray(data) ? data[0] : data;
    if (!product) {
      console.error("[admin-product-save]", {
        action,
        sku,
        error: new Error("No product returned"),
      });
      return errorResponse(404, "Product not found");
    }

    console.log("[admin-product-save] Success:", {
      action,
      sku,
      result: product,
    });

    return successResponse("Product saved successfully", product);
  } catch (error) {
    console.error("[admin-product-save] Error:", {
      action: "unhandled",
      sku,
      error,
    });
    return errorResponse(error.status || 500, error.message, error.details || null);
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
