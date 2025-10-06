// ================================
// checkout.js — Clean MVC Version
// ================================

// Helper for Netlify API calls
async function apiFetch(action, method, body = {}) {
  const res = await fetch(`/.netlify/functions/api?action=${action}&method=${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return await res.json();
}

// ======================================
// 1️⃣ Load Provinces, Cities, Districts, Subdistricts
// ======================================
document.addEventListener("DOMContentLoaded", () => {
  loadProvinces();

  document.getElementById("province").addEventListener("change", loadCities);
  document.getElementById("city").addEventListener("change", loadDistricts);
  document.getElementById("district").addEventListener("change", loadSubdistricts);
  document.getElementById("courier").addEventListener("change", loadShippingCost);
  document.getElementById("continue-to-payment").addEventListener("click", handlePayment);
});

// --- Load Provinces ---
async function loadProvinces() {
  const provinceSel = document.getElementById("province");
  provinceSel.innerHTML = "<option>Loading...</option>";

  try {
    const data = await apiFetch("shipping", "provinces");
    const provinces = data.rajaongkir.results || data.data || [];

    provinceSel.innerHTML = "<option value=''>-- Select Province --</option>";
    provinces.forEach(p => {
      provinceSel.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });
  } catch (err) {
    console.error("Error fetching provinces:", err);
    provinceSel.innerHTML = "<option>Error loading provinces</option>";
  }
}

// --- Load Cities ---
async function loadCities() {
  const citySel = document.getElementById("city");
  const province_id = document.getElementById("province").value;
  if (!province_id) return;

  citySel.innerHTML = "<option>Loading...</option>";

  try {
    const data = await apiFetch("shipping", "cities", { province_id });
    const cities = data.rajaongkir.results || data.data || [];

    citySel.innerHTML = "<option value=''>-- Select City --</option>";
    cities.forEach(c => {
      citySel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
  } catch (err) {
    console.error("Error fetching cities:", err);
    citySel.innerHTML = "<option>Error loading cities</option>";
  }
}

// --- Load Districts ---
async function loadDistricts() {
  const districtSel = document.getElementById("district");
  const city_id = document.getElementById("city").value;
  if (!city_id) return;

  districtSel.innerHTML = "<option>Loading...</option>";

  try {
    const data = await apiFetch("shipping", "districts", { city_id });
    const districts = data.rajaongkir.results || data.data || [];

    districtSel.innerHTML = "<option value=''>-- Select District --</option>";
    districts.forEach(d => {
      districtSel.innerHTML += `<option value="${d.id}">${d.name}</option>`;
    });
  } catch (err) {
    console.error("Error fetching districts:", err);
    districtSel.innerHTML = "<option>Error loading districts</option>";
  }
}

// --- Load Subdistricts ---
async function loadSubdistricts() {
  const subSel = document.getElementById("subdistrict");
  const district_id = document.getElementById("district").value;
  if (!district_id) return;

  subSel.innerHTML = "<option>Loading...</option>";

  try {
    const data = await apiFetch("shipping", "subdistricts", { district_id });
    const subdistricts = data.rajaongkir.results || data.data || [];

    subSel.innerHTML = "<option value=''>-- Select Subdistrict --</option>";
    subdistricts.forEach(s => {
      subSel.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
  } catch (err) {
    console.error("Error fetching subdistricts:", err);
    subSel.innerHTML = "<option>Error loading subdistricts</option>";
  }
}

// ======================================
// 2️⃣ Shipping Cost Calculation
// ======================================
async function loadShippingCost() {
  const courier = document.getElementById("courier").value;
  const district_id = document.getElementById("district").value;
  if (!courier || !district_id) return;

  const container = document.getElementById("shipping-options");
  container.innerHTML = "<p>Calculating cost...</p>";

  try {
    const data = await apiFetch("shipping", "cost", {
      destination: district_id,
      courier,
      weight: 1000,
      price: "lowest",
    });

    const results = data.rajaongkir?.results || data.data || [];
    if (!results.length) {
      container.innerHTML = "<p>No shipping options found.</p>";
      return;
    }

    let html = "<h4>Available Couriers:</h4>";
    for (const opt of results) {
      html += `
        <label>
          <input type="radio" name="shipping" value="${opt.cost}">
          ${opt.name} - ${opt.service} (${opt.description}) — Rp ${opt.cost.toLocaleString("id-ID")} 
          <small>[${opt.etd}]</small>
        </label><br/>
      `;
    }
    container.innerHTML = html;
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Failed to fetch shipping cost.</p>";
  }
}

// ======================================
// 3️⃣ Update Total Dynamically
// ======================================
document.addEventListener("change", e => {
  if (e.target.name === "shipping") {
    const shipping_cost = parseInt(e.target.value);
    const items_total = calculateCartTotal();
    const total = items_total + shipping_cost;

    document.getElementById("order-summary").innerHTML = `
      <p id="item-total">Items: Rp ${items_total.toLocaleString("id-ID")}</p>
      <p id="shipping-total">Shipping: Rp ${shipping_cost.toLocaleString("id-ID")}</p>
      <h3 id="order-total">Total: Rp ${total.toLocaleString("id-ID")}</h3>
    `;
  }
});

function calculateCartTotal() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

// ======================================
// 4️⃣ Handle Continue to Payment
// ======================================
async function handlePayment() {
  const full_name = document.getElementById("full_name")?.value.trim();
  const street = document.getElementById("street")?.value.trim();
  const province = document.getElementById("province")?.value;
  const city = document.getElementById("city")?.value;
  const district = document.getElementById("district")?.value;
  const subdistrict = document.getElementById("subdistrict")?.value;
  const courier = document.getElementById("courier")?.value;
  const postal_code = document.getElementById("postal_code")?.value.trim();
  const phone = document.getElementById("phone")?.value.trim();
  const shippingInput = document.querySelector('input[name="shipping"]:checked');
  const shipping_cost = shippingInput ? parseInt(shippingInput.value) : 0;

  if (!full_name || !street || !province || !city || !district || !courier || !postal_code || !phone || !shipping_cost) {
    alert("Please fill in all required address fields before payment.");
    return;
  }

  try {
    await apiFetch("auth-save-address", "save", {
      full_name,
      street,
      province,
      city,
      district,
      subdistrict,
      courier,
      postal_code,
      phone,
    });

    localStorage.setItem("shipping_cost", shipping_cost);
    window.location.href = "payment.html";
  } catch (err) {
    console.error("Failed to save address:", err);
    alert("An error occurred while saving your address.");
  }
}
