// public/assets/js/payment.js
import { initPayment } from "../../../src/controllers/PaymentController.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initPayment();
  } catch (err) {
    console.error("Payment init failed:", err);
  }
});
