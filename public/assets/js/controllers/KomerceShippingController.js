// public/assets/js/controllers/KomerceShippingController.js
import { KomerceShippingModel } from "../models/KomerceShippingModel.js";
import { OrderSummaryModel } from "../models/OrderSummaryModel.js";

function formatCurrency(value) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function dispatchShippingUpdated(detail = {}) {
  document.dispatchEvent(
    new CustomEvent("shippingUpdated", {
      detail,
    })
  );
}

function toArray(data) {
  if (Array.isArray(data)) return data;
  if (!data) return [];
  if (Array.isArray(data?.rajaongkir?.results))
    return data.rajaongkir.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return Object.values(data);
}

function pickValue(item, ...keys) {
  for (const key of keys) {
    if (item?.[key]) return item[key];
  }
  return "";
}

export const KomerceShippingController = {
  /**
   * Initialize Komerce shipping flow and load initial lists.
   */
  async init() {
    if (this._initialized) return;

    this.container = document.getElementById("shipping-options");
    this.provinceSelect = document.getElementById("province");
    this.citySelect = document.getElementById("city");
    this.districtSelect = document.getElementById("district");
    this.subdistrictSelect = document.getElementById("subdistrict");
    this.courierSelect = document.getElementById("courier");
    this.serviceSelect = null;
    this.metaEl = null;
    this.services = [];
    this.currentRequestId = 0;

    this.handleProvinceChange = this.handleProvinceChange.bind(this);
    this.handleCityChange = this.handleCityChange.bind(this);
    this.handleDistrictChange = this.handleDistrictChange.bind(this);
    this.handleCourierChange = this.handleCourierChange.bind(this);
    this.handleServiceChange = this.handleServiceChange.bind(this);

    this.mountServiceDropdown();
    this.bindEvents();

    await this.loadProvinces();
    this.restoreSelection();

    this._initialized = true;
    console.log("[KomerceShippingController] Initialized");
  },

  mountServiceDropdown() {
    if (!this.container || this.serviceSelect) return;

    this.container.innerHTML = `
      <label for="service" class="shipping-service-label">Select Service</label>
      <select id="service" disabled>
        <option value="">-- Select Service --</option>
      </select>
      <div id="shipping-service-meta" class="shipping-service-meta"></div>
    `;

    this.serviceSelect = document.getElementById("service");
    this.metaEl = document.getElementById("shipping-service-meta");
  },

  bindEvents() {
    this.provinceSelect?.addEventListener("change", this.handleProvinceChange, {
      capture: true,
    });
    this.citySelect?.addEventListener("change", this.handleCityChange, {
      capture: true,
    });
    this.districtSelect?.addEventListener(
      "change",
      this.handleDistrictChange,
      true
    );
    this.courierSelect?.addEventListener("change", this.handleCourierChange, {
      capture: true,
    });
    this.serviceSelect?.addEventListener("change", this.handleServiceChange);
  },

  async loadProvinces() {
    if (!this.provinceSelect) return;
    try {
      this.setMetaMessage("Loading provinces…");
      const res = await KomerceShippingModel.fetchProvincesKomerce();
      this.populateSelect(this.provinceSelect, res, {
        text: ["province_name", "name"],
        value: ["province_id", "id"],
      });
      this.setMetaMessage("");
    } catch (error) {
      console.error("[KomerceShippingController.loadProvinces]", error);
      this.setMetaMessage("Unable to load provinces. Please refresh or retry.");
    }
  },

  async handleProvinceChange(event) {
    event.stopPropagation();
    const provinceId = event.target.value;
    this.populateSelect(this.citySelect, [], {});
    this.populateSelect(this.districtSelect, [], {});
    this.populateSelect(this.subdistrictSelect, [], {});
    this.clearSelection({ emitEvent: true });
    if (!provinceId) return;

    try {
      this.setMetaMessage("Loading cities…");
      const res = await KomerceShippingModel.fetchCitiesKomerce(provinceId);
      this.populateSelect(this.citySelect, res, {
        text: ["city_name", "name"],
        value: ["city_id", "id"],
      });
      this.setMetaMessage("");
    } catch (error) {
      console.error("[KomerceShippingController.handleProvinceChange]", error);
      this.setMetaMessage("Failed to load cities.");
    }
  },

  async handleCityChange(event) {
    event.stopPropagation();
    const cityId = event.target.value;
    this.populateSelect(this.districtSelect, [], {});
    this.populateSelect(this.subdistrictSelect, [], {});
    this.clearSelection({ emitEvent: true });
    if (!cityId) return;

    try {
      this.setMetaMessage("Loading districts…");
      const res = await KomerceShippingModel.fetchSubdistrictsKomerce(cityId);
      this.populateSelect(this.districtSelect, res, {
        text: ["subdistrict_name", "district_name", "name"],
        value: ["subdistrict_id", "district_id", "id"],
      });
      this.setMetaMessage("");
    } catch (error) {
      console.error("[KomerceShippingController.handleCityChange]", error);
      this.setMetaMessage("Failed to load districts.");
    }
  },

  async handleDistrictChange(event) {
    event.stopPropagation();
    this.clearSelection({ emitEvent: true });
    if (!this.courierSelect?.value) {
      this.disableServiceSelect();
      this.setMetaMessage("Select courier to view available services.");
      return;
    }
    await this.loadServices({
      courier: this.courierSelect.value,
      destination: event.target.value,
    });
  },

  async handleCourierChange(event) {
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    const courier = event.target.value;
    const destination = this.districtSelect?.value;

    this.clearSelection({ emitEvent: true });

    if (!courier || !destination) {
      this.setMetaMessage(
        destination
          ? "Select a courier to see available services."
          : "Please choose a district first."
      );
      this.disableServiceSelect();
      return;
    }

    await this.loadServices({ courier, destination });
  },

  async loadServices({ courier, destination }) {
    if (!this.serviceSelect || !courier || !destination) return;

    const requestId = ++this.currentRequestId;
    this.disableServiceSelect();
    this.setMetaMessage("Loading services…");

    try {
      const cart = OrderSummaryModel.getCart();
      const weight = OrderSummaryModel.getCartWeight(cart) || 1000;

      const services = await KomerceShippingModel.fetchCostKomerce({
        origin:
          (window.__KOMERCE__ && window.__KOMERCE__.origin) ||
          localStorage.getItem("komerce_origin") ||
          "",
        destination,
        weight,
        courier,
      });

      if (requestId !== this.currentRequestId) return;

      this.services = services || [];
      this.populateServiceOptions();
    } catch (error) {
      console.error("[KomerceShippingController.loadServices]", error);
      this.services = [];
      this.disableServiceSelect();
      this.setMetaMessage(
        error?.message || "Unable to load services. Please try again."
      );
    }
  },

  populateServiceOptions() {
    if (!this.serviceSelect) return;

    this.serviceSelect.innerHTML =
      '<option value="">-- Select Service --</option>';

    if (!this.services.length) {
      this.disableServiceSelect();
      this.setMetaMessage("No services available for the selected courier.");
      return;
    }

    this.services.forEach((srv) => {
      const option = document.createElement("option");
      option.value = `${srv.courier}:${srv.service}`;
      option.dataset.cost = srv.cost;
      option.dataset.courier = srv.courier;
      option.dataset.service = srv.service;
      option.dataset.description = srv.description;
      option.dataset.etd = srv.etd || "";
      option.textContent = `${srv.service} - ${srv.description} — ${formatCurrency(
        srv.cost
      )}${srv.etd ? ` (ETD: ${srv.etd})` : ""}`;
      this.serviceSelect.appendChild(option);
    });

    this.serviceSelect.disabled = false;
    this.setMetaMessage("Select a shipping service to continue.");

    if (this._savedServiceKey) {
      const match = this.services.find(
        (srv) => `${srv.courier}:${srv.service}` === this._savedServiceKey
      );
      if (match) {
        this.serviceSelect.value = this._savedServiceKey;
        this.applySelection(match, { emitEvent: true });
      }
    }
  },

  applySelection(service, { emitEvent = false } = {}) {
    const key = `${service.courier}:${service.service}`;
    const label = `${service.courierName || service.courier.toUpperCase()} ${
      service.service
    }`.trim();

    this._savedServiceKey = key;
    localStorage.setItem("shipping_cost", String(service.cost));
    localStorage.setItem("shipping_service", key);
    localStorage.setItem(
      "shipping_selection_meta",
      JSON.stringify({
        courier: service.courier,
        courierName: service.courierName,
        service: service.service,
        description: service.description,
        etd: service.etd,
        label,
        cost: service.cost,
        provider: "komerce",
      })
    );

    this.setMetaMessage(
      `${label}${service.etd ? ` • ETD: ${service.etd}` : ""} • ${formatCurrency(
        service.cost
      )}`
    );

    if (emitEvent) dispatchShippingUpdated({ cost: service.cost, provider: "komerce" });
  },

  clearSelection({ emitEvent = false } = {}) {
    const hadSelection =
      localStorage.getItem("shipping_service") ||
      localStorage.getItem("shipping_cost");

    localStorage.removeItem("shipping_service");
    localStorage.removeItem("shipping_cost");
    localStorage.removeItem("shipping_selection_meta");
    this._savedServiceKey = "";

    if (this.serviceSelect) {
      this.serviceSelect.value = "";
    }

    if (emitEvent && hadSelection) dispatchShippingUpdated({ cost: 0, provider: "komerce" });
  },

  disableServiceSelect() {
    if (!this.serviceSelect) return;
    this.serviceSelect.disabled = true;
    this.serviceSelect.innerHTML =
      '<option value="">-- Select Service --</option>';
  },

  setMetaMessage(message) {
    if (!this.metaEl) return;
    this.metaEl.textContent = message || "";
  },

  restoreSelection() {
    this._savedServiceKey = localStorage.getItem("shipping_service") || "";
    const storedMeta = (() => {
      try {
        return JSON.parse(localStorage.getItem("shipping_selection_meta"));
      } catch {
        return null;
      }
    })();

    if (storedMeta?.label && storedMeta?.cost) {
      this.setMetaMessage(
        `${storedMeta.label}${
          storedMeta.etd ? ` • ETD: ${storedMeta.etd}` : ""
        } • ${formatCurrency(storedMeta.cost)}`
      );
    }
  },

  populateSelect(select, response, map) {
    if (!select) return;
    const items = toArray(response);
    select.innerHTML = '<option value="">-- Select --</option>';

    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = pickValue(item, ...(map.value || ["id"]));
      option.textContent =
        pickValue(item, ...(map.text || ["name"])) || option.value;
      option.dataset.raw = JSON.stringify(item);
      select.appendChild(option);
    });
  },
};

// TODO: Extend Komerce integration with pickup/label/tracking endpoints.
