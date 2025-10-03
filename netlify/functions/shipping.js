// netlify/functions/shipping.js

const BASE_URL = "https://rajaongkir.komerce.id/api/v1";
const API_KEY = process.env.RAJAONGKIR_API_KEY;
const DELIVERY_KEY = process.env.RAJAONGKIR_DELIVERY_KEY; // if you use delivery tracking

exports.handler = async (event) => {
  try {
    const { type } = event.queryStringParameters || {};
    let url = "";
    let options = { headers: { key: API_KEY } };

    // ---- Provinces ----
    if (type === "province") {
      url = `${BASE_URL}/destination/province`;
      options.method = "GET";
    }

    // ---- Cities (by province ID) ----
    else if (type === "city") {
      const { province } = event.queryStringParameters || {};
      if (!province) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing province parameter" }) };
      }
      url = `${BASE_URL}/destination/city/${encodeURIComponent(province)}`;
      options.method = "GET";
    }

    // ---- Districts (by city ID) ----
    else if (type === "district") {
      const { city } = event.queryStringParameters || {};
      if (!city) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing city parameter" }) };
      }
      url = `${BASE_URL}/destination/district/${encodeURIComponent(city)}`;
      options.method = "GET";
    }

    // ---- Subdistricts (by district ID) ----
    else if (type === "subdistrict") {
      const { district } = event.queryStringParameters || {};
      if (!district) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing district parameter" }) };
      }
      // NOTE: endpoint is sub-district with a hyphen
      url = `${BASE_URL}/destination/sub-district/${encodeURIComponent(district)}`;
      options.method = "GET";
    }

    // ---- Shipping Cost (district-based, step-by-step method) ----
    else if (type === "cost") {
      const body = JSON.parse(event.body || "{}");

      // Accept "jne", "jne,tiki" or ["jne","tiki"] and turn into colon-separated string
      let courierString = "";
      if (Array.isArray(body.courier)) {
        courierString = body.courier.map(String).map(s => s.trim()).filter(Boolean).join(":");
      } else if (typeof body.courier === "string") {
        // allow comma- or colon-separated in input
        courierString = body.courier
          .split(/[,:\s]+/)
          .map(s => s.trim())
          .filter(Boolean)
          .join(":");
      }

      const form = new URLSearchParams();
      form.set("origin",      String(body.origin || ""));
      form.set("destination", String(body.destination || ""));
      form.set("weight",      String(Number(body.weight || 0)));
      if (courierString) form.set("courier", courierString);
      // optional:
      // form.set("price", "lowest");

      url = `${BASE_URL}/calculate/district/domestic-cost`;
      options.method = "POST";
      options.headers = {
        key: API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      };
      options.body = form.toString();
    }

    // ---- Delivery tracking (leave if you use it) ----
    else if (type === "delivery") {
      const body = JSON.parse(event.body || "{}");
      url = `${BASE_URL}/delivery/track`;
      options.method = "POST";
      options.headers = { key: DELIVERY_KEY, "Content-Type": "application/json" };
      options.body = JSON.stringify({ waybill: body.waybill, courier: body.courier });
    }

    // ---- Delivery Tracking ----
    else if (type === "delivery") {
      const body = JSON.parse(event.body || "{}");
      url = `${BASE_URL}/delivery/track`;
      options.method = "POST";
      options.headers = { key: DELIVERY_KEY, "Content-Type": "application/json" };
      options.body = JSON.stringify({
        waybill: body.waybill,
        courier: body.courier,
      });
    }


    // ---- Invalid type ----
    else {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid type parameter" }) };
    }

    // Debug: see exactly what we call
    console.log("→", options.method, url);

    const res = await fetch(url, options);

    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      console.error("❌ RajaOngkir non-200:", res.status, raw);
      return { statusCode: res.status, body: raw || JSON.stringify({ error: `HTTP ${res.status}` }) };
    }

    const data = await res.json();
    return { statusCode: 200, body: JSON.stringify(data) };

  } catch (err) {
    console.error("❌ Shipping API error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
