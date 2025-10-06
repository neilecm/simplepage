// src/controllers/Router.js
import { ShippingController } from "./ShippingController.js";
import { AuthController } from "./AuthController.js";
import { PaymentController } from "./PaymentController.js";
import { OrderController } from "./OrderController.js";

export class Router {
  static async handle({ action, method, body, query }) {
    switch (action) {
      // ---------------- SHIPPING ----------------
      case "shipping":
        switch (method) {
          case "provinces":
            return ShippingController.getProvinces();
          case "cities":
            return ShippingController.getCities({ province_id: query?.province_id || body?.province_id });
          case "subdistricts":
            return ShippingController.getSubdistricts({ city_id: query?.city_id || body?.city_id });
          case "cost":
          default:
            return ShippingController.getCost(body);
        }

      // ---------------- AUTH ----------------
      case "auth":
        switch (method) {
          case "saveAddress":
            return AuthController.saveAddress(body);
          default:
            throw new Error(`Unknown auth method: ${method}`);
        }

      // ---------------- PAYMENT ----------------
      case "payment":
        switch (method) {
          case "createTransaction":
            return PaymentController.createTransaction(body);
          default:
            throw new Error(`Unknown payment method: ${method}`);
        }

      // ---------------- ORDER ----------------
      case "order":
        switch (method) {
          case "createOrder":
            return OrderController.createOrder(body);
          default:
            throw new Error(`Unknown order method: ${method}`);
        }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}
