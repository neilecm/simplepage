// public/assets/js/models/CheckoutModel.js
export const CheckoutModel = {
  async fetchProvinces() {
    return await apiFetch("shipping", "provinces");
  },
  async fetchCities(provinceId) {
    return await apiFetch("shipping", "cities", { province_id: provinceId });
  },
  async fetchDistricts(cityId) {
    return await apiFetch("shipping", "districts", { city_id: cityId });
  },
  async fetchSubdistricts(districtId) {
    return await apiFetch("shipping", "subdistricts", { district_id: districtId });
  },
  async fetchCost(destinationId, courier, weight = 1000) {
    return await apiFetch("shipping", "cost", {
      destination: destinationId,
      courier,
      weight,
    });
  },
  async saveAddress(data) {
    return await apiFetch("auth", "saveAddress", data);
  },
};

async function apiFetch(action, method, body = {}) {
  const res = await fetch(`/.netlify/functions/api?action=${action}&method=${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}
