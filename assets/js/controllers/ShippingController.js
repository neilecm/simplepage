const courierSelect = document.getElementById("courier");
const serviceSelect = document.getElementById("service");
const provinceSelect = document.getElementById("province");
const citySelect = document.getElementById("city");
const districtSelect = document.getElementById("district");

if (!courierSelect || !serviceSelect) {
  console.warn("checkout: shipping selects are missing; RajaOngkir logic will not attach");
}

const FALLBACK_OPTIONS = [
  {
    code: "jne",
    name: "JNE",
    services: [
      { code: "REG", name: "Regular", cost: 20000, etd: "2-3 days" },
      { code: "YES", name: "Yakin Esok Sampai", cost: 38000, etd: "1 day" },
    ],
  },
  {
    code: "sicepat",
    name: "SiCepat",
    services: [
      { code: "REG", name: "SiUntung", cost: 19000, etd: "2-3 days" },
      { code: "BEST", name: "Best", cost: 34000, etd: "1-2 days" },
    ],
  },
  {
    code: "anteraja",
    name: "AnterAja",
    services: [
      { code: "REG", name: "Regular", cost: 21000, etd: "2-3 days" },
      { code: "NEXT", name: "Next Day", cost: 36000, etd: "1 day" },
    ],
  },
];

const FALLBACK_LOCATIONS = [
  {
    id: "31",
    name: "DKI Jakarta",
    cities: [
      {
        id: "3173",
        name: "Jakarta Selatan",
        districts: [
          { id: "317302", name: "Kebayoran Lama", postalCode: "12240" },
          { id: "317303", name: "Kebayoran Baru", postalCode: "12130" },
          { id: "317305", name: "Mampang Prapatan", postalCode: "12790" },
        ],
      },
      {
        id: "3171",
        name: "Jakarta Pusat",
        districts: [
          { id: "317103", name: "Gambir", postalCode: "10110" },
          { id: "317106", name: "Menteng", postalCode: "10310" },
        ],
      },
    ],
  },
  {
    id: "32",
    name: "Jawa Barat",
    cities: [
      {
        id: "3273",
        name: "Kota Bandung",
        districts: [
          { id: "327325", name: "Coblong", postalCode: "40132" },
          { id: "327322", name: "Lengkong", postalCode: "40261" },
        ],
      },
      {
        id: "3204",
        name: "Kabupaten Bandung",
        districts: [
          { id: "320404", name: "Banjaran", postalCode: "40377" },
          { id: "320409", name: "Cileunyi", postalCode: "40622" },
        ],
      },
    ],
  },
];

const shippingState = {
  options: [],
  selection: null,
  loading: false,
  locations: FALLBACK_LOCATIONS,
};

function readAddressPayload() {
  try {
    return JSON.parse(localStorage.getItem("checkout:address") || "null");
  } catch (error) {
    console.warn("shipping: unable to parse checkout address", error);
    return null;
  }
}

function readCart() {
  try {
    return JSON.parse(localStorage.getItem("cart") || "null") || [];
  } catch (error) {
    console.warn("shipping: unable to parse cart", error);
    return [];
  }
}

function getPayloadForApi() {
  const address = readAddressPayload();
  if (!address) {
    return null;
  }
  if (!address.province || !address.city || !address["postal-code"]) {
    return null;
  }
  const cart = readCart();
  return {
    destination: {
      province: address.province,
      city: address.city,
      district: address.district,
      postalCode: address["postal-code"],
    },
    courier: address.courier,
    service: address.service,
    cart,
  };
}

function formatServiceLabel(service) {
  if (!service) {
    return "Select service";
  }
  const cost = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(service.cost) || 0);
  return `${service.name} – ${cost}${service.etd ? ` (${service.etd})` : ""}`;
}

function clearOptions(select) {
  if (!select) {
    return;
  }
  while (select.options.length > 1) {
    select.remove(1);
  }
}

function populateProvinces(locations) {
  if (!provinceSelect) {
    return;
  }
  const previous = provinceSelect.value;
  clearOptions(provinceSelect);
  locations.forEach((province) => {
    const option = document.createElement("option");
    option.value = province.id;
    option.textContent = province.name;
    provinceSelect.appendChild(option);
  });
  if (locations.some((province) => province.id === previous)) {
    provinceSelect.value = previous;
  } else {
    provinceSelect.value = "";
  }
}

function populateCities(provinceId) {
  if (!citySelect) {
    return;
  }
  const province = shippingState.locations.find((item) => item.id === provinceId);
  const cities = province?.cities || [];
  const previous = citySelect.value;
  clearOptions(citySelect);
  cities.forEach((city) => {
    const option = document.createElement("option");
    option.value = city.id;
    option.textContent = city.name;
    citySelect.appendChild(option);
  });
  if (cities.some((city) => city.id === previous)) {
    citySelect.value = previous;
  } else {
    citySelect.value = "";
  }
  populateDistricts(provinceId, citySelect.value);
}

function populateDistricts(provinceId, cityId) {
  if (!districtSelect) {
    return;
  }
  const province = shippingState.locations.find((item) => item.id === provinceId);
  const city = province?.cities?.find((item) => item.id === cityId);
  const districts = city?.districts || [];
  const previous = districtSelect.value;
  clearOptions(districtSelect);
  districts.forEach((district) => {
    const option = document.createElement("option");
    option.value = district.id;
    option.textContent = district.name;
    option.dataset.postalCode = district.postalCode || "";
    districtSelect.appendChild(option);
  });
  if (districts.some((district) => district.id === previous)) {
    districtSelect.value = previous;
  } else {
    districtSelect.value = "";
  }
}

function restoreSavedLocations() {
  const address = readAddressPayload();
  if (!address) {
    return;
  }
  if (provinceSelect && address.province) {
    provinceSelect.value = address.province;
  }
  populateCities(provinceSelect?.value || address.province || "");
  if (citySelect && address.city) {
    citySelect.value = address.city;
  }
  populateDistricts(provinceSelect?.value || address.province || "", citySelect?.value || address.city || "");
  if (districtSelect && address.district) {
    districtSelect.value = address.district;
  }
  if (address["postal-code"]) {
    const postalField = document.getElementById("postal-code");
    if (postalField && !postalField.value) {
      postalField.value = address["postal-code"];
    }
  }
}

function populateCouriers(options) {
  if (!courierSelect) {
    return;
  }
  const previous = courierSelect.value;
  clearOptions(courierSelect);
  options.forEach((option) => {
    const element = document.createElement("option");
    element.value = option.code;
    element.textContent = option.name;
    courierSelect.appendChild(element);
  });
  if (options.some((option) => option.code === previous)) {
    courierSelect.value = previous;
  } else {
    courierSelect.value = "";
  }
}

function populateServices(services) {
  if (!serviceSelect) {
    return;
  }
  const previous = serviceSelect.value;
  clearOptions(serviceSelect);
  services.forEach((service) => {
    const element = document.createElement("option");
    element.value = service.code;
    element.textContent = formatServiceLabel(service);
    element.dataset.cost = String(service.cost);
    element.dataset.etd = service.etd || "";
    serviceSelect.appendChild(element);
  });
  if (services.some((service) => service.code === previous)) {
    serviceSelect.value = previous;
  } else {
    serviceSelect.value = "";
  }
}

function getSelectedCourier() {
  if (!courierSelect) {
    return null;
  }
  return shippingState.options.find((option) => option.code === courierSelect.value) || null;
}

function getSelectedService() {
  const courier = getSelectedCourier();
  if (!courier || !serviceSelect) {
    return null;
  }
  return courier.services.find((service) => service.code === serviceSelect.value) || null;
}

function dispatchSelection(selection) {
  if (!selection) {
    return;
  }
  localStorage.setItem("checkout:shipping", JSON.stringify(selection));
  window.dispatchEvent(
    new CustomEvent("checkout:shipping-selected", { detail: selection })
  );
}

async function fetchLocations() {
  try {
    const response = await fetch("/.netlify/functions/shipping-locations");
    if (!response.ok) {
      throw new Error("Unable to load locations from server");
    }
    const data = await response.json();
    if (Array.isArray(data?.provinces) && data.provinces.length > 0) {
      shippingState.locations = data.provinces;
      populateProvinces(shippingState.locations);
      return;
    }
  } catch (error) {
    console.warn("shipping: falling back to static location list", error);
  }
  populateProvinces(shippingState.locations);
}

function handleCourierChange() {
  const courier = getSelectedCourier();
  if (courier) {
    populateServices(courier.services || []);
  } else {
    populateServices([]);
  }
  serviceSelect?.dispatchEvent(new Event("change"));
}

function handleServiceChange() {
  const service = getSelectedService();
  if (!service) {
    return;
  }
  const courier = getSelectedCourier();
  const selection = {
    courier: courier?.code || "",
    courierName: courier?.name || courier?.code || "",
    service: service.code,
    serviceName: service.name,
    cost: Number(service.cost) || 0,
    etd: service.etd || "",
  };
  shippingState.selection = selection;
  dispatchSelection(selection);
}

async function fetchShippingOptions() {
  const payload = getPayloadForApi();
  if (!payload) {
    return null;
  }
  try {
    const response = await fetch("/.netlify/functions/shipping-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error("Shipping API responded with an error");
    }
    const data = await response.json();
    return Array.isArray(data?.options) && data.options.length > 0
      ? data.options
      : null;
  } catch (error) {
    console.warn("shipping: failed to fetch live RajaOngkir rates", error);
    return null;
  }
}

async function refreshOptions() {
  if (!courierSelect || !serviceSelect) {
    return;
  }
  if (shippingState.loading) {
    return;
  }
  shippingState.loading = true;
  const liveOptions = await fetchShippingOptions();
  shippingState.loading = false;
  shippingState.options = liveOptions || FALLBACK_OPTIONS;
  populateCouriers(shippingState.options);
  const selectedCourier = getSelectedCourier();
  if (selectedCourier) {
    populateServices(selectedCourier.services || []);
  } else {
    populateServices([]);
  }
  if (selectedCourier && serviceSelect?.value) {
    handleServiceChange();
  } else {
    const saved = localStorage.getItem("checkout:shipping");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.courier && parsed?.service) {
          courierSelect.value = parsed.courier;
          populateServices(
            shippingState.options.find((option) => option.code === parsed.courier)?.services || []
          );
          serviceSelect.value = parsed.service;
          handleServiceChange();
        }
      } catch (error) {
        console.warn("shipping: unable to restore saved selection", error);
      }
    }
  }
}

function addressFieldsReady() {
  const address = readAddressPayload();
  return (
    !!address?.province &&
    !!address?.city &&
    !!address?.district &&
    !!address?.["postal-code"]
  );
}

let debounceTimer = null;

function scheduleRefresh() {
  if (!addressFieldsReady()) {
    return;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(refreshOptions, 300);
}

courierSelect?.addEventListener("change", handleCourierChange);
serviceSelect?.addEventListener("change", handleServiceChange);
provinceSelect?.addEventListener("change", (event) => {
  populateCities(event.target.value);
  populateDistricts(event.target.value, citySelect?.value || "");
});
citySelect?.addEventListener("change", (event) => {
  populateDistricts(provinceSelect?.value || "", event.target.value);
});
districtSelect?.addEventListener("change", (event) => {
  const option = event.target.selectedOptions?.[0];
  const postalCodeField = document.getElementById("postal-code");
  if (option?.dataset.postalCode && postalCodeField && !postalCodeField.value) {
    postalCodeField.value = option.dataset.postalCode;
  }
});

window.addEventListener("checkout:address-updated", scheduleRefresh);
window.addEventListener("checkout:address-initialized", scheduleRefresh);

// Kick off initial load when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    fetchLocations().then(() => {
      restoreSavedLocations();
      scheduleRefresh();
    });
  });
} else {
  fetchLocations().then(() => {
    restoreSavedLocations();
    scheduleRefresh();
  });
}
