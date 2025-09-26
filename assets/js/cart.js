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
        <span>${item.name}</span> 
        <span>$${item.price.toFixed(2)}</span>
        <div class="qty-controls">
          <button onclick="decreaseQty(${index})">-</button>
          <span>${item.qty}</span>
          <button onclick="increaseQty(${index})">+</button>
        </div>
        <span>= $${(item.price * item.qty).toFixed(2)}</span>
        <button onclick="removeItem(${index})">Remove</button>
      </div>
    `;
  });

  totalEl.textContent = `Total: $${total.toFixed(2)}`;
}

// Add item to cart
function addToCart(name, price) {
  const existing = cart.find(item => item.name === name);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ name, price, qty: 1 });
  }
  saveCart();
}

// Increase quantity
function increaseQty(index) {
  cart[index].qty += 1;
  saveCart();
}

// Decrease quantity
function decreaseQty(index) {
  if (cart[index].qty > 1) {
    cart[index].qty -= 1;
  } else {
    cart.splice(index, 1); // remove item if qty = 0
  }
  saveCart();
}


// Remove one item
function removeItem(index) {
  cart.splice(index, 1);
  saveCart();
}

// Clear all items
function clearCart() {
  cart = [];
  saveCart();
}

// ==============================
// PAYMENT SPINNER (overlay)
// ==============================
const messages = [
  "Brazilian Hard Wax enhances your natural beauty.",
  "Gentle on your skin, tough on unwanted hair.",
  "Feel healthier, smoother, more confident.",
  "Your skin deserves the best care.",
  "Smooth skin, smooth confidence."
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
  }, 3000);
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
    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    if (totalAmount <= 0) {
      alert("Your cart is empty.");
      return;
    }

    showPaymentSpinner();

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

    snap.pay(data.token, {
      onSuccess: function (result) {
        hidePaymentSpinner();
        clearCart(); // clear after success
        window.location.href = "payment-successful.html";
      },
      onPending: function (result) {
        hidePaymentSpinner();
        window.location.href = "pending.html";
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
