// public/assets/js/views/CheckoutView.js
export const CheckoutView = {
  populateSelect(selectId, items, textKey = "name", valueKey = "id") {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = `<option value="">-- Select --</option>`;
    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item[valueKey];
      opt.textContent = item[textKey];
      opt.dataset.id = item[valueKey];
      select.appendChild(opt);
    });
  },

  showShippingOptions(options) {
    const container = document.getElementById("shipping-options");
    if (!container) return;
    if (!options.length) {
      container.innerHTML = "<p>No shipping options found.</p>";
      return;
    }
    container.innerHTML = options
      .map(
        (opt) => `
          <label>
            <input type="radio" name="shipping" value="${opt.cost}">
            ${opt.name} - ${opt.service} (${opt.description}) — 
            Rp ${opt.cost.toLocaleString("id-ID")}
          </label>`
      )
      .join("<br>");
  },

  updateOrderSummary(cart, shippingCost = 0) {
    const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    document.getElementById("item-total").textContent = `Items: Rp ${itemsTotal.toLocaleString("id-ID")}`;
    document.getElementById("shipping-total").textContent = `Shipping: Rp ${shippingCost.toLocaleString("id-ID")}`;
    document.getElementById("order-total").textContent = `Total: Rp ${(itemsTotal + shippingCost).toLocaleString("id-ID")}`;
  },
};
