// netlify/functions/shipping.js
import { ShippingController } from "../../src/controllers/ShippingController.js";

const successResponse = (message, data) => ({
  statusCode: 200,
  headers: { ...corsHeaders(), "Content-Type": "application/json" },
  body: JSON.stringify({ message, data }),
});

const errorResponse = (status, message, details = null) => ({
  statusCode: status || 500,
  headers: { ...corsHeaders(), "Content-Type": "application/json" },
  body: JSON.stringify({
    message: message || "Unexpected server error",
    details,
  }),
});

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

    if (!["GET", "POST"].includes(event.httpMethod)) {
      return errorResponse(405, "Method not allowed");
    }

    switch (action) {
      case "provinces":
        {
          const data = await ShippingController.getProvinces();
          console.log("[shipping] Success:", { action: "provinces" });
          return successResponse("Provinces fetched successfully", data);
        }
      case "cities":
        // Accept province_id via GET or body
        {
          const data = await ShippingController.getCities({
            province_id: event.queryStringParameters?.province_id || body.province_id,
          });
          console.log("[shipping] Success:", { action: "cities" });
          return successResponse("Cities fetched successfully", data);
        }
      case "subdistricts":
        {
          const data = await ShippingController.getSubdistricts({
            city_id: event.queryStringParameters?.city_id || body.city_id,
          });
          console.log("[shipping] Success:", { action: "subdistricts" });
          return successResponse("Subdistricts fetched successfully", data);
        }
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
        const data = await ShippingController.getCost(payload);
        console.log("[shipping] Success:", { action: "cost" });
        return successResponse("Shipping cost fetched successfully", data);
      }
    }
  } catch (err) {
    console.error("[/shipping] error", err);
    return errorResponse(
      err?.status || 500,
      err?.message || "RajaOngkir request failed",
      err?.details || {
        rajaongkir: {
          results: [],
          error: String(err?.message || err),
        },
      }
    );
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
