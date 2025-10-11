// public/assets/js/models/KomerceShippingModel.js
const BASE_URL =
  "https://api-sandbox.collaborator.komerce.id/order/api/v1/shipping-cost";
const API_KEY =
  (typeof import.meta !== "undefined" &&
    import.meta?.env?.VITE_KOMERCE_API_KEY) ||
  (window.__KOMERCE__ && window.__KOMERCE__.apiKey) ||
  "YOUR_API_KEY";

/**
 * Perform a JSON request against the Komerce Delivery API.
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function komerceRequest(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 || res.status === 404) {
      console.error(
        `[KomerceShippingModel] HTTP ${res.status} - ${res.statusText}`,
        payload
      );
    }
    const message =
      payload?.message ||
      payload?.error ||
      res.statusText ||
      "Komerce request failed";
    throw new Error(message);
  }
  return payload;
}

/**
 * Normalize Komerce responses so the downstream shipping UI can stay unchanged.
 * @param {any} json
 * @returns {{ rajaongkir: { results: any[] } }}
 */
function normalizeResults(json) {
  const results =
    json?.data?.rajaongkir?.results ??
    json?.data?.results ??
    json?.data ??
    json?.results ??
    [];

  return {
    rajaongkir: {
      results: Array.isArray(results) ? results : [results],
    },
  };
}

/**
 * Convert Komerce shipping-cost response into a flat service array.
 * @param {any} json
 * @param {string} courier
 * @returns {Array<{
 *  courier: string,
 *  courierName: string,
 *  service: string,
 *  description: string,
 *  cost: number,
 *  etd: string
 * }>}
 */
function normalizeServices(json, courier = "") {
  const collections =
    json?.data?.rajaongkir?.results ??
    json?.data?.results ??
    json?.data ??
    [];

  const list = Array.isArray(collections) ? collections : [collections];
  const services = [];

  list.forEach((entry) => {
    const courierCode =
      (entry?.code || entry?.courier || courier || "").toString().toLowerCase();
    const courierName =
      entry?.name || entry?.courier_name || courierCode.toUpperCase();

    const rawServices =
      entry?.costs || entry?.services || entry?.service || entry || [];

    (Array.isArray(rawServices) ? rawServices : [rawServices]).forEach(
      (service) => {
        if (!service) return;
        const serviceCode = String(
          service?.service ||
            service?.code ||
            service?.service_code ||
            entry?.service ||
            ""
        ).toUpperCase();
        if (!serviceCode) return;

        const costEntry = Array.isArray(service?.cost)
          ? service.cost[0]
          : service?.cost || service;
        const costValue = Number(
          costEntry?.value ??
            costEntry?.price ??
            costEntry?.amount ??
            costEntry?.cost ??
            costEntry
        );
        if (!Number.isFinite(costValue)) return;

        services.push({
          courier: courierCode,
          courierName,
          service: serviceCode,
          description:
            service?.description ||
            service?.service_description ||
            entry?.description ||
            serviceCode,
          cost: costValue,
          etd:
            costEntry?.etd ||
            costEntry?.etd_text ||
            service?.etd ||
            entry?.etd ||
            "",
        });
      }
    );
  });

  services.sort((a, b) => a.cost - b.cost);
  return services;
}

export const KomerceShippingModel = {
  /**
   * Fetch the list of provinces from Komerce Delivery API.
   */
  async fetchProvincesKomerce() {
    try {
      const json = await komerceRequest("/province", { method: "GET" });
      return normalizeResults(json);
    } catch (error) {
      console.error("[KomerceShippingModel.fetchProvincesKomerce]", error);
      throw error;
    }
  },

  /**
   * Fetch the cities for a given province.
   * @param {string} provinceId
   */
  async fetchCitiesKomerce(provinceId) {
    try {
      const json = await komerceRequest(
        `/city?province_id=${encodeURIComponent(provinceId)}`,
        { method: "GET" }
      );
      return normalizeResults(json);
    } catch (error) {
      console.error("[KomerceShippingModel.fetchCitiesKomerce]", error);
      throw error;
    }
  },

  /**
   * Fetch the subdistricts for a given city.
   * @param {string} cityId
   */
  async fetchSubdistrictsKomerce(cityId) {
    try {
      const json = await komerceRequest(
        `/subdistrict?city_id=${encodeURIComponent(cityId)}`,
        { method: "GET" }
      );
      return normalizeResults(json);
    } catch (error) {
      console.error("[KomerceShippingModel.fetchSubdistrictsKomerce]", error);
      throw error;
    }
  },

  /**
   * Calculate shipping cost for the selected courier/service.
   * @param {{origin: string, destination: string, weight: number, courier: string}} payload
   */
  async fetchCostKomerce(payload) {
    try {
      const json = await komerceRequest("", {
        method: "POST",
        body: JSON.stringify({
          origin: payload?.origin,
          destination: payload?.destination,
          weight: payload?.weight,
          courier: payload?.courier,
        }),
      });
      return normalizeServices(json, payload?.courier);
    } catch (error) {
      console.error("[KomerceShippingModel.fetchCostKomerce]", error);
      throw error;
    }
  },
};

// TODO: integrate Komerce pickup, label, and tracking endpoints in a future phase.
