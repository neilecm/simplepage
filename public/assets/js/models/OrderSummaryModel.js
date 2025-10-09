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
      return shipping ? parseInt(shipping) : 0;
    } catch (error) {
      console.error("OrderSummaryModel.getShippingCost error:", error);
      return 0;
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
