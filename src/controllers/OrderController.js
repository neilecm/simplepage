// src/controllers/OrderController.js
import { SupabaseModel } from "../models/SupabaseModel.js";

export class OrderController {
  static async createOrder({ user_id, items, total, shipping_cost, address }) {
    const order = {
      order_id: "ORDER-" + Date.now(),
      user_id,
      items,
      total,
      shipping_cost,
      address,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    return SupabaseModel.insertOrder(order);
  }
}
