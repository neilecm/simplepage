const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

const itemsContainer = document.getElementById("order-summary-items");
const subtotalEl = document.getElementById("order-subtotal");
const shippingEl = document.getElementById("order-shipping");
const totalEl = document.getElementById("order-total");

const STORAGE_KEY = "checkout:shipping";

function readCart() {
  try {
    return JSON.parse(localStorage.getItem("cart") || "null") || [];
  } catch (error) {
    console.warn("order-summary: failed to parse cart", error);
    return [];
  }
}

function readSavedShipping() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch (error) {
    console.warn("order-summary: failed to parse saved shipping", error);
    return null;
  }
}

function persistShipping(selection) {
  if (!selection) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch (error) {
    console.warn("order-summary: failed to save shipping selection", error);
  }
}

function formatCurrency(amount) {
  return formatter.format(Math.max(0, Number(amount) || 0));
}

function renderCartItems() {
  if (!itemsContainer) {
    return 0;
  }
  const cart = readCart();
  if (!Array.isArray(cart) || cart.length === 0) {
    itemsContainer.innerHTML = "<p>Your cart is currently empty.</p>";
    const cartCount = document.querySelector("#cart-count");
    if (cartCount) {
      cartCount.textContent = "0";
    }
    return 0;
  }

  const fragments = [];
  let subtotal = 0;
  let itemCount = 0;
  cart.forEach((item) => {
    const quantity = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const lineTotal = quantity * price;
    subtotal += lineTotal;
     itemCount += quantity;
    fragments.push(`
      <div class="summary-item">
        <div>
          <strong>${item.name || "Product"}</strong>
          <div class="summary-meta">Qty: ${quantity}</div>
        </div>
        <div>${formatCurrency(lineTotal)}</div>
      </div>
    `);
  });

  itemsContainer.innerHTML = fragments.join("");
  const cartCount = document.querySelector("#cart-count");
  if (cartCount) {
    cartCount.textContent = String(itemCount);
  }
  return subtotal;
}

function setAmount(element, amount) {
  if (!element) {
    return;
  }
  const numeric = Math.max(0, Number(amount) || 0);
  element.textContent = formatCurrency(numeric);
  element.dataset.amount = String(numeric);
}

function updateSummary({ subtotal, shipping }) {
  const total = Math.max(0, (subtotal || 0) + (shipping || 0));
  setAmount(subtotalEl, subtotal);
  setAmount(shippingEl, shipping);
  setAmount(totalEl, total);
  window.dispatchEvent(
    new CustomEvent("checkout:order-summary-updated", {
      detail: { subtotal, shipping, total },
    })
  );
}

function applyShippingSelection(selection, subtotal) {
  if (!selection) {
    updateSummary({ subtotal, shipping: 0 });
    return;
  }
  const shippingCost = Number(selection.cost) || 0;
  if (shippingEl) {
    shippingEl.textContent = `${formatCurrency(shippingCost)}${
      selection.etd ? ` (ETD ${selection.etd})` : ""
    }`;
    shippingEl.dataset.amount = String(shippingCost);
  }
  updateSummary({ subtotal, shipping: shippingCost });
}

function initializeSummary() {
  const subtotal = renderCartItems();
  const selection = readSavedShipping();
  if (selection && shippingEl) {
    shippingEl.textContent = `${formatCurrency(Number(selection.cost) || 0)}${
      selection.etd ? ` (ETD ${selection.etd})` : ""
    }`;
    shippingEl.dataset.amount = String(Number(selection.cost) || 0);
  }
  updateSummary({
    subtotal,
    shipping: Number(selection?.cost) || 0,
  });
}

window.addEventListener("checkout:shipping-selected", (event) => {
  const detail = event?.detail;
  if (!detail) {
    return;
  }
  persistShipping(detail);
  const subtotal = Number(subtotalEl?.dataset.amount) || renderCartItems();
  applyShippingSelection(detail, subtotal);
});

initializeSummary();
