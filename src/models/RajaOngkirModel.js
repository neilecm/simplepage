// src/models/RajaOngkirModel.js
const BASE_URL = process.env.RAJAONGKIR_BASE_URL || "https://api.rajaongkir.com/starter";
const API_KEY  = process.env.RAJAONGKIR_API_KEY;

if (!API_KEY) {
  console.warn("[RajaOngkirModel] RAJAONGKIR_API_KEY is missing");
}

async function roFetch(path, { method = "GET", body } = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    key: API_KEY,
    "Content-Type": "application/json"
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[RajaOngkir] ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

export class RajaOngkirModel {
  static async provinces() {
    return roFetch("/province");
  }
  static async cities(provinceId) {
    const q = provinceId ? `?province=${encodeURIComponent(provinceId)}` : "";
    return roFetch(`/city${q}`);
  }
  static async subdistricts(cityId) {
    // PRO tier endpoint
    const q = `?city=${encodeURIComponent(cityId)}`;
    return roFetch(`/subdistrict${q}`);
  }
  static async cost({ origin, destination, weight, courier, originType = "city", destinationType = "city" }) {
    // PRO uses originType/destinationType (city/subdistrict)
    return roFetch("/cost", {
      method: "POST",
      body: {
        origin,
        originType,
        destination,
        destinationType,
        weight,   // in grams
        courier,  // e.g., "jne", "tiki", "pos"
      },
    });
  }
}
