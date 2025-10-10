import OrderSummaryView from "../views/OrderSummaryView.js";

const OrderSummaryController = (() => {
  const state = {
    items: [],
    subtotal: 0,
    shippingCost: 0,
    shippingService: null,
  };

  const init = () => {
    document.addEventListener("shippingUpdated", render);
    document.addEventListener("storage", (event) => {
      if (event.key === "cart" || event.key === "shipping_cost" || event.key === "shipping_service") {
        render();
      }
    });
    render();
  };

  const readCart = () => {
    try {
      const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
      state.items = Array.isArray(storedCart) ? storedCart : [];
    } catch (error) {
      console.warn("OrderSummaryController: Unable to parse cart from storage.", error);
      state.items = [];
    }
  };

  const computeSubtotal = () => {
    state.subtotal = state.items.reduce((sum, item) => {
      const price = Number(item?.price ?? 0);
      const qty = Number(item?.qty ?? 0);
      return sum + price * qty;
    }, 0);
  };

  const readShipping = () => {
    const cost = Number(localStorage.getItem("shipping_cost"));
    state.shippingCost = Number.isFinite(cost) ? cost : 0;
    state.shippingService = localStorage.getItem("shipping_service");
  };

  const render = () => {
    readCart();
    computeSubtotal();
    readShipping();

    OrderSummaryView.render({
      items: state.items,
      subtotal: state.subtotal,
      shippingCost: state.shippingCost,
      shippingService: state.shippingService,
    });
  };

  return {
    init,
    render,
  };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => OrderSummaryController.init());
} else {
  OrderSummaryController.init();
}

export default OrderSummaryController;
