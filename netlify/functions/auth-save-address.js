import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    };
  } catch (err) {
    console.error("[auth-save-address] Fatal error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", details: err.message }),
    };
  }
}
