// src/controllers/ShippingController.js
import { RajaOngkirModel } from "../models/RajaOngkirModel.js";

function normalize(json) {
  if (json?.rajaongkir?.results !== undefined) return json;
  return { rajaongkir: { results: json ?? [] } };
}

export class ShippingController {
  // 🔹 Provinces
  static async getProvinces() {
    return normalize(await RajaOngkirModel.provinces());
  }

  // 🔹 Cities (by province_id)
  static async getCities({ province_id }) {
    if (!province_id) throw new Error("Missing province_id");
    return normalize(await RajaOngkirModel.cities(province_id));
  }

  // 🔹 Districts (by city_id)
  static async getDistricts({ city_id }) {
    if (!city_id) throw new Error("Missing city_id");
    return normalize(await RajaOngkirModel.districts(city_id));
  }

  // 🔹 Subdistricts (by district_id)
  static async getSubdistricts({ district_id }) {
    if (!district_id) throw new Error("Missing district_id");
    return normalize(await RajaOngkirModel.subdistricts(district_id));
  }

  // 🔹 Shipping cost (district-level, domestic)
  static async getCost({
    origin,
    destination,
    courier,
    weight = 1000,
    price = "lowest",
  }) {
    const originDistrict =
      origin || process.env.RO_ORIGIN_DISTRICT_ID || "1391"; // fallback
    const destDistrict = destination;
    if (!destDistrict) throw new Error("Missing destination district_id");

    const data = await RajaOngkirModel.domesticCost({
      origin: originDistrict,
      destination: destDistrict,
      courier,
      weight,
      price,
    });

    return normalize(data);
  }
}
