// netlify/functions/vendor-products.js
import { createClient } from "@supabase/supabase-js";

/**
 * CRUD handler for vendor products (list, add, delete).
 */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: "",
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    switch (event.httpMethod) {
      case "GET": {
        const vendor_id =
          event.queryStringParameters?.vendor_id ||
          JSON.parse(event.body || "{}").vendor_id;

        if (!vendor_id) {
          return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: "vendor_id is required" }),
          };
        }

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("vendor_id", vendor_id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        return {
          statusCode: 200,
          headers: corsHeaders(),
          body: JSON.stringify(data),
        };
      }

      case "POST": {
        const body = JSON.parse(event.body || "{}");
        if (!body.vendor_id || !body.name || typeof body.price === "undefined") {
          return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({
              error: "vendor_id, name, and price are required fields.",
            }),
          };
        }

        const { data, error } = await supabase
          .from("products")
          .insert([body])
          .select()
          .single();

        if (error) throw error;

        return {
          statusCode: 201,
          headers: corsHeaders(),
          body: JSON.stringify(data),
        };
      }

      case "DELETE": {
        const id =
          event.queryStringParameters?.id ||
          JSON.parse(event.body || "{}").id;

        if (!id) {
          return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({ error: "Product id is required." }),
          };
        }

        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;

        return {
          statusCode: 200,
          headers: corsHeaders(),
          body: JSON.stringify({ message: "Deleted" }),
        };
      }

      default:
        return {
          statusCode: 405,
          headers: corsHeaders(),
          body: JSON.stringify({ error: "Method not allowed" }),
        };
    }
  } catch (err) {
    console.error("[vendor-products] error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  };
}
