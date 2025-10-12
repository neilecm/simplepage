// public/assets/js/models/KomerceOrderModel.js

const PICKUP_ENDPOINT = "/.netlify/functions/create-komerce-pickup";
const LABEL_ENDPOINT = "/.netlify/functions/create-komerce-label";

/**
 * Helper to perform JSON POST requests to Netlify proxies.
 * @param {string} url
 * @param {object} payload
 */
async function postJSON(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || response.statusText;
    throw new Error(message);
  }
  return data;
}

/**
 * Request Komerce courier pickup for one or more orders.
 * @param {{ date: string, time: string, vehicle: string, orders: any[] }} payload
 * @returns {Promise<{ status: string, awb: string|null, label_url: string|null, raw: any }>}
 */
async function requestPickup(payload) {
  const json = await postJSON(PICKUP_ENDPOINT, payload);
  const awb =
    json?.data?.awb ||
    json?.data?.order_no ||
    json?.awb ||
    json?.order_no ||
    null;

  return {
    status: json?.status || json?.message || "success",
    awb,
    label_url: json?.data?.label_url || null,
    raw: json,
  };
}

/**
 * Ask Komerce to generate a printable label for an order.
 * @param {{ order_no: string, page?: string }} payload
 * @returns {Promise<{ status: string, awb: string|null, label_url: string|null, raw: any }>}
 */
async function generateLabel(payload) {
  const json = await postJSON(LABEL_ENDPOINT, payload);
  const awb = payload?.order_no || json?.data?.awb || null;

  let labelUrl =
    json?.data?.label_url ||
    json?.data?.url ||
    json?.data?.file_url ||
    null;

  const base64 =
    json?.data?.label_pdf ||
    json?.data?.label ||
    json?.data?.file ||
    null;

  if (!labelUrl && typeof base64 === "string") {
    labelUrl = `data:application/pdf;base64,${base64}`;
  }

  return {
    status: json?.status || json?.message || "success",
    awb,
    label_url: labelUrl,
    raw: json,
  };
}

export const KomerceOrderModel = {
  requestPickup,
  generateLabel,
};

// TODO: extend KomerceOrderModel with tracking/history helpers in future phases.
