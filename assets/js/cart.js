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
// MIDTRANS PAYMENT
// ==============================

document.getElementById("pay-button").onclick = async function () {
  try {
    // calculate total cart amount
    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    console.log("Sending amount to backend:", totalAmount);

    // request token from Netlify function
    const response = await fetch("/.netlify/functions/create-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: totalAmount })
    });

    const text = await response.text();
    console.log("Raw response from server:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error("Failed to parse JSON: " + err.message);
    }

    console.log("Parsed token:", data.token);

    if (!data.token) {
      throw new Error("No token received from server");
    }

    // call Midtrans Snap popup
    snap.pay(data.token, {
      onSuccess: function (result) {
        console.log("Payment success:", result);
        window.location.href = "thanksbuyer.html";
      },
      onPending: function (result) {
        console.log("Payment pending:", result);
        window.location.href = "pending.html";
      },
      onError: function (result) {
        console.error("Payment failed:", result);
        window.location.href = "failed.html";
      },
      onClose: function () {
        alert("You closed the payment popup.");
      }
    });
  } catch (err) {
    console.error("Payment error:", err);
    alert("Error: " + err.message);
  }
};

// Initialize on load
updateCartCount();
renderCart();
