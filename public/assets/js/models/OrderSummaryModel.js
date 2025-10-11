export const OrderSummaryModel = {
  // 🧩 Get cart items from localStorage
  getCart() {
    try {
      return JSON.parse(localStorage.getItem("cart")) || [];
    } catch (error) {
      console.error("OrderSummaryModel.getCart error:", error);
      return [];
    }
  },

  // ⚖️ Total cart weight in grams (fallback handled by caller)
  getCartWeight(cart) {
    try {
      const items = Array.isArray(cart) ? cart : this.getCart();
      const total = items.reduce((sum, item) => {
        const weight = Number(item?.weight);
        const qty = Number(item?.qty) || 0;
        if (!Number.isFinite(weight) || weight <= 0) return sum;
        return sum + weight * qty;
      }, 0);
      return total > 0 ? Math.round(total) : 0;
    } catch (error) {
      console.error("OrderSummaryModel.getCartWeight error:", error);
      return 0;
    }
  },

  // 🧩 Calculate total of all items in the cart
  getItemsTotal(cart) {
    try {
      return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    } catch (error) {
      console.error("OrderSummaryModel.getItemsTotal error:", error);
      return 0;
    }
  },

  // 🧩 Retrieve saved shipping cost
  getShippingCost() {
    try {
      const shipping = localStorage.getItem("shipping_cost");
      const cost = Number(shipping);
      return Number.isFinite(cost) ? cost : 0;
    } catch (error) {
      console.error("OrderSummaryModel.getShippingCost error:", error);
      return 0;
    }
  },

  // 🔍 Retrieve metadata about the selected shipping service
  getShippingInfo() {
    try {
      const key = localStorage.getItem("shipping_service");
      if (!key) return null;

      const [courierRaw = "", serviceRaw = ""] = key.split(":");
      const metaRaw = localStorage.getItem("shipping_selection_meta");
      let meta;

      if (metaRaw) {
        try {
          meta = JSON.parse(metaRaw);
        } catch (parseError) {
          console.warn("OrderSummaryModel.getShippingInfo parse error:", parseError);
        }
      }

      const courierCode = (meta?.courier || courierRaw || "").toLowerCase();
      const serviceCode = (meta?.service || serviceRaw || "").toUpperCase();
      const courierName =
        meta?.courierName ||
        (courierCode ? courierCode.toUpperCase() : courierRaw.toUpperCase()) ||
        "Shipping";
      const description = meta?.description || "";
      const etd = meta?.etd || "";
      const label =
        meta?.label ||
        [courierName, serviceCode].filter(Boolean).join(" ").trim() ||
        "Shipping";
      const costFromMeta = Number(meta?.cost);
      const cost = Number.isFinite(costFromMeta) ? costFromMeta : this.getShippingCost();

      return {
        courier: courierCode,
        courierName,
        service: serviceCode,
        description,
        etd,
        label,
        cost,
      };
    } catch (error) {
      console.error("OrderSummaryModel.getShippingInfo error:", error);
      return null;
    }
  },

  // ✅ Replace grandTotal with gross_amount
  getGrossAmount(itemsTotal, shippingCost) {
    try {
      const gross_amount = itemsTotal + shippingCost;
      return gross_amount;
    } catch (error) {
      console.error("OrderSummaryModel.getGrossAmount error:", error);
      return 0;
    }
  }
};
