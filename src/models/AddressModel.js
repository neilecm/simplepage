// src/models/AddressModel.js
import { apiFetch } from "../../netlify/functions/api.js";

export async function saveAddress(payload) {
  return apiFetch("auth", "saveAddress", payload);
}
