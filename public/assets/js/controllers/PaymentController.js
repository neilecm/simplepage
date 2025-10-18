import { PaymentModel } from "../models/PaymentModel.js";
import { OrderSummaryModel } from "../models/OrderSummaryModel.js";
import { PaymentView } from "../views/PaymentView.js";

export const PaymentController = {
  async init() {
    try {
      PaymentView.showLoading();

      // ✅ Fetch totals directly from OrderSummaryModel
      const cart = OrderSummaryModel.getCart();
      const itemsTotal = OrderSummaryModel.getItemsTotal(cart);
      const shippingCost = OrderSummaryModel.getShippingCost();
      const total_cost = OrderSummaryModel.getGrossAmount(itemsTotal, shippingCost);

      // Update frontend total display
      PaymentView.renderOrderTotal(total_cost);

      // One-order-per-checkout: reuse or create a persistent order_id
      const getOrCreateOrderId = () => {
        const K = 'current_order_id';
        let id = localStorage.getItem(K);
        if (!id) {
          id = `ORDER-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
          localStorage.setItem(K, id);
        }
        return id;
      };

      // Prevent double token requests across inits
      if (window.__paymentInitFired) return;
      window.__paymentInitFired = true;

      const orderId = getOrCreateOrderId();

      // Reuse cached token for this order if available
      const tkKey = `snap_token_for_${orderId}`;
      let token = sessionStorage.getItem(tkKey);
      if (!token) {
        const res = await PaymentModel.createTransaction({ orderId, amount: total_cost });
        token = res?.token;
        if (token) sessionStorage.setItem(tkKey, token);
      }

      // Show processing status
      PaymentView.showStatus("Processing payment...", "info");

      // ✅ Launch Snap payment popup
      // prevent double initialization
if (!window.snapInitiated) {
  window.snapInitiated = true;
  setTimeout(() => {
    window.snap.pay(token, {
      onSuccess: (result) => {
        console.log("✅ Payment success:", result);
        PaymentView.showSuccess();
      },
      onPending: (result) => {
        console.log("⏳ Payment pending:", result);
        PaymentView.showPending();
      },
      onError: (err) => {
        console.error("❌ Payment error:", err);
        PaymentView.showError();
      },
      onClose: () => {
        console.log("💤 Payment closed.");
        PaymentView.showClosed();
        window.snapInitiated = false;
      }
    });
  }, 500);
}
;
    } catch (error) {
      console.error("PaymentController.init error:", error);
      PaymentView.showStatus(error.message, "error");
    }
  }
};

// Auto-run when payment page loads
document.addEventListener("DOMContentLoaded", () => {
  PaymentController.init();
});
