// public/assets/js/models/OrderSummaryModel.js

export const OrderSummaryModel = {
  // Get cart data from localStorage
  getCart() {
    try {
      return JSON.parse(localStorage.getItem("cart")) || [];
    } catch {
      return [];
    }
  },

  // Calculate total items price
  getItemsTotal(cart) {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  },

  // Get shipping cost (saved earlier on checkout)
  getShippingCost() {
    return Number(localStorage.getItem("shipping_cost")) || 0;
  },

  // Get grand total
  getGrandTotal(itemsTotal, shippingCost) {
    return itemsTotal + shippingCost;
  },
};
