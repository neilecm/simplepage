// netlify/functions/vendor-products.js
import { createClient } from "@supabase/supabase-js";

console.log("[INIT] Supabase using service role key in vendor-products.js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/**
 * CRUD handler for vendor products (list, add, delete).
 */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  try {
    switch (event.httpMethod) {
      case "GET": {
        const vendor_id =
          event.queryStringParameters?.vendor_id ||
          JSON.parse(event.body || "{}").vendor_id;

        if (!vendor_id) {
          return errorResponse(400, "vendor_id is required");
        }

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("vendor_id", vendor_id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        console.log("[vendor-products] GET Success:", {
          vendor_id,
          count: data?.length || 0,
        });
        return successResponse("Products fetched successfully", data || []);
      }

      case "POST": {
        const body = JSON.parse(event.body || "{}");
        if (!body.vendor_id || !body.name || typeof body.price === "undefined") {
          return errorResponse(
            400,
            "vendor_id, name, and price are required fields."
          );
        }

        const { data, error } = await supabase
          .from("products")
          .insert([body])
          .select()
          .single();

        if (error) throw error;

        console.log("[vendor-products] POST Success:", {
          vendor_id: body.vendor_id,
          productId: data?.id,
        });
        return successResponse("Vendor product created successfully", data);
      }

      case "DELETE": {
        const id =
          event.queryStringParameters?.id ||
          JSON.parse(event.body || "{}").id;

        if (!id) {
          return errorResponse(400, "Product id is required.");
        }

        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;

        console.log("[vendor-products] DELETE Success:", { id });
        return successResponse("Vendor product deleted successfully", { id });
      }

      default:
        return errorResponse(405, "Method not allowed");
    }
  } catch (err) {
    console.error("[vendor-products] Error:", err);
    return errorResponse(err?.status || 500, err?.message || "Internal server error", err?.details || null);
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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
