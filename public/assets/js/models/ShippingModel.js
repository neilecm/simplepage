const API_URL = "https://rajaongkir.komerce.id/api/v1/calculate/district/domestic-cost";

const ShippingModel = {
  availableServices: [],

  async getShippingOptions({ origin, destination, weight, courier }) {
    if (!origin || !destination || !weight || !courier) {
      this.availableServices = [];
      return [];
    }

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const apiKey = resolveApiKey();
    if (apiKey) {
      headers.key = apiKey;
    } else {
      console.warn("RajaOngkir API key is missing. Request may fail.");
    }

    const body = new URLSearchParams({
      origin: String(origin),
      destination: String(destination),
      weight: String(weight),
      courier: String(courier),
    });

    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(
        `Failed to fetch shipping options (${response.status} ${response.statusText}): ${errorText}`
      );
    }

    const payload = await response.json();
    const services = Array.isArray(payload?.data)
      ? payload.data.map((item) => ({
          service: item.service,
          description: item.description,
          cost: Number(item.cost ?? 0),
          etd: item.etd,
        }))
      : [];

    this.availableServices = services;
    return services;
  },
};

function resolveApiKey() {
  if (typeof window !== "undefined") {
    if (window.RAJAONGKIR_DELIVERY_KEY) return window.RAJAONGKIR_DELIVERY_KEY;
    if (window.__APP_CONFIG__?.RAJAONGKIR_DELIVERY_KEY)
      return window.__APP_CONFIG__.RAJAONGKIR_DELIVERY_KEY;

    const meta = document.querySelector(
      "meta[name='rajaongkir-delivery-key']"
    );
    if (meta?.content) return meta.content;
  }

  if (typeof process !== "undefined" && process?.env?.RAJAONGKIR_DELIVERY_KEY) {
    return process.env.RAJAONGKIR_DELIVERY_KEY;
  }

  return null;
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch (error) {
    console.warn("Unable to read error response:", error);
    return "";
  }
}

export default ShippingModel;
