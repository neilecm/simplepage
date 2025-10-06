// src/controllers/Router.js
import { ShippingController } from "./ShippingController.js";
import { AuthController } from "./AuthController.js";
import { PaymentController } from "./PaymentController.js";
import { OrderController } from "./OrderController.js";

export class Router {
  /**
   * Handle dynamic routing for API actions
   * @param {Object} params
   * @param {string} params.action - e.g., "shipping", "auth", "payment", "order"
   * @param {string} params.method - sub-method (e.g., "provinces", "createTransaction")
   * @param {Object} params.body - POST body
   * @param {Object} params.query - URL query parameters
   */
  static async handle({ action, method, body = {}, query = {} }) {
    try {
      switch (action) {
        // ============================================================
        // 🚚 SHIPPING CONTROLLER
        // ============================================================
        case "shipping": {
          switch (method) {
            // 🧭 Step-by-step region data
          case "provinces":
            return ShippingController.getProvinces();

          case "cities":
            return ShippingController.getCities({
              province_id: query?.province_id || body?.province_id,
            });

          case "districts":
            return ShippingController.getDistricts({
              city_id: query?.city_id || body?.city_id,
            });

          case "subdistricts":
            return ShippingController.getSubdistricts({
              district_id: query?.district_id || body?.district_id,
            });

          // 🧭 Final step — cost calculation
          case "cost":
            return ShippingController.getCost({
              origin: query?.origin || body?.origin,
              destination:
                query?.destination ||
                body?.destination ||
                body?.district_id,
              courier: query?.courier || body?.courier,
              weight: Number(query?.weight || body?.weight) || 1000,
              price: query?.price || body?.price || "lowest",
            });
          }
        }

        // ============================================================
        // 👤 AUTH CONTROLLER
        // ============================================================
        case "auth": {
          switch (method) {
            case "saveAddress":
              return AuthController.saveAddress(body);

            case "register":
              return AuthController.register?.(body) ?? { message: "Not implemented" };

            case "login":
              return AuthController.login?.(body) ?? { message: "Not implemented" };

            default:
              throw new Error(`Unknown auth method: ${method}`);
          }
        }

        // ============================================================
        // 💳 PAYMENT CONTROLLER
        // ============================================================
        case "payment": {
          switch (method) {
            case "createTransaction":
              return PaymentController.createTransaction(body);

            default:
              throw new Error(`Unknown payment method: ${method}`);
          }
        }

        // ============================================================
        // 📦 ORDER CONTROLLER
        // ============================================================
        case "order": {
          switch (method) {
            case "createOrder":
              return OrderController.createOrder(body);

            default:
              throw new Error(`Unknown order method: ${method}`);
          }
        }

        // ============================================================
        // ❌ UNKNOWN ACTION HANDLER
        // ============================================================
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (err) {
      console.error(`[Router] Error handling ${action}/${method}:`, err);
      return {
        error: true,
        message: err.message || "Internal server error",
      };
    }
  }
}
