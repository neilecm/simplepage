// public/assets/js/views/OrderSummaryView.js

export const OrderSummaryView = {
  render(cart, totals = {}) {
    const summaryEl = document.getElementById("order-summary");
    if (!summaryEl) return;

    // 💰 Safe number formatting
    const formatIDR = (num) => `Rp ${Number(num || 0).toLocaleString("id-ID")}`;

    // 🧾 Render each item line
    const itemsHTML = cart
      .map(
        (item) => `
          <div class="summary-item">
            <span>${item.name} × ${item.qty}</span>
            <span>${formatIDR(item.price * item.qty)}</span>
          </div>`
      )
      .join("");

    // 🧩 Build the full summary, including Items Total and Shipping
    summaryEl.innerHTML = `
      ${itemsHTML || "<p>Your cart is empty.</p>"}
      <hr />
      <div class="summary-item" id="item-total-line">
        <strong>Items Total</strong>
        <span id="item-total">${formatIDR(totals.itemsTotal ?? 0)}</span>
      </div>
      <div class="summary-item" id="shipping-total-line">
        <strong>Shipping</strong>
        <span id="shipping-total">${formatIDR(
          totals.shippingCost ?? totals.shipping_cost ?? 0
        )}</span>
      </div>
    `;

    // 🧮 Update or create the grand total element
    const totalEl =
      document.getElementById("order-total") ||
      (() => {
        const el = document.createElement("div");
        el.id = "order-total";
        el.classList.add("summary-total");
        summaryEl.appendChild(el);
        return el;
      })();

    totalEl.innerHTML = `<strong>Total: ${formatIDR(
      totals.grossAmount ??
        totals.total_cost ??
        totals.grandTotal ??
        (totals.itemsTotal || 0) +
          (totals.shippingCost || totals.shipping_cost || 0)
    )}</strong>`;
  },
};
