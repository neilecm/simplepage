const button = document.getElementById("continue-to-payment");
if (!button) {
  console.warn("checkout: continue button not found; skipping payment binding");
}

const spinner = document.getElementById("payment-spinner");
const spinnerMessage = document.getElementById("spinner-message");

const SPINNER_MESSAGES = [
  "Preparing your secure Midtrans checkout…",
  "Calculating shipping and taxes…",
  "Locking in the smoothest waxing experience…",
  "Almost done! Summoning the payment popup…",
];
let spinnerInterval = null;
let spinnerIndex = 0;

const summaryState = {
  subtotal: 0,
  shipping: 0,
  total: 0,
};

function readCart() {
  try {
    return JSON.parse(localStorage.getItem("cart") || "null") || [];
  } catch (error) {
    console.warn("checkout: unable to parse cart", error);
    return [];
  }
}

function readAddress() {
  try {
    return JSON.parse(localStorage.getItem("checkout:address") || "null");
  } catch (error) {
    console.warn("checkout: unable to parse saved address", error);
    return null;
  }
}

function readShippingSelection() {
  try {
    return JSON.parse(localStorage.getItem("checkout:shipping") || "null");
  } catch (error) {
    console.warn("checkout: unable to parse saved shipping selection", error);
    return null;
  }
}

function parseCurrency(value) {
  if (typeof value === "number") {
    return value;
  }
  if (!value) {
    return 0;
  }
  const numeric = String(value).replace(/[^0-9]/g, "");
  return Number.parseInt(numeric || "0", 10);
}

function setSummaryState(partial) {
  if (!partial) {
    return;
  }
  if (typeof partial.subtotal === "number") {
    summaryState.subtotal = partial.subtotal;
  }
  if (typeof partial.shipping === "number") {
    summaryState.shipping = partial.shipping;
  }
  if (typeof partial.total === "number") {
    summaryState.total = partial.total;
  }
}

function showSpinner(message) {
  if (!spinner) {
    return;
  }
  spinner.removeAttribute("hidden");
  spinnerIndex = 0;
  if (spinnerMessage) {
    spinnerMessage.textContent = message || SPINNER_MESSAGES[spinnerIndex];
  }
  clearInterval(spinnerInterval);
  spinnerInterval = setInterval(() => {
    spinnerIndex = (spinnerIndex + 1) % SPINNER_MESSAGES.length;
    if (spinnerMessage) {
      spinnerMessage.textContent = SPINNER_MESSAGES[spinnerIndex];
    }
  }, 2800);
}

function hideSpinner() {
  if (!spinner) {
    return;
  }
  clearInterval(spinnerInterval);
  spinner.setAttribute("hidden", "hidden");
}

async function requestSnapToken(total) {
  const response = await fetch("/.netlify/functions/create-transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: total }),
  });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const message = errorPayload.error || "Unable to create Midtrans transaction";
    throw new Error(message);
  }
  return response.json();
}

function ensureSnap() {
  if (!window.snap || typeof window.snap.pay !== "function") {
    throw new Error("Midtrans Snap.js is not loaded");
  }
}

async function handlePaymentClick(event) {
  event.preventDefault();
  const cart = readCart();
  if (!Array.isArray(cart) || cart.length === 0) {
    alert("Your cart is empty. Please add products before checking out.");
    return;
  }

  const selection = readShippingSelection();
  if (!selection || !selection.cost) {
    const confirmProceed = confirm(
      "Shipping cost is not selected yet. Continue without shipping?"
    );
    if (!confirmProceed) {
      return;
    }
  }

  const subtotal = summaryState.subtotal || cart.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    return sum + price * qty;
  }, 0);

  const shipping = selection?.cost ?? summaryState.shipping ?? 0;
  const total = summaryState.total || subtotal + shipping;

  showSpinner();

  try {
    ensureSnap();
    const { token } = await requestSnapToken(total);
    if (!token) {
      throw new Error("Midtrans token was not returned by the server");
    }

    const payload = {
      cart,
      address: readAddress(),
      shipping: selection,
      breakdown: { subtotal, shipping, total },
    };

    window.snap.pay(token, {
      onSuccess: (result) => {
        hideSpinner();
        localStorage.setItem("checkout:last-transaction", JSON.stringify(result));
        localStorage.removeItem("cart");
        window.location.href = "../successful-payment.html";
      },
      onPending: (result) => {
        hideSpinner();
        localStorage.setItem("checkout:last-transaction", JSON.stringify(result));
        window.location.href = "../pending-payment.html";
      },
      onError: (error) => {
        console.error("Midtrans error", error);
        hideSpinner();
        alert("Payment failed. Please try again.");
      },
      onClose: () => {
        hideSpinner();
      },
    }, payload);
  } catch (error) {
    console.error("checkout: unable to initiate payment", error);
    hideSpinner();
    alert(error.message || "Unable to start payment. Please try again.");
  }
}

if (button) {
  button.addEventListener("click", handlePaymentClick);
}

window.addEventListener("checkout:order-summary-updated", (event) => {
  const detail = event?.detail || {};
  setSummaryState({
    subtotal: typeof detail.subtotal === "number" ? detail.subtotal : undefined,
    shipping: typeof detail.shipping === "number" ? detail.shipping : undefined,
    total: typeof detail.total === "number" ? detail.total : undefined,
  });
});

// When the page first loads, try to read totals directly from the DOM
(function bootstrapStateFromDom() {
  const subtotal = document.getElementById("order-subtotal");
  const shipping = document.getElementById("order-shipping");
  const total = document.getElementById("order-total");
  setSummaryState({
    subtotal: parseCurrency(subtotal?.dataset.amount || subtotal?.textContent),
    shipping: parseCurrency(shipping?.dataset.amount || shipping?.textContent),
    total: parseCurrency(total?.dataset.amount || total?.textContent),
  });
})();
