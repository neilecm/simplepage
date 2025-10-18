import { CheckoutModel } from "../models/CheckoutModel.js";
import { CheckoutView } from "../views/CheckoutView.js";

// Helpers once near the top
async function __getUserId() {
  try {
    if (!window.supabase?.auth?.getUser) return null;
    const { data: { user } } = await window.supabase.auth.getUser();
    return user?.id || null;
  } catch { return null; }
}

function __ensureGuestId() {
  const k = "guest_id";
  let gid = localStorage.getItem(k);
  if (!gid) {
    gid = (crypto.randomUUID?.() || (Date.now() + "-" + Math.random().toString(16).slice(2)));
    localStorage.setItem(k, gid);
  }
  return gid;
}


export const CheckoutController = {
  async init() {
    // Reset stale shipping data upon entering checkout
    localStorage.setItem("shipping_cost", "0");
    localStorage.removeItem("shipping_service");
    localStorage.removeItem("shipping_selection_meta");
    document.dispatchEvent(new Event("shippingUpdated"));

    try {
      const provinces = await CheckoutModel.fetchProvinces();
      CheckoutView.populateSelect("province", provinces.data || provinces.rajaongkir?.results || []);
    } catch (err) {
      console.error("Failed to load provinces:", err);
      alert("Cannot load province list. Please refresh.");
    }

    // Event bindings
    document.getElementById("province")?.addEventListener("change", this.handleProvinceChange);
    document.getElementById("city")?.addEventListener("change", this.handleCityChange);
    document.getElementById("district")?.addEventListener("change", this.handleDistrictChange);
    document.getElementById("courier")?.addEventListener("change", this.handleCourierChange);
    document.getElementById("continue-to-payment")?.addEventListener("click", this.saveAndContinue);
  },

  async handleProvinceChange(e) {
    const provinceId = e.target.value;
    if (!provinceId) return;
    const cities = await CheckoutModel.fetchCities(provinceId);
    CheckoutView.populateSelect("city", cities.data || cities.rajaongkir?.results || []);
  },

  async handleCityChange(e) {
    const cityId = e.target.value;
    if (!cityId) return;
    const districts = await CheckoutModel.fetchDistricts(cityId);
    CheckoutView.populateSelect("district", districts.data || districts.rajaongkir?.results || []);
  },

  async handleDistrictChange(e) {
    const districtId = e.target.value;
    if (!districtId) return;
    const subdistricts = await CheckoutModel.fetchSubdistricts(districtId);
    CheckoutView.populateSelect("subdistrict", subdistricts.data || subdistricts.rajaongkir?.results || []);
  },

  async handleCourierChange() {
    const courier = document.getElementById("courier")?.value;
    const districtId = document.getElementById("district")?.value;
    if (!courier || !districtId) return;
    const cost = await CheckoutModel.fetchCost(districtId, courier);
    const results = cost.data?.results || cost.rajaongkir?.results || [];
    CheckoutView.showShippingOptions(results);
  },

  async saveAndContinue() {
    const errorBox = document.getElementById("error-box");
    if (errorBox) errorBox.textContent = "";

    const shippingCost = Number(localStorage.getItem("shipping_cost") || 0);
    if (Number.isNaN(shippingCost) || shippingCost <= 0) {
      const message = "Please select a shipping service before continuing.";
      if (errorBox) {
        errorBox.textContent = message;
      } else {
        alert(message);
      }
      return;
    }

    const fields = {
      full_name: document.getElementById("full_name")?.value.trim(),
      street: document.getElementById("street_address")?.value.trim(),
      province: document.getElementById("province")?.value,
      city: document.getElementById("city")?.value,
      district: document.getElementById("district")?.value,
      subdistrict: document.getElementById("subdistrict")?.value,
      postal_code: document.getElementById("postal_code")?.value.trim(),
      phone: document.getElementById("phone")?.value.trim(),
      courier: document.getElementById("courier")?.value,
      shipping_cost: shippingCost,
    };

// get logged-in user id if available
async function getCurrentUserId() {
  try {
    if (!window.supabase?.auth?.getUser) return null;
    const { data: { user } } = await window.supabase.auth.getUser();
    return user?.id || null;
  } catch { return null; }
}

// ensure a persistent guest id
function ensureGuestId() {
  const k = "guest_id";
  let gid = localStorage.getItem(k);
  if (!gid) {
    gid = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    localStorage.setItem(k, gid);
  }
  return gid;
}

async function saveAddressAndCreateOrder(order_id, addrFields, shipSel) {
  // ==== PATCH: persist address to Supabase via direct function ====
const user_id  = await __getUserId();
const guest_id = user_id ? null : __ensureGuestId();

// Use your existing helpers to read the form & Komerce choice.
// If you don't have them, replace with your current variables.
const addr = (typeof __readAddressForm === "function")
  ? __readAddressForm()
  : {
      full_name:  document.getElementById("full_name")?.value?.trim(),
      phone:      document.getElementById("phone")?.value?.trim(),
      street:     document.getElementById("street")?.value?.trim(),
      province_id:document.getElementById("province")?.value,
      city_id:    document.getElementById("city_id")?.value,
      district_id:document.getElementById("district")?.value,
      subdistrict_id:document.getElementById("subdistrict")?.value,
      postal_code:document.getElementById("postal_code")?.value
    };

const ship = (typeof __readShippingSelection === "function")
  ? __readShippingSelection()
  : JSON.parse(localStorage.getItem("komerceShippingSelection") || "{}");

// IMPORTANT: call the **new** function, not the old router
await fetch("/.netlify/functions/auth-save-address", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id,
    guest_id,
    full_name:        addr.full_name,
    phone:            addr.phone,
    street:           addr.street,
    province_id:      addr.province_id,
    city_id:          addr.city_id,
    district_id:      addr.district_id,
    subdistrict_id:   addr.subdistrict_id,
    postal_code:      addr.postal_code,
    courier:          addr.courier_code,
    shipping_service: addr.service_code,
    courier_name:     addr.courier_name,
    service_code: addr.service_code,
    service_label: addr.service_label,
    etd: addr.etd,
    etd_days: addr.etd_days,
    shipping_cost: addr.shipping_cost,

    courier:          ship?.courier || ship?.code || null,
    shipping_service: ship?.service || ship?.name || null
  

  })
});
// ==== /PATCH ====

// ==== PATCH: identity helpers (top of file) ====
async function __getUserId() {
  try {
    if (!window.supabase?.auth?.getUser) return null;
    const { data: { user } } = await window.supabase.auth.getUser();
    return user?.id || null;
  } catch { return null; }
}

function __ensureGuestId() {
  const k = "guest_id";
  let gid = localStorage.getItem(k);
  if (!gid) {
    gid = (crypto.randomUUID?.() || (Date.now() + "-" + Math.random().toString(16).slice(2)));
    localStorage.setItem(k, gid);
  }
  return gid;
}
// ==== /PATCH ====



  // 2) create order record with the same identity
  await fetch("/.netlify/functions/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id,
      user_id, guest_id,
      total: addrFields?.total ?? null,
      payment_type: "credit_card",
      status: "pending"
    })
  });
}


    // Validate fields
    const missing = Object.entries(fields)
      .filter(([_, v]) => !v)
      .map(([k]) => k.replace("_", " "));
    if (missing.length) {
      alert("Please fill: " + missing.join(", "));
      return;
    }

    // New direct call to auth-save-address (replace legacy router)
    const user_id = await __getUserId();
    const guest_id = user_id ? null : __ensureGuestId();

    // Reuse existing helpers if present
    const addr = (typeof __readAddressForm === "function") ? __readAddressForm() : {
      full_name: document.getElementById("full_name")?.value?.trim(),
      phone: document.getElementById("phone")?.value?.trim(),
      street: document.getElementById("street_address")?.value?.trim() || document.getElementById("street")?.value?.trim(),
      province_id: document.getElementById("province")?.value,
      city_id: document.getElementById("city")?.value || document.getElementById("city_id")?.value,
      district_id: document.getElementById("district")?.value,
      subdistrict_id: document.getElementById("subdistrict")?.value,
      postal_code: document.getElementById("postal_code")?.value?.trim(),
    };
    const ship = (typeof __readShippingSelection === "function") ? __readShippingSelection() : (JSON.parse(localStorage.getItem("komerceShippingSelection") || "{}") || null);

    // Build Komerce shipping block from localStorage (safe parsing)
    const _metaRaw = localStorage.getItem('shipping_selection_meta');
    let _meta = {};
    try { _meta = _metaRaw ? JSON.parse(_metaRaw) : {}; } catch { _meta = {}; }

    const _cost = Number(localStorage.getItem('shipping_cost') || 0);
    const _legacyService = localStorage.getItem('shipping_service') || _meta.service || null;

    const courier_code  = _meta.courier || null;
    const courier_name  = _meta.courierName || null;
    const service_code  = _meta.service || null;
    const service_label = _meta.label || (courier_name && service_code ? `${courier_name} ${service_code}` : null);
    const etd           = _meta.etd || null;
    const etd_days      = etd ? Math.max(...etd.split('-').map(v => parseInt(v, 10)).filter(Number.isFinite)) : null;

    const body = {
      user_id,
      guest_id,
      full_name:       addr.full_name,
      phone:           addr.phone,
      street:          addr.street,
      province_id:     addr.province_id,
      city_id:         addr.city_id,
      district_id:     addr.district_id,
      subdistrict_id:  addr.subdistrict_id,
      postal_code:     addr.postal_code,
      // keep legacy top-level for backward compatibility
      courier:         ship?.courier || ship?.code || courier_code || null,
      shipping_service:ship?.service || ship?.name || _legacyService || null,
    };

    body.shipping = {
      provider: _meta.provider || 'komerce',
      // legacy (compat)
      courier: courier_code,
      shipping_service: _legacyService,
      // rich Komerce fields
      courier_code,
      courier_name,
      service_code,
      service_label,
      etd,
      etd_days,
      shipping_cost: Number.isFinite(_cost) ? _cost : null,
    };

    console.debug('[checkout] shipping payload ->', body.shipping);

    const resp = await fetch('/.netlify/functions/auth-save-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error('auth-save-address failed:', t);
      alert('❌ Failed to save address.');
      return;
    }

    localStorage.setItem("shipping_cost", fields.shipping_cost);
    localStorage.setItem("address_data", JSON.stringify(fields));
    window.location.href = "payment.html";
  },
};
