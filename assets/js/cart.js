// ==============================
// CART LOGIC
// ==============================

// Load cart from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Save cart
function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  renderCart();
}

// Update cart count in navbar
function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartCount = document.querySelector("#cart-count");
  if (cartCount) cartCount.textContent = count;
}

// Render cart items
function renderCart() {
  const container = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  if (!container || !totalEl) return;

  container.innerHTML = "";
  let total = 0;

  cart.forEach((item, index) => {
    total += item.price * item.qty;
    container.innerHTML += `
      <div class="cart-item">
        ${item.name} - $${item.price.toFixed(2)} × ${item.qty} = $${(item.price * item.qty).toFixed(2)}
        <button onclick="removeItem(${index})">Remove</button>
      </div>
    `;
  });

  totalEl.textContent = `Total: $${total.toFixed(2)}`;
}

// Remove item
function removeItem(index) {
  cart.splice(index, 1);
  saveCart();
}

// ==============================
// PAYMENT SPINNER (overlay)
// ==============================
const messages = [
  "Brazilian Hard Wax enhances your natural beauty.",
  "Gentle on your skin, tough on unwanted hair.",
  "Feel healthier, smoother, more confident."
];
let msgIndex = 0;
let msgInterval;

function showPaymentSpinner() {
  const overlay = document.getElementById("payment-spinner");
  const msgEl = document.getElementById("spinner-message");
  overlay.style.display = "block";
  msgEl.innerText = messages[msgIndex];
  msgInterval = setInterval(() => {
    msgIndex = (msgIndex + 1) % messages.length;
    msgEl.innerText = messages[msgIndex];
  }, 3000); // rotate message every 3s
}

function hidePaymentSpinner() {
  document.getElementById("payment-spinner").style.display = "none";
  clearInterval(msgInterval);
}

// ==============================
// MIDTRANS PAYMENT
// ==============================
document.getElementById("pay-button").onclick = async function () {
  try {
    // calculate total cart amount
    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    // show spinner overlay
    showPaymentSpinner();

    // request token from Netlify function
    let response = await fetch("/.netlify/functions/create-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: totalAmount })
    });

    let data = await response.json();

    // retry once if no token
    if (!data.token) {
      console.warn("No token on first try, retrying...");
      await new Promise(r => setTimeout(r, 500));
      response = await fetch("/.netlify/functions/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalAmount })
      });
      data = await response.json();
    }

    if (!data.token) throw new Error("No token received from server");

    // call Midtrans Snap popup
    snap.pay(data.token, {
      onSuccess: function (result) {
        hidePaymentSpinner();
        window.location.href = "successful-payment.html";
      },
      onPending: function (result) {
        hidePaymentSpinner();
        window.location.href = "pending-payment.html";
      },
      onError: function (result) {
        hidePaymentSpinner();
        window.location.href = "failed-payment.html";
      },
      onClose: function () {
        hidePaymentSpinner();
        alert("You closed the payment popup.");
      }
    });
  } catch (err) {
    hidePaymentSpinner();
    console.error("Payment error:", err);
    alert("Error: " + err.message);
  }
};

// ==============================
// INITIALIZE ON LOAD
// ==============================
updateCartCount();
renderCart();
