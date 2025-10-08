// public/assets/js/views/OrderSummaryView.js

export const OrderSummaryView = {
  render(cart, totals) {
    const summaryEl = document.getElementById("order-summary");
    if (!summaryEl) return;

    // Render list of items
    const itemsHTML = cart
      .map(
        (item) => `
        <div class="summary-item">
          <span>${item.name} × ${item.qty}</span>
          <span>Rp ${(item.price * item.qty).toLocaleString("id-ID")}</span>
        </div>`
      )
      .join("");

    summaryEl.innerHTML = `
      ${itemsHTML || "<p>Your cart is empty.</p>"}
      <hr />
      <div class="summary-item"><strong>Items Total</strong><span>Rp ${totals.itemsTotal.toLocaleString("id-ID")}</span></div>
      <div class="summary-item"><strong>Shipping</strong><span>Rp ${totals.shippingCost.toLocaleString("id-ID")}</span></div>
    `;

    // Update grand total if element exists
    const totalEl = document.getElementById("order-total");
    if (totalEl) {
      totalEl.innerHTML = `<strong>Total: Rp ${totals.grandTotal.toLocaleString("id-ID")}</strong>`;
    }
  },
};
