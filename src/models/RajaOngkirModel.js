// src/models/RajaOngkirModel.js
const BASE_URL =
  process.env.RAJAONGKIR_BASE_URL || "https://rajaongkir.komerce.id/api/v1";
const API_KEY =
  process.env.RAJAONGKIR_API_KEY || process.env.RAJAONGKIR_DELIVERY_KEY;

// Utility: convert object → x-www-form-urlencoded
function toFormUrlEncoded(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

// Generic GET fetcher (for hierarchical endpoints)
async function roFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Key: API_KEY, // Capital K required
      "Content-Type": "application/json",
    },
  });

  const json = await res.json();
  if (!res.ok || json.meta?.code !== 200) {
    throw new Error(`[RajaOngkir V2] ${json.meta?.message || res.statusText}`);
  }

  // Normalize to old RajaOngkir-style for frontend compatibility
  return {
    rajaongkir: {
      status: json.meta,
      results: json.data || [],
    },
  };
}

export class RajaOngkirModel {
  // 1️⃣ Provinces
  static async provinces() {
    return roFetch("/destination/province");
  }

  // 2️⃣ Cities by province
  static async cities(province_id) {
    if (!province_id) throw new Error("Missing province_id");
    return roFetch(`/destination/city/${encodeURIComponent(province_id)}`);
  }

  // 3️⃣ Districts by city
  static async districts(city_id) {
    if (!city_id) throw new Error("Missing city_id");
    return roFetch(`/destination/district/${encodeURIComponent(city_id)}`);
  }

  // 4️⃣ Subdistricts by district
  static async subdistricts(district_id) {
    if (!district_id) throw new Error("Missing district_id");
    return roFetch(`/destination/sub-district/${encodeURIComponent(district_id)}`);
  }

  // 5️⃣ Domestic cost (district-level precision)
  static async domesticCost({
    origin,
    destination,
    weight,
    courier,
    price = "lowest",
  }) {
    const formBody = toFormUrlEncoded({
      origin,
      destination,
      weight,
      courier, // e.g., "jne:sicepat:jnt:pos"
      price,
    });

    const res = await fetch(
      `${BASE_URL}/calculate/district/domestic-cost`,
      {
        method: "POST",
        headers: {
          key: API_KEY, // lowercase key per official example
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody,
      }
    );

    const json = await res.json();
    if (!res.ok || json.meta?.code !== 200) {
      throw new Error(`[RajaOngkir V2] ${json.meta?.message || res.statusText}`);
    }

    return {
      rajaongkir: {
        status: json.meta,
        results: json.data || [],
      },
    };
  }
}
