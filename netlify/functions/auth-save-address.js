import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const handler = async (event) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const body = JSON.parse(event.body);
    const { user_id, address, province_id, city_id, subdistrict_id, postal_code } = body;

    const { data, error } = await supabase
      .from("addresses")
      .insert([
        {
          id: randomUUID(),
          user_id,
          address,
          province_id,
          city_id,
          subdistrict_id,
          postal_code,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data }),
    };
  } catch (err) {
    console.error("auth-save-address error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
