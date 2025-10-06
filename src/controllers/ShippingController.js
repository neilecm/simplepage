// src/controllers/ShippingController.js
import { RajaOngkirModel } from "../models/RajaOngkirModel.js";

function normalize(okJson) {
  // RajaOngkir returns {rajaongkir:{status, results}}. We ensure that shape.
  if (okJson?.rajaongkir?.results !== undefined) return okJson; // already OK
  // If caller provided raw 'results' array, wrap it:
  if (Array.isArray(okJson)) return { rajaongkir: { results: okJson } };
  // If it's cost object (already wrapped by RajaOngkir), just return:
  if (okJson?.rajaongkir) return okJson;
  // Fallback: wrap whole response into results
  return { rajaongkir: { results: okJson ?? [] } };
}

export class ShippingController {
  static async getProvinces() {
    const data = await RajaOngkirModel.provinces();
    return normalize(data);
  }

  static async getCities({ province_id } = {}) {
    const data = await RajaOngkirModel.cities(province_id);
    return normalize(data);
  }

  static async getSubdistricts({ city_id }) {
    const data = await RajaOngkirModel.subdistricts(city_id);
    return normalize(data);
  }

  static async getCost({ origin, destination, weight, courier, originType, destinationType }) {
    const data = await RajaOngkirModel.cost({
      origin,
      destination,
      weight,
      courier,
      originType,
      destinationType,
    });
    // RajaOngkir cost already in correct outer shape; still run through normalize
    return normalize(data);
  }
}
