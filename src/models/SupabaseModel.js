// src/models/SupabaseModel.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseModel {
  // ---- Address ----
  static async insertAddress({ user_id, full_name, phone, address, city_id, postal_code }) {
    const { data, error } = await supabase
      .from("addresses")
      .insert([{ user_id, full_name, phone, address, city_id, postal_code }])
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  // ---- Orders ----
  static async insertOrder(order) {
    const { data, error } = await supabase.from("orders").insert([order]).select("*").single();
    if (error) throw error;
    return data;
  }

  static async updateOrderStatus(order_id, status) {
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("order_id", order_id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
}
