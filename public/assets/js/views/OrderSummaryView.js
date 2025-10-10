<<<<<<< HEAD
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
=======
const OrderSummaryView = {
  render({ items = [], subtotal = 0, shippingCost = 0, shippingService = null }) {
    this.renderItems(items);
    this.renderTotals({ subtotal, shippingCost, shippingService });
  },

  renderItems(items) {
    const container = document.getElementById("order-items");
    if (!container) return;

    container.innerHTML = "";
    if (!items.length) {
      container.innerHTML = "<p class=\"empty\">Your cart is empty.</p>";
      return;
    }

    const currency = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    });

    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "order-item";
      row.innerHTML = `
        <span class="order-item__name">${item.name ?? "Item"}</span>
        <span class="order-item__qty">x${item.qty ?? 0}</span>
        <span class="order-item__total">${currency.format(
          Number(item.price ?? 0) * Number(item.qty ?? 0)
        )}</span>
      `;
      fragment.appendChild(row);
    });

    container.appendChild(fragment);
  },

  renderTotals({ subtotal, shippingCost, shippingService }) {
    const subtotalEl = document.getElementById("order-subtotal");
    const shippingEl = document.getElementById("order-shipping");
    const shippingLabelEl = document.getElementById("order-shipping-label");
    const totalEl = document.getElementById("order-total");

    const currency = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    });

    const total = Number(subtotal) + Number(shippingCost || 0);

    if (subtotalEl) subtotalEl.textContent = currency.format(Number(subtotal));
    if (shippingEl) shippingEl.textContent = currency.format(Number(shippingCost || 0));

    if (shippingLabelEl) {
      if (shippingService) {
        const [courier, service] = shippingService.split(":");
        shippingLabelEl.textContent = `${courier?.toUpperCase() ?? ""} ${
          service ?? ""
        }`;
      } else {
        shippingLabelEl.textContent = "Shipping";
      }
    }

    if (totalEl) totalEl.textContent = currency.format(total);
  },
};

export default OrderSummaryView;
>>>>>>> bb1b444 (Implement dynamic RajaOngkir shipping options)
