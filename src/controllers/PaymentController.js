// src/controllers/PaymentController.js
import { MidtransModel } from "../models/MidtransModel.js";

export class PaymentController {
  /**
   * Create Midtrans transaction token
   * @param {Object} body - includes total_amount, customer_name, cart_items
   */
  static async createTransaction(body) {
    try {
      const { total_amount, customer_name, cart_items } = body;

      if (!total_amount || !customer_name) {
        throw new Error("Missing total_amount or customer_name");
      }

      const transaction = await MidtransModel.createTransaction({
        amount: total_amount,
        name: customer_name,
        items: cart_items,
      });

      return {
        success: true,
        message: "Transaction created successfully",
        token: transaction.token,
        redirect_url: transaction.redirect_url,
      };
    } catch (error) {
      console.error("[PaymentController.createTransaction] Error:", error);
      return {
        success: false,
        message: error.message || "Failed to create transaction",
      };
    }
  }

  /**
   * Verify payment callback signature (for webhook use)
   */
  static async verifyPaymentSignature(body) {
    try {
      const isValid = await MidtransModel.verifySignature(body);
      return {
        success: isValid,
        message: isValid
          ? "Signature verified successfully"
          : "Invalid payment signature",
      };
    } catch (error) {
      console.error("[PaymentController.verifyPaymentSignature] Error:", error);
      return {
        success: false,
        message: "Failed to verify payment signature",
      };
    }
  }
}

export default PaymentController;
