// public/assets/js/models/ShippingModel.js
const SHIPPING_ENDPOINT = "/.netlify/functions/shipping";

function normalizeArray(maybeArray) {
  if (Array.isArray(maybeArray)) return maybeArray;
  if (maybeArray && typeof maybeArray === "object") {
    return Object.values(maybeArray);
  }
  return [];
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeServices(rawItems = [], targetCourier = "") {
  const items = normalizeArray(rawItems);
  const services = [];

  items.forEach((item) => {
    if (!item) return;

    const courierCode =
      String(
        item.courier_code ||
          item.code ||
          item.courier ||
          item.courierCode ||
          targetCourier ||
          ""
      ).toLowerCase();

    const courierName =
      item.courier_name ||
      item.name ||
      item.courier_name ||
      item.courier ||
      courierCode.toUpperCase();

    const pushService = (srv) => {
      if (!srv) return;

      const serviceCode = String(
        srv.service ||
          srv.code ||
          srv.service_code ||
          srv.serviceCode ||
          item.service ||
          ""
      ).toUpperCase();

      if (!serviceCode) return;

      const description =
        srv.description ||
        srv.service_description ||
        srv.name ||
        srv.label ||
        item.description ||
        serviceCode;

      const costEntry = Array.isArray(srv.cost)
        ? srv.cost[0]
        : srv.cost || srv.price || srv.fee || srv.amount || srv;

      const costValue =
        toNumber(costEntry?.value) ??
        toNumber(costEntry?.price) ??
        toNumber(costEntry?.amount) ??
        toNumber(costEntry);

      if (!Number.isFinite(costValue)) return;

      const etdValue =
        costEntry?.etd ||
        costEntry?.etd_text ||
        costEntry?.estimated ||
        costEntry?.etd_desc ||
        srv.etd ||
        item.etd ||
        "";

      services.push({
        courier: courierCode,
        courierName: courierName || courierCode.toUpperCase(),
        service: serviceCode,
        description: description || serviceCode,
        cost: costValue,
        etd: typeof etdValue === "string" ? etdValue : String(etdValue || ""),
      });
    };

    if (item.service && (item.cost || item.price || item.amount)) {
      pushService(item);
    }

    const bucket =
      item.services ||
      item.costs ||
      item.options ||
      item.detail ||
      item.choices ||
      [];

    normalizeArray(bucket).forEach(pushService);
  });

  return services;
}

async function requestShippingCost(payload) {
  const response = await fetch(SHIPPING_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "cost",
      // Only send defined fields to keep payload clean
      ...Object.entries(payload || {}).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          acc[key] = value;
        }
        return acc;
      }, {}),
    }),
  });

  const json = await response.json().catch(() => ({}));
  console.log("[ShippingModel] Response:", json);

  if (!response.ok) {
    const message =
      json?.message ||
      json?.error ||
      json?.rajaongkir?.error ||
      "Failed to retrieve shipping cost.";
    const error = new Error(message);
    error.status = response.status;
    error.details = json?.details || json;
    throw error;
  }

  return json;
}

export const ShippingModel = {
  /**
   * Fetch services for the selected courier/destination.
   * Returns a flat list of services with cost/etd metadata.
   */
  async fetchServices({ origin, destination, courier, weight = 1000 } = {}) {
    if (!destination || !courier) return [];

    const payload = {
      origin,
      destination,
      courier,
      weight,
    };

    const json = await requestShippingCost(payload);
    const data = json?.data ?? [];

    const services = normalizeServices(data, courier);

    // Sort by cost ascending for consistent UX
    services.sort((a, b) => a.cost - b.cost);

    return services;
  },
};
