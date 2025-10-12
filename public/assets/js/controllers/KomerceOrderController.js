// public/assets/js/controllers/KomerceOrderController.js
import { KomerceOrderModel } from "../models/KomerceOrderModel.js";
import { OrderSummaryModel } from "../models/OrderSummaryModel.js";

export const KomerceOrderController = {
  /**
   * Trigger Komerce pickup + label generation workflow.
   */
  async init() {
    this.statusEl = document.getElementById("komerce-status");
    this.buttonEl = document.getElementById("komerce-download-label");

    if (!this.statusEl || !this.buttonEl) {
      console.warn("[KomerceOrderController] Status/button elements not found. Skipping.");
      return;
    }

    try {
      this.setStatus("Scheduling Komerce pickup…");

      const payload = this.buildPickupPayload();
      if (!payload) {
        this.setStatus("Missing order details for pickup.", "error");
        return;
      }

      console.log("[KomerceOrderController] Pickup payload:", payload);
      const pickup = await KomerceOrderModel.requestPickup(payload);
      console.log("[KomerceOrderController] Pickup response:", pickup);

      if (!pickup?.awb) {
        throw new Error("Pickup succeeded but no AWB received.");
      }

      this.setStatus("Pickup scheduled. Generating label…");

      const label = await KomerceOrderModel.generateLabel({
        order_no: pickup.awb,
        page: "A6",
      });

      console.log("[KomerceOrderController] Label response:", label);

      if (label?.label_url) {
        this.buttonEl.dataset.href = label.label_url;
        this.buttonEl.style.display = "inline-flex";
        this.buttonEl.addEventListener("click", this.handleDownloadClick);
        this.setStatus("Pickup confirmed. Download your Komerce label below.", "success");
      } else {
        this.setStatus("Pickup confirmed, but label not available.", "warning");
      }
    } catch (error) {
      console.error("[KomerceOrderController] error:", error);
      this.setStatus(error.message || "Failed to complete Komerce flow.", "error");
    }
  },

  /**
   * Build payload for Komerce pickup using localStorage data.
   */
  buildPickupPayload() {
    try {
      const address = JSON.parse(localStorage.getItem("address_data") || "{}");
      const shippingMeta = JSON.parse(
        localStorage.getItem("shipping_selection_meta") || "{}"
      );
      const cart = OrderSummaryModel.getCart();
      const totalWeight = OrderSummaryModel.getCartWeight(cart) || 1000;

      if (!address?.district || !address?.full_name) {
        return null;
      }

      const now = new Date();
      const pickupDate = now.toISOString().split("T")[0];
      const orderNo =
        localStorage.getItem("komerce_order_no") ||
        `CB-${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}-${now.getTime()}`;

      localStorage.setItem("komerce_order_no", orderNo);

      return {
        date: pickupDate,
        time: "09:00-12:00",
        vehicle: "car",
        orders: [
          {
            order_no: orderNo,
            courier: shippingMeta?.courier || "komerce",
            service: shippingMeta?.service || "REG",
            weight: totalWeight,
            receiver_name: address.full_name,
            receiver_phone: address.phone,
            receiver_address: address.street,
            receiver_subdistrict: address.subdistrict,
            receiver_district: address.district,
            receiver_city: address.city,
            receiver_province: address.province,
            receiver_postal_code: address.postal_code,
          },
        ],
      };
    } catch (error) {
      console.error("[KomerceOrderController.buildPickupPayload]", error);
      return null;
    }
  },

  handleDownloadClick(event) {
    event.preventDefault();
    const url = event.currentTarget.dataset.href;
    if (!url) return;
    window.open(url, "_blank", "noopener");
  },

  setStatus(message, type = "info") {
    if (!this.statusEl) return;
    const colors = {
      info: "#555",
      success: "#047857",
      warning: "#b45309",
      error: "#dc2626",
    };
    this.statusEl.textContent = message;
    this.statusEl.style.color = colors[type] || colors.info;
  },
};

// Allow inline script initialization if needed.
window.KomerceOrderController = KomerceOrderController;

// TODO: Extend controller with Komerce tracking updates after label generation.
