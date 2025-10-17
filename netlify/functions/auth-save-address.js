import { createClient } from "@supabase/supabase-js";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing Supabase env vars" }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = JSON.parse(event.body || "{}");

    // identity: one of these must be present
    const user_id  = body.user_id ?? null;
    const guest_id = body.guest_id ?? null;

    const {
      full_name,
      phone,
      street,
      province_id, city_id, district_id, subdistrict_id,
      postal_code,
      courier = null,
      shipping_service = null,
    } = body;

    if (!full_name || !street || !(user_id || guest_id)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "full_name, street and user_id or guest_id are required" })
      };
    }

    const insertRow = {
      user_id, guest_id,
      full_name,
      phone,
      street,
      province: province_id ?? null,
      city_id: city_id ?? null,
      district: district_id ?? null,
      subdistrict: subdistrict_id ?? null,
      postal_code: postal_code ?? null,
      courier,
      shipping_service,
      order_id: null, // will be updated after order creation
    };

    const { error } = await supabase.from("addresses").insert([insertRow]);
    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message || "unknown error" }) };
  }
}
