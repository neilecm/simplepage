// src/models/SupabaseModel.js
import { createClient } from "@supabase/supabase-js";

const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export class SupabaseModel {
  static async insertAddress(address) {
    const { data, error } = await client
      .from("addresses")
      .insert([address])
      .select()
      .single();

    if (error) {
      // Bubble a clean Error up to controller
      const err = new Error(error.message || "Supabase insert failed");
      err.code = error.code;
      throw err;
    }
    return data;
  }
}
