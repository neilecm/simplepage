// src/controllers/AuthController.js
import { SupabaseModel } from "../models/SupabaseModel.js";

export class AuthController {
  static async saveAddress(payload) {
    const user_id = payload.user_id || "guest"; // temporary guest user
    return SupabaseModel.insertAddress({ user_id, ...payload });
  }
}
