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

    const body = event.body ? JSON.parse(event.body) : {};
    const query = event.queryStringParameters || {};
    const scope = query.scope || body.scope;

    // ----- Explicit scopes (preferred) -----
    if (scope === "provinces") {
      return ok(await ShippingController.getProvinces());
    }
    if (scope === "cities") {
      return ok(
        await ShippingController.getCities({
          province_id: query.province_id ?? body.province_id,
        })
      );
    }
    if (scope === "districts") {
      return ok(
        await ShippingController.getDistricts({
          city_id: query.city_id ?? body.city_id,
        })
      );
    }
    if (scope === "subdistricts") {
      return ok(
        await ShippingController.getSubdistricts({
          district_id: query.district_id ?? body.district_id,
        })
      );
    }
    if (scope === "cost") {
      return ok(
        await ShippingController.getCost({
          origin: query.origin ?? body.origin,
          destination:
            query.destination ?? body.destination ?? body.district_id,
          courier: query.courier ?? body.courier,
          weight: Number(query.weight ?? body.weight) || 1000,
          price: query.price ?? body.price ?? "lowest",
        })
      );
    }

    // ----- Auto-detect (legacy callers) -----
    if (query.province_id || body.province_id) {
      return ok(
        await ShippingController.getCities({
          province_id: query.province_id ?? body.province_id,
        })
      );
    }

    if (query.city_id || body.city_id) {
      return ok(
        await ShippingController.getDistricts({
          city_id: query.city_id ?? body.city_id,
        })
      );
    }

    if (query.district_id || body.district_id) {
      // If courier present → cost; else → subdistricts
      if (query.courier || body.courier) {
        return ok(
          await ShippingController.getCost({
            origin: query.origin ?? body.origin,
            destination: query.district_id ?? body.district_id,
            courier: query.courier ?? body.courier,
            weight: Number(query.weight ?? body.weight) || 1000,
            price: query.price ?? body.price ?? "lowest",
          })
        );
      }
      return ok(
        await ShippingController.getSubdistricts({
          district_id: query.district_id ?? body.district_id,
        })
      );
    }

    // Default: provinces (safe fallback)
    return ok(await ShippingController.getProvinces());
  } catch (err) {
    console.error("[create-shipping-order]", err);
    return {
      statusCode: 500,
      headers: cors(),
      body: JSON.stringify({ error: err.message }),
    };
  }
}

// ---------- helpers ----------
function ok(data) {
  return {
    statusCode: 200,
    headers: { ...cors(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
