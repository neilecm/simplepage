// ============================
// Cera Brasileira - Checkout
// Refactored for MVC pattern
// ============================

// Helpers
function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

// -----------------------------
// 1. FETCH SHIPPING COST
// -----------------------------
async function fetchShippingCost(destination, weight, courier) {
  const res = await fetch("/.netlify/functions/shipping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "cost",
      destination,
      weight,
      courier,
    }),
  });

  if (!res.ok) throw new Error("Failed to fetch shipping cost");
  const data = await res.json();
  return data.rajaongkir?.results?.[0]?.costs || [];
}

async function updateShippingOptions() {
  const destination = document.getElementById("city")?.value;
  const courier = document.getElementById("courier")?.value || "jne";
  const weight = 1000; // default 1kg or dynamic from cart

  if (!destination) {
    alert("Please select destination city");
    return;
  }

  try {
    const shippingOptions = await fetchShippingCost(destination, weight, courier);
    const select = document.getElementById("shippingOptions");
    select.innerHTML = "";

    shippingOptions.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt.service;
      option.dataset.cost = opt.cost[0].value;
      option.textContent = `${opt.service} - ${formatCurrency(opt.cost[0].value)} (${opt.description})`;
      select.appendChild(option);
    });

    document.getElementById("shippingContainer").style.display = "block";
  } catch (err) {
    console.error(err);
    alert("Could not load shipping cost.");
  }
}

// -----------------------------
// 2. SAVE ADDRESS
// -----------------------------
async function saveAddress() {
  const address = {
    full_name: document.getElementById("full_name").value,
    phone: document.getElementById("phone").value,
    address: document.getElementById("address").value,
    city_id: document.getElementById("city").value,
    postal_code: document.getElementById("postal_code").value,
  };

  const res = await fetch("/.netlify/functions/auth-save-address", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(address),
  });

  if (!res.ok) throw new Error("Failed to save address");
  return res.json();
}

// -----------------------------
// 3. CREATE MIDTRANS TRANSACTION
// -----------------------------
async function createTransaction(totalAmount, items, customer) {
  const res = await fetch("/.netlify/functions/create-transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      totalAmount,
      items,
      customer,
    }),
  });

  if (!res.ok) throw new Error("Payment creation failed");
  return res.json(); // expects { token, redirect_url }
}

// -----------------------------
// 4. HANDLE CHECKOUT
// -----------------------------
async function handleCheckout() {
  const selectedShipping = document.getElementById("shippingOptions").selectedOptions[0];
  const shippingCost = Number(selectedShipping.dataset.cost);
  const shippingService = selectedShipping.value;

  const totalCart = Number(localStorage.getItem("cartTotal")) || 0;
  const grandTotal = totalCart + shippingCost;

  const customer = {
    name: document.getElementById("full_name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
  };

  const cartItems = JSON.parse(localStorage.getItem("cart")) || [];

  try {
    // Save address before payment
    await saveAddress();

    // Create Midtrans Snap transaction via backend
    const { token } = await createTransaction(grandTotal, cartItems, customer);

    // Open Midtrans Snap popup
    window.snap.pay(token, {
      onSuccess: (result) => {
        console.log("Payment success:", result);
        alert("Payment successful!");
        localStorage.removeItem("cart");
        window.location.href = "/payment-success.html";
      },
      onPending: (result) => {
        console.log("Payment pending:", result);
        alert("Payment pending, please complete later.");
      },
      onError: (result) => {
        console.error("Payment failed:", result);
        alert("Payment failed, please try again.");
      },
      onClose: () => {
        alert("You closed the payment popup before completing the transaction.");
      },
    });
  } catch (err) {
    console.error(err);
    alert("Checkout failed. Please try again.");
  }
}

// -----------------------------
// 5. EVENT LISTENERS
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("checkShippingBtn")?.addEventListener("click", updateShippingOptions);
  document.getElementById("checkoutBtn")?.addEventListener("click", handleCheckout);
});
