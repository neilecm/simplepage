// assets/js/checkout.js

// ---- Save address + payment ----
async function saveAddress(event) {
  event.preventDefault();

  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user) {
    alert("⚠️ Please login first.");
    window.location.href = "login.html";
    return;
  }

  const shippingChoice = JSON.parse(localStorage.getItem("selectedShipping"));
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  const address = {
    user_id: user.id,
    full_name: document.getElementById("full_name").value,
    street: document.getElementById("street").value,
    city: document.getElementById("city").value,
    province: document.getElementById("province").value,
    postal_code: document.getElementById("postal_code").value,
    phone: document.getElementById("phone").value,
  };

  try {
    // 1. Save address
    const res = await fetch("/.netlify/functions/auth-save-address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(address),
    });

    if (!res.ok) throw new Error("Failed to save address");

    // 2. Re-check shipping cost live from RajaOngkir
    const totalWeight = calculateCartWeight();
    const shippingRes = await fetch("/.netlify/functions/shipping?type=cost", {
      method: "POST",
      body: JSON.stringify({
        origin: "491", // Tangerang Selatan
        destination: document.getElementById("city").value,
        weight: totalWeight,
        courier: shippingChoice.courier,
      }),
    });

    const shippingData = await shippingRes.json();
    const courierResult = shippingData.rajaongkir.results.find(
      (c) => c.code === shippingChoice.courier
    );
    const serviceResult = courierResult.costs.find(
      (s) => s.service === shippingChoice.service
    );
    const shippingCost = serviceResult.cost[0].value;

    // 3. Create Midtrans transaction
    const orderRes = await fetch("/.netlify/functions/create-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cart,
        address,
        shipping: {
          courier: shippingChoice.courier,
          service: shippingChoice.service,
          etd: shippingChoice.etd,
          cost: shippingCost,
        },
      }),
    });

    const orderData = await orderRes.json();
    const token = orderData.token;

    // 4. Open Midtrans Snap popup
    window.snap.pay(token);
  } catch (err) {
    console.error("❌ Checkout error:", err);
    document.getElementById("error-box").textContent = err.message;
  }
}

// ---- Helpers ----
function calculateCartWeight() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  return cart.reduce((sum, item) => sum + (item.weight || 100) * item.qty, 0);
}

// ---- Provinces ----
async function loadProvinces() {
  const res = await fetch("/.netlify/functions/shipping?type=province");
  const data = await res.json();

  const provinceSelect = document.getElementById("province");
  provinceSelect.innerHTML = "<option value=''>-- Select Province --</option>";

  (data?.data || []).forEach((prov) => {
    const opt = document.createElement("option");
    opt.value = prov.id;
    opt.textContent = prov.name;
    provinceSelect.appendChild(opt);
  });

  provinceSelect.addEventListener("change", () => {
  console.log("📦 Province selected:", provinceSelect.value);
  if (provinceSelect.value) {
    loadCities(provinceSelect.value);
  }
});

}

// ---- Cities ----
// --- Cities ---
async function loadCities(provinceId) {
  console.log("🔍 loadCities() called with province:", provinceId);

  const res = await fetch(`/.netlify/functions/shipping?type=city&province=${provinceId}`);
  const data = await res.json();
  console.log("📦 City API response:", data);

  const citySelect = document.getElementById("city");
  citySelect.innerHTML = "<option value=''>-- Select City --</option>";

  if (!data.data || !Array.isArray(data.data)) {
    console.error("❌ No city data found:", data);
    return;
  }

  data.data.forEach(city => {
    const opt = document.createElement("option");
    opt.value = city.id;      // ✅ Komerce API uses "id"
    opt.textContent = city.name; // ✅ Komerce API uses "name"
    citySelect.appendChild(opt);
  });

  // when a city is selected, load shipping options
  citySelect.addEventListener("change", () => {
    if (citySelect.value) {
      loadShippingOptions(citySelect.value, "jne:pos:tiki");
    }
  });
}





// ---- Shipping options ----
async function loadShippingOptions(destinationId) {
  const shippingDiv = document.getElementById("shipping-options");
  shippingDiv.innerHTML = "<p>Loading shipping options...</p>";

  const originId = "491"; // Tangerang Selatan
  const totalWeight = calculateCartWeight();

  const res = await fetch("/.netlify/functions/shipping?type=cost", {
    method: "POST",
    body: JSON.stringify({
      origin: originId,
      destination: destinationId,
      weight: totalWeight,
      courier: "jne:pos:tiki",
    }),
  });

  const result = await res.json();
  shippingDiv.innerHTML = "";

  const results = result?.rajaongkir?.results || [];
  if (!results.length) {
    shippingDiv.innerHTML = "<p>No shipping options available.</p>";
    return;
  }

  results.forEach((courierObj) => {
    const courierName = courierObj.code.toUpperCase();
    courierObj.costs.forEach((opt) => {
      const cost = opt.cost[0].value;
      const etd = opt.cost[0].etd;
      const service = opt.service;

      const label = document.createElement("label");
      label.innerHTML = `
        <input type="radio" name="shipping" value="${cost}">
        ${courierName} - ${service} : Rp ${cost.toLocaleString()} (ETD: ${etd} days)
      `;
      label.querySelector("input").addEventListener("change", () => {
        updateTotalPreview(cost, courierObj.code, service, etd);
      });

      shippingDiv.appendChild(label);
      shippingDiv.appendChild(document.createElement("br"));
    });
  });
}

// ---- Preview total ----
function updateTotalPreview(shippingCost, courier, service, etd) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal + shippingCost;

  document.getElementById("order-total").textContent =
    "Total: Rp " + total.toLocaleString();

  // Save only the choice (not the cost to avoid stale pricing)
  localStorage.setItem(
    "selectedShipping",
    JSON.stringify({ courier, service, etd })
  );
}

// ---- Render Order Summary ----
function renderOrderSummary() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const summaryEl = document.getElementById("order-summary");
  const totalEl = document.getElementById("order-total");

  summaryEl.innerHTML = "";
  let subtotal = 0;

  cart.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.name} (x${item.qty}) - Rp ${(item.price * item.qty).toLocaleString()}`;
    summaryEl.appendChild(li);
    subtotal += item.price * item.qty;
  });

  totalEl.textContent = "Total: Rp " + subtotal.toLocaleString();
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
  // Safe calls if cart.js is present
  if (typeof updateCartCount === "function") updateCartCount();
  if (typeof renderCart === "function") renderCart();

  // ----- DOM refs -----
  const provinceSelect     = document.getElementById("province");
  const citySelect         = document.getElementById("city");
  const districtSelect     = document.getElementById("district");
  const subdistrictSelect  = document.getElementById("subdistrict");
  const courierSelect      = document.getElementById("courier");
  const shippingOptionsDiv = document.getElementById("shipping-options");
  const errorBox           = document.getElementById("error-box");

  // ----- Config (set your warehouse district_id) -----
  const WAREHOUSE_DISTRICT_ID = "501"; // TODO: change to your real warehouse district_id

  // ----- Helpers -----
  function computeCartWeight() {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const total = cart.reduce((sum, it) => {
      const w = Number(it.weight) || 250; // 250g fallback/item
      const q = Number(it.qty)    || 1;
      return sum + w * q;
    }, 0);
    return total > 0 ? total : 1000; // 1kg fallback
  }

  // Single fetch helper (don’t duplicate this elsewhere)
  async function fetchData(type, params = {}, body = null) {
    try {
      const url = new URL("/.netlify/functions/shipping", window.location.origin);
      url.searchParams.set("type", type);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

      const res = await fetch(url.toString(), {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || `HTTP ${res.status}`);
      // Enterprise responses: { meta, data: [...] }
      return json.data || [];
    } catch (err) {
      console.error(`❌ Fetch ${type} error:`, err);
      if (errorBox) errorBox.textContent = err.message;
      return [];
    }
  }

  // ----- Cascading loaders -----
  async function loadProvinces() {
    const provinces = await fetchData("province");
    provinceSelect.innerHTML = `<option value="">-- Select Province --</option>`;
    provinces.forEach(p => {
      provinceSelect.insertAdjacentHTML("beforeend", `<option value="${p.id}">${p.name}</option>`);
    });
    if (shippingOptionsDiv) shippingOptionsDiv.innerHTML = `<p>No shipping options found.</p>`;
  }

  async function loadCities(provinceId) {
    const cities = await fetchData("city", { province: provinceId });
    citySelect.innerHTML         = `<option value="">-- Select City --</option>`;
    districtSelect.innerHTML     = `<option value="">-- Select District --</option>`;
    if (subdistrictSelect) subdistrictSelect.innerHTML = `<option value="">-- Select Subdistrict --</option>`;
    cities.forEach(c => {
      citySelect.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.name}</option>`);
    });
    if (shippingOptionsDiv) shippingOptionsDiv.innerHTML = `<p>No shipping options found.</p>`;
  }

  async function loadDistricts(cityId) {
    const districts = await fetchData("district", { city: cityId });
    districtSelect.innerHTML     = `<option value="">-- Select District --</option>`;
    if (subdistrictSelect) subdistrictSelect.innerHTML = `<option value="">-- Select Subdistrict --</option>`;
    districts.forEach(d => {
      districtSelect.insertAdjacentHTML("beforeend", `<option value="${d.id}">${d.name}</option>`);
    });
    if (shippingOptionsDiv) shippingOptionsDiv.innerHTML = `<p>No shipping options found.</p>`;
  }

  async function loadSubdistricts(districtId) {
    if (!subdistrictSelect) return;
    const subs = await fetchData("subdistrict", { district: districtId });
    subdistrictSelect.innerHTML = `<option value="">-- Select Subdistrict --</option>`;
    subs.forEach(s => {
      subdistrictSelect.insertAdjacentHTML("beforeend", `<option value="${s.id}">${s.name}</option>`);
    });
  }

  // ----- Shipping cost after District + Courier -----
  async function loadShippingCost() {
    const districtId = districtSelect.value;
    const courier    = courierSelect ? courierSelect.value : "";

    if (!districtId || !courier) {
      if (shippingOptionsDiv) shippingOptionsDiv.innerHTML = "<p>No shipping options found.</p>";
      return;
    }

    if (shippingOptionsDiv) shippingOptionsDiv.innerHTML = "<p>Loading shipping options...</p>";

    const payload = {
      origin:      WAREHOUSE_DISTRICT_ID, // warehouse district_id
      destination: districtId,            // user-selected district
      weight:      computeCartWeight(),   // grams
      courier: courierSelect.value // e.g. "jne"  (or "jne,tiki" if you allow multi)
    };

    const costData = await fetchData("cost", {}, payload);

    if (!Array.isArray(costData) || costData.length === 0) {
      if (shippingOptionsDiv) shippingOptionsDiv.innerHTML = "<p>No shipping options found.</p>";
      await loadSubdistricts(districtId);
      return;
    }

    // Render courier/service options robustly
    let html = "<h4>Available Shipping Options</h4><ul>";
    costData.forEach(opt => {
      const service = opt.service || opt.code || opt.name || "(service)";
      const price   = (opt.cost && opt.cost[0] && opt.cost[0].value) ?? opt.price ?? opt.value ?? 0;
      html += `<li>${courier.toUpperCase()} - ${service} : Rp ${Number(price).toLocaleString("id-ID")}</li>`;
    });
    html += "</ul>";
    if (shippingOptionsDiv) shippingOptionsDiv.innerHTML = html;

    // Load subdistricts after cost (if your flow needs it)
    await loadSubdistricts(districtId);
  }

  // ----- Listeners (single set) -----
  provinceSelect.addEventListener("change", e => e.target.value && loadCities(e.target.value));
  citySelect.addEventListener("change",     e => e.target.value && loadDistricts(e.target.value));
  districtSelect.addEventListener("change", () => loadShippingCost());
  if (courierSelect) courierSelect.addEventListener("change", () => loadShippingCost());

  // ----- Kickoff -----
  loadProvinces();
});
