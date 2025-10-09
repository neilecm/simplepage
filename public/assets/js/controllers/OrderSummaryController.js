// public/assets/js/controllers/OrderSummaryController.js
import { OrderSummaryModel } from "../models/OrderSummaryModel.js";
import { OrderSummaryView } from "../views/OrderSummaryView.js";

export const OrderSummaryController = {
  init() {
    const cart = OrderSummaryModel.getCart();
    const itemsTotal = OrderSummaryModel.getItemsTotal(cart);
    const shippingCost = OrderSummaryModel.getShippingCost();
    const gross_amount = OrderSummaryModel.getGrossAmount(itemsTotal, shippingCost);
    

    OrderSummaryView.render(cart, { itemsTotal, shippingCost, gross_amount });
  },
};



// Automatically initialize when page loads
document.addEventListener("DOMContentLoaded", () => OrderSummaryController.init());
