// src/controllers/PaymentController.js
import * as PaymentModel from "../models/PaymentModel.js";

/**
 * Initialize Payment Page
 */
export async function initPayment() {
  const addressData = JSON.parse(localStorage.getItem("address_data") || "{}");
  const shippingCost = Number(localStorage.getItem("shipping_cost") || 0);
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");

  if (!cart.length) {
    alert("Your cart is empty. Please return to checkout.");
    window.location.href = "checkout.html";
    return;
  }

  // Display order summary
  renderOrderSummary(cart, shippingCost);

  // Total calculation
  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalAmount = itemsTotal + shippingCost;

  try {
    const tokenData = await PaymentModel.createTransaction({
      total_amount: totalAmount,
      customer_name: addressData.full_name || "Guest",
      cart_items: cart.map((item) => ({
        id: item.id,
        price: item.price,
        quantity: item.qty,
        name: item.name,
      })),
    });

    if (!tokenData?.token) throw new Error("Failed to get payment token");

    console.log("✅ Snap token received:", tokenData.token);

    // Initialize Midtrans Snap
    const snapContainer = document.getElementById("snap-container");
    snapContainer.innerHTML = `<p>Processing payment...</p>`;
    snap.pay(tokenData.token, {
      onSuccess: () => handleResult("successful-payment.html"),
      onPending: () => handleResult("pending-payment.html"),
      onError: () => handleResult("failed-payment.html"),
      onClose: () => alert("Payment cancelled."),
    });
  } catch (err) {
    console.error("Payment init error:", err);
    alert("Failed to initialize payment.");
  }
}

/**
 * Create a Midtrans transaction token (used by Netlify create-transaction.js)
 */
export async function createTransaction(body) {
  const { total_amount, customer_name, cart_items } = body;
  if (!total_amount) throw new Error("Missing total_amount");

  return await PaymentModel.createTransaction({
    amount: total_amount,
    name: customer_name,
    items: cart_items,
  });
}

/**
 * Optional: handle callback notifications from Midtrans (via payment-callback.js)
 */
export async function handleCallback(body) {
  console.log("🔔 Midtrans callback received:", body);
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*                                 HELPERS                                    */
/* -------------------------------------------------------------------------- */
function handleResult(path) {
  localStorage.removeItem("cart");
  localStorage.removeItem("shipping_cost");
  window.location.href = path;
}

function renderOrderSummary(cart, shippingCost) {
  const summary = document.getElementById("order-summary");
  const total = document.getElementById("order-total");

  summary.innerHTML = cart
    .map(
      (item) => `
      <div class="summary-item">
        <span>${item.name} × ${item.qty}</span>
        <span>Rp ${(item.price * item.qty).toLocaleString("id-ID")}</span>
      </div>`
    )
    .join("");

  summary.innerHTML += `
    <div class="summary-item">
      <span>Shipping</span>
      <span>Rp ${shippingCost.toLocaleString("id-ID")}</span>
    </div>
  `;

  const totalAmount = cart.reduce((sum, i) => sum + i.price * i.qty, 0) + shippingCost;
  total.textContent = `Total: Rp ${totalAmount.toLocaleString("id-ID")}`;
}

/* -------------------------------------------------------------------------- */
/*                                EXPORT FIX                                 */
/* -------------------------------------------------------------------------- */
export const PaymentController = {
  initPayment,
  createTransaction,
  handleCallback,
};
