// netlify/functions/vendor-register.js
import { createClient } from "@supabase/supabase-js";

console.log("[INIT] Supabase using service role key in vendor-register.js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/**
 * Register a new vendor record in Supabase.
 */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    switch (event.httpMethod) {
      case "POST": {
        const { user_id, store_name, description = "", logo_url = "" } = body;
        if (!user_id || !store_name) {
          return errorResponse(400, "user_id and store_name are required.");
        }

        const slug = createSlug(store_name);

        const { data, error } = await supabase
          .from("vendors")
          .insert([{ user_id, store_name, description, logo_url, slug }])
          .select()
          .single();

        if (error) throw error;

        console.log("[vendor-register] POST Success:", { user_id, vendorId: data?.id });
        return successResponse("Vendor registered successfully", data);
      }

      case "PUT":
      case "PATCH": {
        const {
          id,
          user_id,
          store_name,
          description = "",
          logo_url = "",
        } = body;

        if (!id && !user_id) {
          return errorResponse(400, "Vendor id or user_id is required for updates.");
        }

        const updates = {};
        if (typeof store_name === "string" && store_name.trim()) {
          updates.store_name = store_name.trim();
          updates.slug = createSlug(store_name);
        }
        if (typeof description === "string") updates.description = description;
        if (typeof logo_url === "string") updates.logo_url = logo_url;

        if (!Object.keys(updates).length) {
          return errorResponse(400, "No update fields provided.");
        }

        const query = supabase.from("vendors").update(updates);
        if (id) query.eq("id", id);
        else query.eq("user_id", user_id);

        const { data, error } = await query.select().single();
        if (error) throw error;

        console.log("[vendor-register] UPDATE Success:", {
          id: data?.id || id,
          user_id,
        });
        return successResponse("Vendor updated successfully", data);
      }

      default:
        return errorResponse(405, "Method not allowed");
    }
  } catch (err) {
    console.error("[vendor-register] Error:", err);
    return errorResponse(err?.status || 500, err?.message || "Internal server error", err?.details || null);
  }
}

function createSlug(name = "") {
  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
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
