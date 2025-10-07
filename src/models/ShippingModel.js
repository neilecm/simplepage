// src/models/ShippingModel.js
import { apiFetch } from "../../netlify/functions/api.js";

export async function getProvinces() {
  return apiFetch("shipping", "provinces");
}
export async function getCities(province_id) {
  return apiFetch("shipping", "cities", { province_id });
}
export async function getDistricts(city_id) {
  return apiFetch("shipping", "districts", { city_id });
}
export async function getSubdistricts(district_id) {
  return apiFetch("shipping", "subdistricts", { district_id });
}
export async function getCost(destination, courier) {
  return apiFetch("shipping", "cost", { destination, courier, weight: 1000 });
}
