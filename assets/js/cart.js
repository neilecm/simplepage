// Initialize cart from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Add item to cart
function addToCart(name, price) {
  // see if item already exists
  const existing = cart.find(item => item.name === name);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: name.replace(/\s+/g, "-").toLowerCase(), name, price, qty: 1 });
  }

  saveCart();
  renderCart();
  alert(`${name} added to cart!`);
}

// Expose globally for inline onclick usage
window.addToCart = addToCart;


// Update cart count in header
function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartCountEl = document.getElementById("cart-count");
  if (cartCountEl) cartCountEl.textContent = count;
}

// Save cart to localStorage
function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
}

// Render cart items
function renderCart() {
  const cartItemsContainer = document.getElementById("cart-items");
  const cartTotalEl = document.getElementById("cart-total");

  if (!cartItemsContainer || !cartTotalEl) return;

  cartItemsContainer.innerHTML = "";

  let total = 0;
  cart.forEach((item, index) => {
    const subtotal = item.price * item.qty;
    total += subtotal;

    const div = document.createElement("div");
    div.classList.add("cart-item");
    div.innerHTML = `
      <span>${item.name} - Rp ${item.price.toLocaleString("id-ID")} x ${item.qty}</span>
      <button onclick="changeQty(${index}, -1)">-</button>
      <button onclick="changeQty(${index}, 1)">+</button>
      <button onclick="removeItem(${index})">Remove</button>
    `;
    cartItemsContainer.appendChild(div);
  });

  cartTotalEl.textContent = `Total: Rp ${total.toLocaleString("id-ID")}`;
}

// Change item quantity
function changeQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  saveCart();
  renderCart();
}

// Remove item
function removeItem(index) {
  cart.splice(index, 1);
  saveCart();
  renderCart();
}

// Clear the cart completely
function clearCart() {
  cart = [];
  saveCart();
  renderCart();
  alert("🛒 Cart cleared!");
}

// Expose for inline usage (cart.html)
window.clearCart = clearCart;

// Attach to #clear-cart button (products.html)
document.addEventListener("DOMContentLoaded", () => {
  const clearBtn = document.getElementById("clear-cart");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearCart);
  }
});

// ==========================
// Checkout / Midtrans logic
// ==========================
async function checkout() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const address = JSON.parse(localStorage.getItem("address") || "null");

  if (!user) {
    alert("⚠️ Please login first.");
    window.location.href = "login.html";
    return;
  }

  if (!address) {
    alert("⚠️ Please provide a delivery address first.");
    window.location.href = "checkout.html";
    return;
  }

  const amount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const payload = {
    amount,
    cart,
    customer: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || address.phone,
      address: address.street,
      city: address.city,
      province: address.province,
      postal: address.postal_code,
      shippingCost: 20000 // Rp 20,000 shipping fee for test purposes, later change to dynamic price when integrating with RajaOngkir API
      
    },
  };

  console.log("📦 Checkout payload:", payload);

  try {
    // Show spinner
    document.getElementById("spinner").style.display = "block";

    const res = await fetch("/.netlify/functions/create-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("✅ Midtrans response:", data);

    // Hide spinner
    document.getElementById("spinner").style.display = "none";

    if (res.ok && data.token) {
      window.snap.pay(data.token, {
        onSuccess: function (result) {
          console.log("Payment success:", result);
          window.location.href = "payment-successful.html";
        },
        onPending: function (result) {
          console.log("Payment pending:", result);
          window.location.href = "pending.html";
        },
        onError: function (result) {
          console.error("Payment error:", result);
          window.location.href = "failed-payment.html";
        },
      });
    } else {
      alert("❌ Transaction failed: " + (data.error || "Unknown error"));
    }
  } catch (err) {
    console.error("🔥 Checkout error:", err);
    alert("❌ Checkout error: " + err.message);
    // Always hide spinner if something goes wrong
    document.getElementById("spinner").style.display = "none";
  }
}

// ==========================
// Initialize page
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  renderCart();

  const checkoutBtn = document.getElementById("checkout-button");
  if (checkoutBtn) checkoutBtn.addEventListener("click", checkout);
});
