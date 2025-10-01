async function loadCities() {
  const res = await fetch("/data/cities.json");
  const cities = await res.json();
  const select = document.getElementById("city");

  // Populate city dropdown
  cities.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.city_id;
    opt.textContent = `${c.city_name}, ${c.province}`;
    select.appendChild(opt);
  });

  // Handle city selection
  select.addEventListener("change", async () => {
    const cityId = select.value;
    if (!cityId) return;

    // Example weight calculation (assume 500g per cart item)
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const totalWeight = Math.max(1, cart.reduce((s, i) => s + (i.qty * 500), 0));

    // Call shipping function
    const response = await fetch("/.netlify/functions/shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city_id: cityId,
        weight: totalWeight,
        couriers: ["jne", "jnt", "pos"]
      })
    });

    const shippingDiv = document.getElementById("shipping-options");
    shippingDiv.innerHTML = "";

    if (!response.ok) {
      const error = await response.json();
      shippingDiv.innerHTML = `<p>Error: ${error.error}</p>`;
      return;
    }

    const data = await response.json();

    // Render shipping choices
    data.shipping.forEach((opt, idx) => {
      const div = document.createElement("div");
      div.innerHTML = `
        <label>
          <input type="radio" name="shipping" value="${opt.price}" data-courier="${opt.courier}" />
          ${opt.courier.toUpperCase()} - ${opt.service} : Rp ${opt.price.toLocaleString("id-ID")} (ETD ${opt.etd})
        </label>
      `;
      shippingDiv.appendChild(div);
    });

    // When a shipping option is chosen → update total
    document.querySelectorAll("input[name=shipping]").forEach(radio => {
      radio.addEventListener("change", () => {
        updateTotal();
      });
    });
  });
}

function updateTotal() {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  let shipping = 0;
  let courier = "";
  let service = "";
  const selected = document.querySelector("input[name=shipping]:checked");
  if (selected) {
    shipping = Number(selected.value);
    courier = selected.dataset.courier;
    service = selected.dataset.service;
  }

  const total = subtotal + shipping;
  document.getElementById("order-total").textContent =
    `Total: Rp ${total.toLocaleString("id-ID")}`;

  // Save to localStorage for backend
  localStorage.setItem("shippingSelection", JSON.stringify({
    courier,
    service,
    price: shipping
  }));
}
