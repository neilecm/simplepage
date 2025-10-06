// netlify/functions/shipping.js
import { ShippingController } from "../../src/controllers/ShippingController.js";

export async function handler(event) {
  try {
    const isGET = event.httpMethod === "GET";
    const qsAction = event.queryStringParameters?.action;
    const body = !isGET && event.body ? JSON.parse(event.body) : {};
    const action = qsAction || body.action || "cost";

    // CORS
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: "",
      };
    }

    let result;

    switch (action) {
      case "provinces":
        result = await ShippingController.getProvinces();
        break;
      case "cities":
        // Accept province_id via GET or body
        result = await ShippingController.getCities({
          province_id: event.queryStringParameters?.province_id || body.province_id,
        });
        break;
      case "subdistricts":
        result = await ShippingController.getSubdistricts({
          city_id: event.queryStringParameters?.city_id || body.city_id,
        });
        break;
      case "cost":
      default: {
        // Expect: origin, destination, weight, courier, originType, destinationType
        const payload = {
          origin:          body.origin          ?? process.env.RO_ORIGIN_CITY_ID, // default from env
          destination:     body.destination,
          weight:          body.weight ?? 1000, // grams
          courier:         body.courier ?? "jne",
          originType:      body.originType ?? "city",
          destinationType: body.destinationType ?? "city",
        };
        result = await ShippingController.getCost(payload);
        break;
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("[/shipping] error", err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        rajaongkir: {
          results: [],
          error: String(err?.message || err),
        },
      }),
    };
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
