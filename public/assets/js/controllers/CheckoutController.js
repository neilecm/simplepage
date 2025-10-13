import { CheckoutModel } from "../models/CheckoutModel.js";
import { CheckoutView } from "../views/CheckoutView.js";

export const CheckoutController = {
  async init() {
    // Reset stale shipping data upon entering checkout
    localStorage.setItem("shipping_cost", "0");
    localStorage.removeItem("shipping_service");
    localStorage.removeItem("shipping_selection_meta");
    document.dispatchEvent(new Event("shippingUpdated"));

    try {
      const response = await CheckoutModel.fetchProvinces();
      console.log("[CheckoutController] Response:", response);
      CheckoutView.populateSelect("province", response?.data || []);
    } catch (error) {
      console.error("Failed to load provinces:", error);
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
    try {
      const response = await CheckoutModel.fetchCities(provinceId);
      console.log("[CheckoutController] Response:", response);
      CheckoutView.populateSelect("city", response?.data || []);
    } catch (error) {
      console.error("[CheckoutController] Error:", error);
      alert(error.message || "Failed to load cities.");
    }
  },

  async handleCityChange(e) {
    const cityId = e.target.value;
    if (!cityId) return;
    try {
      const response = await CheckoutModel.fetchDistricts(cityId);
      console.log("[CheckoutController] Response:", response);
      CheckoutView.populateSelect("district", response?.data || []);
    } catch (error) {
      console.error("[CheckoutController] Error:", error);
      alert(error.message || "Failed to load districts.");
    }
  },

  async handleDistrictChange(e) {
    const districtId = e.target.value;
    if (!districtId) return;
    try {
      const response = await CheckoutModel.fetchSubdistricts(districtId);
      console.log("[CheckoutController] Response:", response);
      CheckoutView.populateSelect("subdistrict", response?.data || []);
    } catch (error) {
      console.error("[CheckoutController] Error:", error);
      alert(error.message || "Failed to load subdistricts.");
    }
  },

  async handleCourierChange() {
    const courier = document.getElementById("courier")?.value;
    const districtId = document.getElementById("district")?.value;
    if (!courier || !districtId) return;
    try {
      const response = await CheckoutModel.fetchCost(districtId, courier);
      console.log("[CheckoutController] Response:", response);
      const results = Array.isArray(response?.data?.results)
        ? response.data.results
        : Array.isArray(response?.data)
        ? response.data
        : [];
      CheckoutView.showShippingOptions(results);
    } catch (error) {
      console.error("[CheckoutController] Error:", error);
      alert(error.message || "Failed to fetch shipping cost.");
    }
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

    try {
      const response = await CheckoutModel.saveAddress(fields);
      console.log("[CheckoutController] Response:", response);
      if (response && response.data) {
        localStorage.setItem("shipping_cost", fields.shipping_cost);
        localStorage.setItem("address_data", JSON.stringify(fields));
        alert(response.message || "✅ Address saved successfully!");
        window.location.href = "payment.html";
      } else {
        alert("❌ " + (response?.message || "Failed to save address."));
        console.error("[CheckoutController] API error:", response?.details || response);
      }
    } catch (error) {
      console.error("[CheckoutController] Error:", error);
      alert("❌ " + (error.message || "Failed to save address."));
    }
  },
};
