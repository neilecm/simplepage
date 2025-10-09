// src/controllers/CheckoutController.js
import * as Shipping from "../models/ShippingModel.js";
import * as Address from "../models/AddressModel.js";

/**
 * Initialize checkout page: populate provinces & add listeners
 */
export async function initCheckout() {
  await populateProvinces();
  addEventListeners();
}

/* -------------------------------------------------------------------------- */
/*                            EVENT REGISTRATIONS                             */
/* -------------------------------------------------------------------------- */
function addEventListeners() {
  document.getElementById("province")?.addEventListener("change", handleProvinceChange);
  document.getElementById("city")?.addEventListener("change", handleCityChange);
  document.getElementById("district")?.addEventListener("change", handleDistrictChange);
  document.getElementById("courier")?.addEventListener("change", handleCourierChange);
  document.getElementById("continue-to-payment")?.addEventListener("click", handlePayment);
}

/* -------------------------------------------------------------------------- */
/*                             SHIPPING SELECTION                             */
/* -------------------------------------------------------------------------- */
async function populateProvinces() {
  const data = await Shipping.getProvinces();
  renderSelect("province", data?.data, "name", "id");
}

async function handleProvinceChange(e) {
  const province_id = getSelectedId("province");
  const data = await Shipping.getCities(province_id);
  renderSelect("city", data?.data, "name", "id");
}

async function handleCityChange() {
  const city_id = getSelectedId("city");
  const data = await Shipping.getDistricts(city_id);
  renderSelect("district", data?.data, "name", "id");
}

async function handleDistrictChange() {
  const district_id = getSelectedId("district");
  const data = await Shipping.getSubdistricts(district_id);
  renderSelect("subdistrict", data?.data, "name", "id");
}

async function handleCourierChange() {
  const district_id = getSelectedId("district");
  const courier = document.getElementById("courier")?.value;
  if (!district_id || !courier) return;
  const cost = await Shipping.getCost(district_id, courier);
  renderShippingOptions(cost?.data);
}

/* -------------------------------------------------------------------------- */
/*                            PAYMENT HANDLING                                */
/* -------------------------------------------------------------------------- */
export async function handlePayment(event) {
  event.preventDefault();

  const form = collectFormData();
  const missing = validateForm(form);

  if (missing.length) {
    alert("Please fill the following fields before payment:\n" + missing.join(", "));
    console.warn("Missing fields:", missing);
    return;
  }

  try {
    const res = await Address.saveAddress(form);
    if (res.error) throw new Error(res.error.message);
    console.log("✅ Address saved:", res);
    alert("Address saved successfully!");

    // persist to localStorage for payment.html
    localStorage.setItem("shipping_cost", form.shipping_cost);
    localStorage.setItem("address_data", JSON.stringify(form));

    // redirect to payment
    window.location.href = "/payment.html";
  } catch (err) {
    console.error("Save address failed:", err);
    alert("Failed to save address.");
  }
}

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */
function getSelectedId(id) {
  const el = document.getElementById(id);
  const opt = el?.selectedOptions?.[0];
  return opt?.dataset?.id || opt?.value || "";
}

function renderSelect(id, list, labelKey, valueKey) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '<option value="">-- Select --</option>';
  list?.forEach(item => {
    const opt = document.createElement("option");
    opt.text = item[labelKey];
    opt.value = item[valueKey];
    opt.dataset.id = item[valueKey];
    el.appendChild(opt);
  });
}

function renderShippingOptions(options) {
  const container = document.getElementById("shipping-options");
  if (!options?.length) {
    container.innerHTML = "<p>No options available.</p>";
    return;
  }
  container.innerHTML = options
    .map(opt => `
      <label>
        <input type="radio" name="shipping" value="${opt.cost}">
        ${opt.name} (${opt.service}) — Rp ${opt.cost.toLocaleString("id-ID")}
      </label><br/>
    `)
    .join("");
}

function collectFormData() {
  const full_name   = document.getElementById("full_name")?.value.trim();
  const street      = document.getElementById("street_address")?.value.trim();
  const postal_code = document.getElementById("postal_code")?.value.trim();
  const phone       = document.getElementById("phone")?.value.trim();
  const courier     = document.getElementById("courier")?.value;
  const { id: province_id, name: province } = getSelectPair("province");
  const { id: city_id, name: city } = getSelectPair("city");
  const { id: district_id, name: district } = getSelectPair("district");
  const { id: subdistrict_id, name: subdistrict } = getSelectPair("subdistrict");

  const shipping_cost = document.querySelector('input[name="shipping"]:checked')?.value || 0;

  // Retrieve user or guest identity
  const user = JSON.parse(localStorage.getItem("supabase_user") || "null");
  let guest_id = localStorage.getItem("guest_id");
  if (!user?.id && !guest_id) {
    guest_id = crypto.randomUUID();
    localStorage.setItem("guest_id", guest_id);
  }

  return {
    user_id: user?.id || null,
    guest_id,
    full_name,
    street,
    province,
    province_id,
    city,
    city_id,
    district,
    district_id,
    subdistrict,
    subdistrict_id,
    postal_code,
    phone,
    courier,
    shipping_cost
  };
}

function getSelectPair(id) {
  const el = document.getElementById(id);
  const opt = el?.selectedOptions?.[0];
  return {
    id: opt?.dataset?.id || el?.value || "",
    name: opt?.text || ""
  };
}

function validateForm(data) {
  const required = [
    "full_name", "street", "province", "city", "district",
    "postal_code", "phone", "courier"
  ];
  return required.filter(f => !data[f]);
}
