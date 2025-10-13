// netlify/functions/create-shipping-order.js
import { ShippingController } from "../../src/controllers/ShippingController.js";

/**
 * Back-compat adapter:
 * - If scope is provided: provinces | cities | districts | subdistricts | cost
 * - Otherwise we auto-detect based on incoming params.
 * - Always ESM: `export async function handler(...) {}` (no CommonJS `exports`)
 */
export async function handler(event) {
  try {
    // CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers: cors(), body: "" };
    }
    if (event.httpMethod && !["GET", "POST"].includes(event.httpMethod)) {
      return errorResponse(405, "Method not allowed");
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const query = event.queryStringParameters || {};
    const scope = query.scope || body.scope;

    // ----- Explicit scopes (preferred) -----
    if (scope === "provinces") {
      const data = await ShippingController.getProvinces();
      console.log("[create-shipping-order] Success:", { scope: "provinces" });
      return successResponse("Provinces fetched successfully", data);
    }
    if (scope === "cities") {
      const data = await ShippingController.getCities({
        province_id: query.province_id ?? body.province_id,
      });
      console.log("[create-shipping-order] Success:", { scope: "cities" });
      return successResponse("Cities fetched successfully", data);
    }
    if (scope === "districts") {
      const data = await ShippingController.getDistricts({
        city_id: query.city_id ?? body.city_id,
      });
      console.log("[create-shipping-order] Success:", { scope: "districts" });
      return successResponse("Districts fetched successfully", data);
    }
    if (scope === "subdistricts") {
      const data = await ShippingController.getSubdistricts({
        district_id: query.district_id ?? body.district_id,
      });
      console.log("[create-shipping-order] Success:", { scope: "subdistricts" });
      return successResponse("Subdistricts fetched successfully", data);
    }
    if (scope === "cost") {
      const data = await ShippingController.getCost({
        origin: query.origin ?? body.origin,
        destination:
          query.destination ?? body.destination ?? body.district_id,
        courier: query.courier ?? body.courier,
        weight: Number(query.weight ?? body.weight) || 1000,
        price: query.price ?? body.price ?? "lowest",
      });
      console.log("[create-shipping-order] Success:", { scope: "cost" });
      return successResponse("Shipping cost fetched successfully", data);
    }

    // ----- Auto-detect (legacy callers) -----
    if (query.province_id || body.province_id) {
      const data = await ShippingController.getCities({
        await ShippingController.getCities({
          province_id: query.province_id ?? body.province_id,
        });
      });
      console.log("[create-shipping-order] Success:", {
        scope: "auto-cities",
      });
      return successResponse("Cities fetched successfully", data);
    }

    if (query.city_id || body.city_id) {
      const data = await ShippingController.getDistricts({
        city_id: query.city_id ?? body.city_id,
      });
      console.log("[create-shipping-order] Success:", {
        scope: "auto-districts",
      });
      return successResponse("Districts fetched successfully", data);
    }

    if (query.district_id || body.district_id) {
      // If courier present → cost; else → subdistricts
      if (query.courier || body.courier) {
        const data = await ShippingController.getCost({
          origin: query.origin ?? body.origin,
          destination: query.district_id ?? body.district_id,
          courier: query.courier ?? body.courier,
          weight: Number(query.weight ?? body.weight) || 1000,
          price: query.price ?? body.price ?? "lowest",
        });
        console.log("[create-shipping-order] Success:", {
          scope: "auto-cost",
        });
        return successResponse("Shipping cost fetched successfully", data);
      }
      const data = await ShippingController.getSubdistricts({
        district_id: query.district_id ?? body.district_id,
      });
      console.log("[create-shipping-order] Success:", {
        scope: "auto-subdistricts",
      });
      return successResponse("Subdistricts fetched successfully", data);
    }

    // Default: provinces (safe fallback)
    const defaultData = await ShippingController.getProvinces();
    console.log("[create-shipping-order] Success:", { scope: "default-provinces" });
    return successResponse("Provinces fetched successfully", defaultData);
  } catch (err) {
    console.error("[create-shipping-order] Error:", err);
    return errorResponse(err?.status || 500, err?.message, err?.details || null);
  }
}

// ---------- helpers ----------
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

const successResponse = (message, data) => ({
  statusCode: 200,
  headers: { ...cors(), "Content-Type": "application/json" },
  body: JSON.stringify({ message, data }),
});

const errorResponse = (status, message, details = null) => ({
  statusCode: status || 500,
  headers: { ...cors(), "Content-Type": "application/json" },
  body: JSON.stringify({
    message: message || "Unexpected server error",
    details,
  }),
});
