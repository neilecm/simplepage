import { CheckoutModel } from "../models/CheckoutModel.js";
import { CheckoutView } from "../views/CheckoutView.js";

export const CheckoutController = {
  async init() {
    try {
      const provinces = await CheckoutModel.fetchProvinces();
      CheckoutView.populateSelect("province", provinces.data || provinces.rajaongkir?.results || []);
    } catch (err) {
      console.error("Failed to load provinces:", err);
      alert("Cannot load province list. Please refresh.");
    }

    // Event bindings
    document.getElementById("province")?.addEventListener("change", this.handleProvinceChange);
    document.getElementById("city")?.addEventListener("change", this.handleCityChange);
    document.getElementById("district")?.addEventListener("change", this.handleDistrictChange);
    document.getElementById("courier")?.addEventListener("change", this.handleCourierChange);
    document.getElementById("continue-to-payment")?.addEventListener("click", this.saveAndContinue);
  },

  async handleProvinceChange(e) {
    const provinceId = e.target.value;
    if (!provinceId) return;
    const cities = await CheckoutModel.fetchCities(provinceId);
    CheckoutView.populateSelect("city", cities.data || cities.rajaongkir?.results || []);
  },

  async handleCityChange(e) {
    const cityId = e.target.value;
    if (!cityId) return;
    const districts = await CheckoutModel.fetchDistricts(cityId);
    CheckoutView.populateSelect("district", districts.data || districts.rajaongkir?.results || []);
  },

  async handleDistrictChange(e) {
    const districtId = e.target.value;
    if (!districtId) return;
    const subdistricts = await CheckoutModel.fetchSubdistricts(districtId);
    CheckoutView.populateSelect("subdistrict", subdistricts.data || subdistricts.rajaongkir?.results || []);
  },

  async handleCourierChange() {
    const courier = document.getElementById("courier")?.value;
    const districtId = document.getElementById("district")?.value;
    if (!courier || !districtId) return;
    const cost = await CheckoutModel.fetchCost(districtId, courier);
    const results = cost.data?.results || cost.rajaongkir?.results || [];
    CheckoutView.showShippingOptions(results);
  },

  async saveAndContinue() {
    const errorBox = document.getElementById("error-box");
    if (errorBox) errorBox.textContent = "";

    const shippingCost = Number(localStorage.getItem("shipping_cost") || 0);
    if (Number.isNaN(shippingCost) || shippingCost <= 0) {
      const message = "Please select a shipping service before continuing.";
      if (errorBox) {
        errorBox.textContent = message;
      } else {
        alert(message);
      }
      return;
    }

    const fields = {
      full_name: document.getElementById("full_name")?.value.trim(),
      street: document.getElementById("street_address")?.value.trim(),
      province: document.getElementById("province")?.value,
      city: document.getElementById("city")?.value,
      district: document.getElementById("district")?.value,
      subdistrict: document.getElementById("subdistrict")?.value,
      postal_code: document.getElementById("postal_code")?.value.trim(),
      phone: document.getElementById("phone")?.value.trim(),
      courier: document.getElementById("courier")?.value,
      shipping_cost: shippingCost,
    };

    // Validate fields
    const missing = Object.entries(fields)
      .filter(([_, v]) => !v)
      .map(([k]) => k.replace("_", " "));
    if (missing.length) {
      alert("Please fill: " + missing.join(", "));
      return;
    }

    const res = await CheckoutModel.saveAddress(fields);
    if (res.error) {
      console.error("Save address error:", res.error);
      alert("❌ Failed to save address.");
      return;
    }

    localStorage.setItem("shipping_cost", fields.shipping_cost);
    localStorage.setItem("address_data", JSON.stringify(fields));
    alert("✅ Address saved successfully!");
    window.location.href = "payment.html";
  },
};
