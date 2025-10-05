// assets/js/checkout.js

// ---- Save address + payment ----
async function saveAddress() {
  const address = {
    user_id: localStorage.getItem("user_id"),
    full_name: document.getElementById("full_name").value,
    street: document.getElementById("street").value,
    province: document.getElementById("province").value,
    city: document.getElementById("city").value,
    postal_code: document.getElementById("postal_code").value,
    phone: document.getElementById("phone").value,
  };

  // 1️⃣ Save to Supabase
  const res = await fetch("/.netlify/functions/auth-save-address", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(address),
  });
  const addrResult = await res.json();
  console.log("✅ Address saved:", addrResult);

  // 2️⃣ Get shipping data
  const totalWeight = calculateCartWeight();
  const shippingChoice = JSON.parse(localStorage.getItem("selectedShipping") || "{}");

  const shippingRes = await fetch("/.netlify/functions/shipping?type=cost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origin: "491", // Tangerang Selatan
      destination: document.getElementById("city").value,
      weight: totalWeight,
      courier: shippingChoice.courier || "jne",
    }),
  });

  const shippingData = await shippingRes.json();
  console.log("🚚 Shipping data received:", shippingData);

  // 3️⃣ Normalize both possible API response formats
  const results =
    shippingData?.rajaongkir?.results ||
    shippingData?.data ||
    [];

  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("No shipping data returned from API");
  }

  const match = results.find(
    (r) =>
      r.code === shippingChoice.courier &&
      r.service === shippingChoice.service
  );

  const shippingCost =
    match?.cost?.value ||
    match?.cost ||
    match?.costs?.[0]?.value ||
    0;

  console.log("💰 Shipping cost resolved:", shippingCost);

  // 4️⃣ Store and redirect to payment page
  const cart = getCart();
  const orderData = {
    cart,
    address,
    shipping: {
      courier: shippingChoice.courier,
      service: shippingChoice.service,
      etd: shippingChoice.etd || match?.etd || "-",
      cost: shippingCost,
    },
  };

  localStorage.setItem("pending_order", JSON.stringify(orderData));
  window.location.href = "payment.html";
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
  const ul      = document.getElementById("order-summary");
  const totalEl = document.getElementById("order-total");
  if (!ul || !totalEl) return;              // not on this page yet

  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const formatIDR = n => Number(n||0).toLocaleString("id-ID");

  const itemsSubtotal = cart.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.qty)||1), 0);
  const ship = Number(JSON.parse(localStorage.getItem("selectedShipping")||"null")?.price) || 0;

  ul.innerHTML = "";
  cart.forEach(i => {
    ul.insertAdjacentHTML("beforeend",
      `<li><span>${i.name} x${i.qty}</span><span>Rp ${formatIDR((i.price||0)*(i.qty||1))}</span></li>`);
  });
  ul.insertAdjacentHTML("beforeend",
    `<li><strong>Shipping</strong><strong>Rp ${formatIDR(ship)}</strong></li>`);

  totalEl.textContent = `Total: Rp ${formatIDR(itemsSubtotal + ship)}`;
}

// IMPORTANT: only call after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  renderOrderSummary();
});



// ---- Init ----

  document.addEventListener("DOMContentLoaded", async () => {

  // ===== DOM REFS (must exist in checkout.html) =====
  const provinceSelect     = document.getElementById("province");
  const citySelect         = document.getElementById("city");
  const districtSelect     = document.getElementById("district");
  const subdistrictSelect  = document.getElementById("subdistrict");
  const courierSelect      = document.getElementById("courier");
  const shippingOptionsDiv = document.getElementById("shipping-options");
  const errorBox           = document.getElementById("error-box");
  const orderList          = document.getElementById("order-summary");
  const orderTotalEl       = document.getElementById("order-total");

  // bail early if key nodes are missing (prevents cryptic errors)
  if (!provinceSelect || !citySelect || !districtSelect || !courierSelect || !shippingOptionsDiv || !orderList || !orderTotalEl) {
    console.error("checkout.js: Missing one or more required DOM elements. Check IDs in checkout.html.");
    return;
  }

  // ===== CONFIG =====
  const WAREHOUSE_DISTRICT_ID = "501"; // TODO: change to your real warehouse district_id
  const DBG = true;                    // set to false to silence logs

  // ===== UTILS =====
  const log = (...a) => DBG && console.log("[checkout]", ...a);
  const formatIDR = (n) => Number(n || 0).toLocaleString("id-ID");
  const getCart   = () => JSON.parse(localStorage.getItem("cart") || "[]");

  async function fetchData(type, params = {}, body = null) {
    try {
      const url = new URL(`/.netlify/functions/shipping`, window.location.origin);
      url.searchParams.set("type", type);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

      const res = await fetch(url, {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (e) {
        throw new Error(`Invalid JSON from function (${type}): ${text?.slice(0, 200)}`);
      }
      if (!res.ok || data?.error) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      return data.data || []; // your functions return { meta, data }
    } catch (err) {
      console.error(`❌ fetchData(${type}) error:`, err);
      if (errorBox) errorBox.textContent = err.message;
      return [];
    }
  }

  function computeCartWeight() {
    const cart = getCart();
    const total = cart.reduce((sum, it) => {
      const w = Number(it?.weight) > 0 ? Number(it.weight) : 250; // grams fallback
      const q = Number(it?.qty)    > 0 ? Number(it.qty)    : 1;
      return sum + w * q;
    }, 0);
    return Math.max(1000, Math.round(total)); // never 0; min 1kg
  }

  // cost extractor that handles numeric cost or array/object shapes
  function extractPrice(opt) {
    const candidates = [
      opt?.cost?.[0]?.value,
      opt?.cost?.value,
      typeof opt?.cost === "number" ? opt.cost : undefined,
      opt?.price, opt?.value, opt?.tariff, opt?.amount,
      opt?.total_cost ?? opt?.total ?? opt?.grand_total
    ].filter(v => v !== undefined);

    for (const c of candidates) {
      const n = Number(String(c).replace(/[^\d.-]/g, ""));
      if (Number.isFinite(n) && n >= 0) return n;
    }
    if (Array.isArray(opt?.cost)) {
      for (const c of opt.cost) {
        const n = Number(String(c?.value).replace(/[^\d.-]/g, ""));
        if (Number.isFinite(n) && n >= 0) return n;
      }
    }
    return 0;
  }
  const extractETD = (opt) => opt?.cost?.[0]?.etd || opt?.etd || opt?.estimate || "";

  // ===== ORDER SUMMARY =====
  function renderOrderSummary() {
    const cart = getCart();
    const selected = JSON.parse(localStorage.getItem("selectedShipping") || "null");
    const ship = Number(selected?.price) || 0;

    const items = cart.map(i => ({
      label: `${i.name} x${Number(i.qty) || 1}`,
      amount: (Number(i.price) || 0) * (Number(i.qty) || 1),
    }));
    const sub = items.reduce((s, x) => s + x.amount, 0);

    orderList.innerHTML = "";
    if (items.length === 0) {
      orderList.insertAdjacentHTML("beforeend", `<li><span>No items</span><span>Rp 0</span></li>`);
    } else {
      items.forEach(i => {
        orderList.insertAdjacentHTML("beforeend",
          `<li><span>${i.label}</span><span>Rp ${formatIDR(i.amount)}</span></li>`);
      });
    }
    orderList.insertAdjacentHTML("beforeend",
      `<li><strong>Shipping</strong><strong>Rp ${formatIDR(ship)}</strong></li>`);

    const grand = sub + ship;
    orderTotalEl.textContent = `Total: Rp ${formatIDR(grand)}`;

    // keep a compact summary for the payment step
    localStorage.setItem("checkoutSummary", JSON.stringify({ itemsSubtotal: sub, shippingAmount: ship, grand }));
  }

  // ===== SHIPPING OPTIONS RENDERER =====
  function renderShippingOptions(costData, courier) {
    if (!Array.isArray(costData) || costData.length === 0) {
      shippingOptionsDiv.innerHTML = "<p>No shipping options found.</p>";
      localStorage.removeItem("selectedShipping");
      renderOrderSummary();
      return;
    }

    const saved = JSON.parse(localStorage.getItem("selectedShipping") || "null");
    let html = "<h4>Available Shipping Options</h4><div>";

    costData.forEach((opt, idx) => {
      const service = opt.service || opt.code || opt.name || "(service)";
      const price   = extractPrice(opt);
      const etd     = extractETD(opt);
      const id      = `ship_${courier}_${service}_${idx}`;
      const checked =
        saved && saved.courier === courier &&
        saved.service === service &&
        Number(saved.price) === Number(price) ? "checked" : "";

      html += `
<label style="display:block;margin:6px 0;">
  <input type="radio" name="shippingOption"
         id="${id}"
         value="${service}"
         data-courier="${courier}"
         data-service="${service}"
         data-price="${price}"
         data-etd="${etd}"
         ${checked}>
  ${courier.toUpperCase()} - ${service} : Rp ${formatIDR(price)}${etd ? ` (ETD: ${etd})` : ""}
</label>`;
    });

    html += "</div>";
    shippingOptionsDiv.innerHTML = html;

    // persist selection & refresh summary
    shippingOptionsDiv.querySelectorAll('input[name="shippingOption"]').forEach(r => {
      r.addEventListener("change", e => {
        const t = e.target;
        localStorage.setItem("selectedShipping", JSON.stringify({
          courier: t.dataset.courier,
          service: t.dataset.service,
          price:   Number(t.dataset.price),
          etd:     t.dataset.etd
        }));
        renderOrderSummary();
      });
    });

    renderOrderSummary(); // reflect preselected saved option
  }

  // ===== LOADERS =====
  async function loadProvinces() {
    const provinces = await fetchData("province");
    provinceSelect.innerHTML = `<option value="">-- Select Province --</option>`;
    provinces.forEach(p => provinceSelect.insertAdjacentHTML("beforeend",
      `<option value="${p.id}">${p.name}</option>`));
    log("provinces:", provinces.length);
  }

  async function loadCities(provinceId) {
    const cities = await fetchData("city", { province: provinceId });
    citySelect.innerHTML        = `<option value="">-- Select City --</option>`;
    districtSelect.innerHTML    = `<option value="">-- Select District --</option>`;
    subdistrictSelect.innerHTML = `<option value="">-- Select Subdistrict --</option>`;
    cities.forEach(c => citySelect.insertAdjacentHTML("beforeend",
      `<option value="${c.id}">${c.name}</option>`));
    log("cities:", cities.length);
  }

  async function loadDistricts(cityId) {
    const districts = await fetchData("district", { city: cityId });
    districtSelect.innerHTML    = `<option value="">-- Select District --</option>`;
    subdistrictSelect.innerHTML = `<option value="">-- Select Subdistrict --</option>`;
    districts.forEach(d => districtSelect.insertAdjacentHTML("beforeend",
      `<option value="${d.id}">${d.name}</option>`));
    log("districts:", districts.length);
  }

  async function loadSubdistricts(districtId) {
    const subs = await fetchData("subdistrict", { district: districtId });
    subdistrictSelect.innerHTML = `<option value="">-- Select Subdistrict --</option>`;
    subs.forEach(s => subdistrictSelect.insertAdjacentHTML("beforeend",
      `<option value="${s.id}">${s.name}</option>`));
    log("subdistricts:", subs.length);
  }

  async function loadShippingCost() {
    const districtId = districtSelect.value;
    const courier    = courierSelect.value;
    if (!districtId || !courier) {
      shippingOptionsDiv.innerHTML = "<p>No shipping options found.</p>";
      localStorage.removeItem("selectedShipping");
      renderOrderSummary();
      return;
    }

    shippingOptionsDiv.innerHTML = "<p>Loading shipping options...</p>";

    const payload = {
      origin:      WAREHOUSE_DISTRICT_ID,
      destination: districtId,
      weight:      computeCartWeight(),
      courier
    };

    log("cost payload", payload);
    const costData = await fetchData("cost", {}, payload);

    if (DBG && costData?.length) {
      console.log("sample option", costData[0]);
    }
    renderShippingOptions(costData, courier);

    // load subdistricts after cost (if your flow needs full address)
    await loadSubdistricts(districtId);
  }

  // ===== EVENT LISTENERS =====
  provinceSelect.addEventListener("change", e => e.target.value && loadCities(e.target.value));
  citySelect.addEventListener("change",     e => e.target.value && loadDistricts(e.target.value));
  districtSelect.addEventListener("change", () => {
    localStorage.removeItem("selectedShipping");
    loadShippingCost();
  });
  courierSelect.addEventListener("change",  () => {
    localStorage.removeItem("selectedShipping");
    loadShippingCost();
  });

  // ===== INIT =====
  try {
    renderOrderSummary();
    await loadProvinces();
  } catch (e) {
    console.error("Init error:", e);
  }

  // if you use updateCartCount()/renderCart() from cart.js
  if (typeof updateCartCount === "function") updateCartCount();
  if (typeof renderCart === "function") renderCart();
});
