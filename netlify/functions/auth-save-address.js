import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

console.log("[INIT] Supabase using service role key in auth-save-address.js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const successResponse = (message, data) => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message, data }),
});

const errorResponse = (status, message, details = null) => ({
  statusCode: status || 500,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: message || "Unexpected server error",
    details,
  }),
});

export async function handler(event) {
  try {
    if (event.httpMethod && event.httpMethod !== "POST") {
      return errorResponse(405, "Method not allowed");
    }

    const body = JSON.parse(event.body || "{}");
    let {
      user_id,
      full_name,
      street,
      province,
      city,
      district,
      subdistrict,
      postal_code,
      phone,
    } = body;

    // --- handle guest logic
    let guest_id = null;
    if (!user_id || user_id === "guest" || user_id === "") {
      user_id = null;
      guest_id = randomUUID(); // generate a valid UUID for guests
      console.log("🧾 Generated guest_id:", guest_id);
    }

    // --- basic validation
    if (!full_name || !street || !province || !city || !district || !postal_code || !phone) {
      return errorResponse(400, "Missing required address fields");
    }

    // --- build payload
    const newAddress = {
      user_id,
      guest_id,
      full_name,
      street,
      province,
      city,
      district,
      subdistrict: subdistrict || null,
      postal_code,
      phone,
    };

    // --- insert into Supabase
    const { data, error } = await supabase.from("addresses").insert([newAddress]);

    if (error) {
      console.error("[Supabase Insert Error]", error);
      return errorResponse(
        error.status || 500,
        "Supabase insert failed",
        error.message || null
      );
    }

    console.log("[auth-save-address] Success:", {
      user_id,
      guest_id,
      addressId: data?.[0]?.id || null,
    });
    return successResponse("Address saved successfully", data);
  } catch (err) {
    console.error("[auth-save-address] Fatal error:", err);
    return errorResponse(err?.status || 500, err?.message || "Internal Server Error", err?.details || null);
  }
}
