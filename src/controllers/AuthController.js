// src/controllers/AuthController.js
import { randomUUID } from "crypto";
import { SupabaseModel } from "../models/SupabaseModel.js";

function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export class AuthController {
  static async saveAddress(body = {}, headers = {}) {
    // 1) Extract + sanitize
    const {
      user_id: rawUserId,
      guest_id: rawGuestId,               // optional from frontend (localStorage)
      full_name, street,
      province, city, district, subdistrict,
      postal_code, phone,
      province_id, city_id, district_id, subdistrict_id,
    } = body;

    const user_id = (rawUserId && rawUserId !== "guest") ? rawUserId : null;

    // Prefer guest_id from client if it looks like a UUID; otherwise generate one
    const guest_id = user_id
      ? null
      : (isUuid(rawGuestId) ? rawGuestId : randomUUID());

    // 2) Basic validation (keep it pragmatic)
    const missing = [];
    if (!full_name)   missing.push("Full Name");
    if (!street)      missing.push("Street Address");
    if (!province)    missing.push("Province");
    if (!city)        missing.push("City");
    if (!district)    missing.push("District");
    if (!postal_code) missing.push("Postal Code");
    if (!phone)       missing.push("Phone");

    if (missing.length) {
      return { status: 400, ok: false, error: `Missing required fields: ${missing.join(", ")}` };
    }

    // 3) Build payload for DB
    const address = {
      user_id,                // nullable
      guest_id,               // nullable for logged-in, filled for guests
      full_name,
      street,
      province,
      city,
      district,
      subdistrict: subdistrict || null,
      postal_code,
      phone,
      // store raw ids in meta for future lookups (optional but handy)
      meta: {
        province_id: province_id ?? null,
        city_id: city_id ?? null,
        district_id: district_id ?? null,
        subdistrict_id: subdistrict_id ?? null,
      },
    };

    // 4) Persist
    const row = await SupabaseModel.insertAddress(address);
    return { status: 200, ok: true, data: row };
  }
}
