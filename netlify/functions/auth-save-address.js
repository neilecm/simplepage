// netlify/functions/auth-save-address.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { user_id, full_name, street, city, province, postal_code, phone } =
      JSON.parse(event.body);

    console.log("📦 Incoming address:", {
      user_id,
      full_name,
      street,
      city,
      province,
      postal_code,
      phone,
    });

    // Insert address linked to user_id (foreign key in Supabase)
    const { data, error } = await supabase
      .from("addresses")
      .insert([
        {
          user_id,
          full_name,
          street,
          city,
          province,
          postal_code,
          phone,
        },
      ])
      .select();

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: error.message }),
      };
    }

    console.log("✅ Address saved:", data);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Address saved", address: data[0] }),
    };
  } catch (err) {
    console.error("🔥 Function crash:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}
