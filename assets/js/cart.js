// ==============================
// CART INITIALIZATION
// ==============================
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// ==============================
// UPDATE CART COUNT IN HEADER
// ==============================
function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartCount = document.getElementById("cart-count");
  if (cartCount) {
    cartCount.textContent = count;
  }
}

// Run once on page load
updateCartCount();

// ==============================
// ADD TO CART (PRODUCTS PAGE)
// ==============================
document.querySelectorAll(".add-to-cart")?.forEach(button => {
  button.addEventListener("click", e => {
    e.preventDefault();
    const name = button.dataset.name;
    const price = parseFloat(button.dataset.price);

    const item = cart.find(p => p.name === name);
    if (item) {
      item.qty += 1;
    } else {
      cart.push({ name, price, qty: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount(); // refresh cart count
    alert(`${name} added to cart!`);
  });
});

// ==============================
// RENDER CART (CART PAGE)
// ==============================
const cartItemsContainer = document.getElementById("cart-items");
if (cartItemsContainer) {
  renderCart();
}

function renderCart() {
  cartItemsContainer.innerHTML = "";
  let total = 0;

  cart.forEach(item => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;

    const div = document.createElement("div");
    div.classList.add("cart-item");
    div.innerHTML = `
      <p><strong>${item.name}</strong> - $${item.price.toFixed(2)} x ${item.qty} = $${itemTotal.toFixed(2)}</p>
      <div class="cart-controls">
        <button class="decrease" data-name="${item.name}">-</button>
        <span class="qty">${item.qty}</span>
        <button class="increase" data-name="${item.name}">+</button>
        <button class="remove-item" data-name="${item.name}">Remove</button>
      </div>
    `;
    
    cartItemsContainer.appendChild(div);
  });

  document.getElementById("cart-total").innerText =
    `Total: $${total.toFixed(2)}`;

  // ==============================
  // BUTTON LISTENERS
  // ==============================

  // Increase qty
  document.querySelectorAll(".increase").forEach(button => {
    button.addEventListener("click", () => {
      const name = button.dataset.name;
      const item = cart.find(p => p.name === name);
      if (item) item.qty += 1;
      localStorage.setItem("cart", JSON.stringify(cart));
      updateCartCount();
      renderCart();
    });
  });

  // Decrease qty
  document.querySelectorAll(".decrease").forEach(button => {
    button.addEventListener("click", () => {
      const name = button.dataset.name;
      const item = cart.find(p => p.name === name);
      if (item) {
        item.qty -= 1;
        if (item.qty <= 0) {
          cart = cart.filter(p => p.name !== name); // remove if zero
        }
      }
      localStorage.setItem("cart", JSON.stringify(cart));
      updateCartCount();
      renderCart();
    });
  });

  // Remove item completely
  document.querySelectorAll(".remove-item").forEach(button => {
    button.addEventListener("click", () => {
      const name = button.dataset.name;
      cart = cart.filter(p => p.name !== name);
      localStorage.setItem("cart", JSON.stringify(cart));
      updateCartCount();
      renderCart();
    });
  });
}

// ==============================
// CLEAR CART
// ==============================
document.getElementById("clear-cart")?.addEventListener("click", () => {
  cart = [];
  localStorage.removeItem("cart");
  updateCartCount();
  renderCart();
});

// ==============================
// MIDTRANS PAYMENT
// ==============================
document.getElementById('pay-button').onclick = async function () {
  try {
    // calculate total cart amount
    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    // request a token from your Netlify function
    const response = await fetch("/.netlify/functions/create-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: totalAmount })
    });

    const data = await response.json();

    // call Midtrans Snap popup
    snap.pay(data.token, {
      onSuccess: function (result) {
        alert("Payment success!");
        window.location.href = "thanks.html";
      },
      onPending: function (result) {
        alert("Payment pending!");
      },
      onError: function (result) {
        alert("Payment failed!");
      },
      onClose: function () {
        alert("You closed the payment popup.");
      }
    });
  } catch (err) {
    alert("Error: " + err.message);
  }
};
