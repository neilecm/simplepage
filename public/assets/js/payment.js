// public/assets/js/payment.js
document.addEventListener("DOMContentLoaded", () => {
  const summaryEl = document.getElementById("order-summary");
  const totalEl = document.getElementById("order-total");

  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const shippingCost = Number(localStorage.getItem("shipping_cost")) || 0;

  let itemTotal = 0;
  summaryEl.innerHTML = "";

  cart.forEach((item) => {
    const row = document.createElement("div");
    row.classList.add("summary-item");
    row.innerHTML = `
      <span>${item.name} (x${item.qty})</span>
      <span>Rp ${(item.price * item.qty).toLocaleString("id-ID")}</span>
    `;
    summaryEl.appendChild(row);
    itemTotal += item.price * item.qty;
  });

  const shippingRow = document.createElement("div");
  shippingRow.classList.add("summary-item");
  shippingRow.innerHTML = `
    <span>Shipping</span>
    <span>Rp ${shippingCost.toLocaleString("id-ID")}</span>
  `;
  summaryEl.appendChild(shippingRow);

  const total = itemTotal + shippingCost;
  totalEl.textContent = `Total: Rp ${total.toLocaleString("id-ID")}`;

  // Get Snap token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (!token) {
    document.getElementById("snap-container").innerHTML =
      "<p style='color:red'>Payment token missing. Please return to checkout.</p>";
    return;
  }

  // Load and launch Midtrans Snap payment
  const snapContainer = document.getElementById("snap-container");
  snapContainer.innerHTML = "<p>Opening payment window...</p>";

  const clientKey = document
    .querySelector('script[src*="midtrans"]')
    ?.getAttribute("data-client-key");

  if (typeof window.snap === "undefined") {
    console.error("Midtrans Snap.js not loaded.");
    snapContainer.innerHTML =
      "<p style='color:red'>Payment system unavailable. Please refresh.</p>";
    return;
  }

  // Launch Snap
  window.snap.pay(token, {
    onSuccess: (result) => {
      console.log("Payment Success:", result);
      localStorage.removeItem("cart");
      localStorage.removeItem("shipping_cost"); // ✅ Add this line here
      window.location.href = "success-payment.html";
    },
    onPending: (result) => {
      console.log("Payment Pending:", result);
      window.location.href = "pending-payment.html";
    },
    onError: (result) => {
      console.error("Payment Error:", result);
      window.location.href = "failed-payment.html";
    },
    onClose: () => {
      console.warn("Payment popup closed by user.");
      snapContainer.innerHTML =
        "<p style='color:orange'>Payment was not completed. You may close this tab or retry from Checkout.</p>";
    },
  });
});
