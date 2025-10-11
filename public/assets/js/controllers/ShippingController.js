// public/assets/js/controllers/ShippingController.js
import { ShippingModel } from "../models/ShippingModel.js";
import { OrderSummaryModel } from "../models/OrderSummaryModel.js";

function formatCurrency(value) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function dispatchShippingUpdated() {
  document.dispatchEvent(new Event("shippingUpdated"));
}

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn(`Failed to parse localStorage["${key}"]`, error);
    return null;
  }
}

function writeJSON(key, value) {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.warn(`Failed to write localStorage["${key}"]`, error);
  }
}

export const ShippingController = {
  init() {
    if (this._initialized) return;

    this.container = document.getElementById("shipping-options");
    this.courierSelect = document.getElementById("courier");
    this.districtSelect = document.getElementById("district");
    this.serviceSelect = null;
    this.metaEl = null;
    this.services = [];
    this.currentRequestId = 0;

    this.handleCourierChange = this.handleCourierChange.bind(this);
    this.handleDistrictChange = this.handleDistrictChange.bind(this);
    this.handleServiceChange = this.handleServiceChange.bind(this);

    this.mountServiceDropdown();

    if (this.courierSelect) {
      // Capture phase to override legacy handler once new flow is active
      this.courierSelect.addEventListener("change", this.handleCourierChange, {
        capture: true,
      });
    }

    if (this.districtSelect) {
      this.districtSelect.addEventListener("change", this.handleDistrictChange);
    }

    if (this.serviceSelect) {
      this.serviceSelect.addEventListener("change", this.handleServiceChange);
    }

    this.restoreSelection();
    this._initialized = true;
  },

  mountServiceDropdown() {
    if (!this.container) return;

    if (!this.serviceSelect) {
      this.container.innerHTML = `
        <label for="service" class="shipping-service-label">Select Service</label>
        <select id="service" disabled>
          <option value="">-- Select Service --</option>
        </select>
        <div id="shipping-service-meta" class="shipping-service-meta"></div>
      `;
      this.serviceSelect = document.getElementById("service");
      this.metaEl = document.getElementById("shipping-service-meta");
    }
  },

  async handleCourierChange(event) {
    // Block legacy listener once this handler runs
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();

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

  async handleDistrictChange() {
    this.clearSelection({ emitEvent: true });
    const courier = this.courierSelect?.value;
    const destination = this.districtSelect?.value;
    if (courier && destination) {
      await this.loadServices({ courier, destination });
    } else {
      this.disableServiceSelect();
      this.setMetaMessage("Select courier to view available services.");
    }
  },

  handleServiceChange(event) {
    const serviceKey = event.target.value;
    if (!serviceKey) {
      this.clearSelection({ emitEvent: true });
      return;
    }

    const selected = this.services.find(
      (srv) => `${srv.courier}:${srv.service}` === serviceKey
    );

    if (!selected) {
      console.warn("Selected shipping service not found in cache.");
      this.clearSelection({ emitEvent: true });
      return;
    }

    this.applySelection(selected, { emitEvent: true });
  },

  async loadServices({ courier, destination }) {
    if (!this.serviceSelect) return;

    const requestId = ++this.currentRequestId;
    this.disableServiceSelect();
    this.setMetaMessage("Loading services...");

    try {
      const cart = OrderSummaryModel.getCart();
      const weight =
        OrderSummaryModel.getCartWeight(cart) ||
        1000; // fallback to 1kg when weight missing

      const services = await ShippingModel.fetchServices({
        courier,
        destination,
        weight,
      });

      if (requestId !== this.currentRequestId) {
        // A newer request completed; ignore this result
        return;
      }

      this.services = services || [];
      this.populateServiceOptions();
    } catch (error) {
      console.error("Failed to load shipping services:", error);
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

    // Restore previously selected service when possible
    if (this._savedServiceKey) {
      const match = this.services.find(
        (srv) => `${srv.courier}:${srv.service}` === this._savedServiceKey
      );
      if (match) {
        this.serviceSelect.value = this._savedServiceKey;
        this.applySelection(match, { emitEvent: true });
        return;
      }
    }
  },

  applySelection(service, { emitEvent = false } = {}) {
    const key = `${service.courier}:${service.service}`;
    const label = `${service.courierName || service.courier.toUpperCase()} ${
      service.service
    }`;

    this._savedServiceKey = key;
    localStorage.setItem("shipping_cost", service.cost);
    localStorage.setItem("shipping_service", key);
    writeJSON("shipping_selection_meta", {
      courier: service.courier,
      courierName: service.courierName,
      service: service.service,
      description: service.description,
      etd: service.etd,
      label,
      cost: service.cost,
    });

    this.setMetaMessage(
      `${label}${service.etd ? ` • ETD: ${service.etd}` : ""} • ${formatCurrency(
        service.cost
      )}`
    );

    if (emitEvent) dispatchShippingUpdated();
  },

  clearSelection({ emitEvent = false } = {}) {
    const hadSelection =
      localStorage.getItem("shipping_service") ||
      localStorage.getItem("shipping_cost");

    localStorage.removeItem("shipping_service");
    localStorage.removeItem("shipping_cost");
    writeJSON("shipping_selection_meta", null);
    this._savedServiceKey = "";

    if (this.serviceSelect) {
      this.serviceSelect.value = "";
    }

    if (emitEvent && hadSelection) dispatchShippingUpdated();
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
    const storedMeta = readJSON("shipping_selection_meta");

    if (storedMeta?.label && storedMeta?.cost) {
      this.setMetaMessage(
        `${storedMeta.label}${
          storedMeta.etd ? ` • ETD: ${storedMeta.etd}` : ""
        } • ${formatCurrency(storedMeta.cost)}`
      );
    }

    const courier = this.courierSelect?.value;
    const destination = this.districtSelect?.value;

    if (this._savedServiceKey && courier && destination) {
      // Rehydrate available services silently; selection is applied on resolve
      this.loadServices({ courier, destination });
    }
  },
};
