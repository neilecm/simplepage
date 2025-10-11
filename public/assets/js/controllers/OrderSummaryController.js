// public/assets/js/controllers/OrderSummaryController.js
import { OrderSummaryModel } from "../models/OrderSummaryModel.js";
import { OrderSummaryView } from "../views/OrderSummaryView.js";
import { ShippingController } from "./ShippingController.js";

const STORAGE_KEYS_TO_WATCH = new Set([
  "cart",
  "shipping_cost",
  "shipping_service",
  "shipping_selection_meta",
]);

export const OrderSummaryController = {
  init() {
    if (this._initialized) return;

    ShippingController.init();

    this.handleShippingUpdated = () => this.render();
    this.handleStorage = (event) => {
      if (!event || !event.key || STORAGE_KEYS_TO_WATCH.has(event.key)) {
        this.render();
      }
    };

    document.addEventListener("shippingUpdated", this.handleShippingUpdated);
    window.addEventListener("storage", this.handleStorage);

    this.render();
    this._initialized = true;
  },

  render() {
    const cart = OrderSummaryModel.getCart();
    const itemsTotal = OrderSummaryModel.getItemsTotal(cart);
    const shippingCost = OrderSummaryModel.getShippingCost();
    const shippingInfo = OrderSummaryModel.getShippingInfo();
    const grossAmount = OrderSummaryModel.getGrossAmount(itemsTotal, shippingCost);

    OrderSummaryView.render(cart, {
      itemsTotal,
      shippingCost,
      shippingInfo,
      grossAmount,
      gross_amount: grossAmount,
    });
  },
};

// Automatically initialize when page loads
document.addEventListener("DOMContentLoaded", () => OrderSummaryController.init());
