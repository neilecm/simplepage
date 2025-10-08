// public/assets/js/controllers/OrderSummaryController.js
import { OrderSummaryModel } from "../models/OrderSummaryModel.js";
import { OrderSummaryView } from "../views/OrderSummaryView.js";

export const OrderSummaryController = {
  init() {
    const cart = OrderSummaryModel.getCart();
    const itemsTotal = OrderSummaryModel.getItemsTotal(cart);
    const shippingCost = OrderSummaryModel.getShippingCost();
    const grandTotal = OrderSummaryModel.getGrandTotal(itemsTotal, shippingCost);

    OrderSummaryView.render(cart, { itemsTotal, shippingCost, grandTotal });
  },
};

// Automatically initialize when page loads
document.addEventListener("DOMContentLoaded", () => OrderSummaryController.init());
