<<<<<<< HEAD
// netlify/functions/auth-save-address.js
// CommonJS Netlify function (works with Netlify's Node runtime)
// Saves minimal address columns and packs everything else into JSONB `meta`.
=======
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
>>>>>>> restore-shipping

const { createClient } = require("@supabase/supabase-js");

<<<<<<< HEAD
// ---- Env checks (fail fast with clear error) -------------------------------
const SUPABASE_URL  = process.env.SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase env vars. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(SUPABASE_URL || "", SERVICE_KEY || "");

// Small helpers
const json = (status, payload) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  },
  body: JSON.stringify(payload),
});

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json(500, { error: "Server misconfigured: Supabase env vars missing" });
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    // ---- Validate ONLY columns that exist in public.addresses ---------------
    const required = ["full_name", "street", "city", "province", "postal_code", "phone"];
    const missing = required.filter((k) => !body[k]);
    if (missing.length) {
      return json(400, { error: `Missing: ${missing.join(", ")}` });
    }

    // ---- Map to table columns ------------------------------------------------
    const row = {
      full_name:   String(body.full_name),
      street:      String(body.street),
      city:        String(body.city),
      province:    String(body.province),
      postal_code: String(body.postal_code),
      phone:       String(body.phone),

      // Optional: include if your table has this column
      // user_id: body.user_id || null,

      // ---- Everything else into JSONB `meta` --------------------------------
      meta: {
        province_id:    body.province_id ?? null,
        city_id:        body.city_id ?? null,
        district_id:    body.district_id ?? null,
        subdistrict_id: body.subdistrict_id ?? null,
        weight:         body.weight ?? null,
        shipping:       body.shipping ?? null, // { courier, service, price, etd }
      },
=======
export async function handler(event) {
  try {
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
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required address fields" }),
      };
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
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Supabase insert failed",
          details: error.message,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Address saved successfully", data }),
>>>>>>> restore-shipping
    };

    const { data, error } = await supabase
      .from("addresses")
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return json(500, { error: error.message || "Insert failed" });
    }

    return json(200, { ok: true, data });
  } catch (err) {
<<<<<<< HEAD
    console.error("auth-save-address ERROR:", err);
    return json(500, { error: err.message || "Unexpected server error" });
=======
    console.error("[auth-save-address] Fatal error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", details: err.message }),
    };
>>>>>>> restore-shipping
  }
};


