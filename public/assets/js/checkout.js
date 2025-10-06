// public/assets/js/checkout.js
async function apiFetch(action, method, body = {}) {
  const res = await fetch(`/.netlify/functions/api?action=${action}&method=${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${action}/${method} failed`);
  return res.json();
}

function setOptions(select, items, getValue, getLabel, placeholder) {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = getValue(item);
    opt.textContent = getLabel(item);
    select.appendChild(opt);
  });
}

// Show loading indicator in dropdown
function setLoading(select, text = "Loading...") {
  select.innerHTML = `<option value="">${text}</option>`;
}

// 1️⃣ Provinces
async function loadProvinces() {
  const provinceSel = document.getElementById("province");
  setLoading(provinceSel);

  try {
    const data = await apiFetch("shipping", "provinces");
    const results = data.rajaongkir?.results || [];

    if (!results.length) {
      provinceSel.innerHTML = '<option value="">-- No provinces found --</option>';
      return;
    }

    // ✅ Fix: ensure we pass correct id+name
    setOptions(provinceSel, results, (r) => r.id, (r) => r.name, "-- Select Province --");

    // Add a visual fix in case of transparent dropdown
    provinceSel.style.backgroundColor = "#fff";
    provinceSel.style.color = "#000";
  } catch (err) {
    console.error("Error fetching provinces:", err);
    provinceSel.innerHTML = '<option value="">-- Failed to load provinces --</option>';
  }
}

// 2️⃣ Cities by Province
async function loadCities() {
  const province_id = document.getElementById("province").value;
  if (!province_id) {
    console.warn("No province selected.");
    return;
  }

  const citySel = document.getElementById("city");
  setLoading(citySel);

  try {
    const data = await apiFetch("shipping", "cities", { province_id });
    const results = data.rajaongkir?.results || [];

    if (!results.length) {
      citySel.innerHTML = '<option value="">-- No cities found --</option>';
      return;
    }

    setOptions(citySel, results, (r) => r.id, (r) => r.name, "-- Select City --");
  } catch (err) {
    console.error("Error fetching cities:", err);
    citySel.innerHTML = '<option value="">-- Failed to load cities --</option>';
  }
}


// 3️⃣ Districts by City
async function loadDistricts() {
  const city_id = document.getElementById("city").value;
  if (!city_id) return;
  const districtSel = document.getElementById("district");
  setLoading(districtSel);
  const data = await apiFetch("shipping", "districts", { city_id });
  const results = data.rajaongkir?.results || [];
  setOptions(districtSel, results, (r) => r.id, (r) => r.name, "-- Select District --");
  document.getElementById("subdistrict").innerHTML = '<option value="">-- Select Subdistrict --</option>';
}

// 4️⃣ Subdistricts by District
async function loadSubdistricts() {
  const district_id = document.getElementById("district").value;
  if (!district_id) return;
  const subSel = document.getElementById("subdistrict");
  setLoading(subSel);
  const data = await apiFetch("shipping", "subdistricts", { district_id });
  const results = data.rajaongkir?.results || [];
  setOptions(subSel, results, (r) => r.id, (r) => r.name, "-- Select Subdistrict --");
}

// 5️⃣ Cost calculation (by district destination)
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

    const results = data.rajaongkir?.results || [];
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

// Initialize cascading dropdowns
document.addEventListener("DOMContentLoaded", () => {
  loadProvinces();

  document.getElementById("province").addEventListener("change", loadCities);
  document.getElementById("city").addEventListener("change", loadDistricts);
  document.getElementById("district").addEventListener("change", loadSubdistricts);
  document.getElementById("courier").addEventListener("change", loadShippingCost);
});
