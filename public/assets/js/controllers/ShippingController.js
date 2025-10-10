import ShippingModel from "../models/ShippingModel.js";

const ShippingController = (() => {
  let courierSelect;
  let serviceSelect;
  let currentCourier = "";
  let isFetching = false;

  const init = () => {
    courierSelect = document.getElementById("courier");
    serviceSelect = document.getElementById("service");

    if (!courierSelect || !serviceSelect) {
      console.warn(
        "ShippingController: Required select elements are missing on the page."
      );
      return;
    }

    courierSelect.addEventListener("change", handleCourierChange);
    serviceSelect.addEventListener("change", handleServiceChange);

    hydrateFromStorage();

    if (courierSelect.value) {
      handleCourierChange();
    }
  };

  const hydrateFromStorage = () => {
    const storedService = localStorage.getItem("shipping_service");
    const storedCost = localStorage.getItem("shipping_cost");

    if (storedService && storedCost) {
      const [courier, service] = storedService.split(":");
      if (courier) {
        courierSelect.value = courier;
      }

      if (service) {
        setTimeout(() => {
          const option = [...serviceSelect.options].find(
            (opt) => opt.value === service
          );
          if (option) {
            serviceSelect.value = service;
          }
        });
      }
    }
  };

  const handleCourierChange = async () => {
    if (!courierSelect) return;
    const courier = courierSelect.value;
    currentCourier = courier;

    resetServiceSelect();

    if (!courier) {
      clearShippingSelection();
      return;
    }

    const params = getCheckoutParams(courier);
    if (!params) {
      clearShippingSelection();
      return;
    }

    try {
      setServiceLoading(true);
      isFetching = true;
      const options = await ShippingModel.getShippingOptions(params);
      populateServiceOptions(options);
      restoreStoredService();
    } catch (error) {
      console.error("Unable to load shipping options:", error);
      showServiceError("Failed to load services");
    } finally {
      isFetching = false;
      setServiceLoading(false);
    }
  };

  const handleServiceChange = () => {
    if (!serviceSelect) return;

    const selectedOption = serviceSelect.selectedOptions[0];
    if (!selectedOption || !selectedOption.value) {
      clearShippingSelection();
      return;
    }

    const cost = Number(selectedOption.dataset.cost ?? 0);
    localStorage.setItem("shipping_cost", String(cost));
    localStorage.setItem(
      "shipping_service",
      `${currentCourier}:${selectedOption.value}`
    );

    document.dispatchEvent(new Event("shippingUpdated"));
  };

  const getCheckoutParams = (courier) => {
    const origin = courierSelect.dataset.origin || getValueById("origin");
    const destination =
      courierSelect.dataset.destination || getValueById("destination");
    const weight = courierSelect.dataset.weight || getValueById("weight");

    if (!origin || !destination || !weight) {
      console.warn("ShippingController: Missing origin, destination, or weight.");
      return null;
    }

    return {
      origin,
      destination,
      weight,
      courier,
    };
  };

  const getValueById = (id) => {
    const element = document.getElementById(id);
    if (!element) return null;
    if (element.value) return element.value;
    if (element.dataset?.value) return element.dataset.value;
    return element.textContent?.trim() || null;
  };

  const resetServiceSelect = () => {
    if (!serviceSelect) return;
    serviceSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = isFetching ? "Loading..." : "Select a service";
    serviceSelect.appendChild(placeholder);
    serviceSelect.value = "";
    serviceSelect.disabled = true;
  };

  const populateServiceOptions = (options = []) => {
    resetServiceSelect();

    if (!options.length) {
      showServiceError("No services available");
      return;
    }

    serviceSelect.disabled = false;
    serviceSelect.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select a service";
    serviceSelect.appendChild(defaultOption);

    const currencyFormatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    });

    options.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option.service;
      opt.dataset.cost = option.cost;
      opt.dataset.description = option.description ?? "";
      opt.dataset.etd = option.etd ?? "";
      opt.textContent = `${option.service} - ${currencyFormatter.format(
        option.cost
      )}${option.etd ? ` (ETD: ${option.etd})` : ""}`;
      serviceSelect.appendChild(opt);
    });
  };

  const showServiceError = (message) => {
    if (!serviceSelect) return;
    serviceSelect.innerHTML = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = message;
    serviceSelect.appendChild(option);
    serviceSelect.disabled = true;
    clearShippingSelection();
  };

  const setServiceLoading = (loading) => {
    if (!serviceSelect) return;
    serviceSelect.disabled = loading;
    if (loading) {
      serviceSelect.innerHTML = "";
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Loading services...";
      serviceSelect.appendChild(option);
    }
  };

  const clearShippingSelection = () => {
    localStorage.removeItem("shipping_cost");
    localStorage.removeItem("shipping_service");
    document.dispatchEvent(new Event("shippingUpdated"));
  };

  const restoreStoredService = () => {
    const storedService = localStorage.getItem("shipping_service");
    const storedCost = localStorage.getItem("shipping_cost");

    if (!storedService || !storedCost) return;

    const [courier, service] = storedService.split(":");
    if (courier !== currentCourier) return;

    const option = [...serviceSelect.options].find(
      (opt) => opt.value === service
    );

    if (option) {
      const cost = Number(option.dataset.cost ?? 0);
      localStorage.setItem("shipping_cost", String(cost));
      serviceSelect.value = service;
      option.selected = true;
      document.dispatchEvent(new Event("shippingUpdated"));
    }
  };

  return {
    init,
  };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => ShippingController.init());
} else {
  ShippingController.init();
}

export default ShippingController;
