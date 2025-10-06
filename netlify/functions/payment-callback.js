// netlify/functions/payment-callback.js
import { MidtransModel } from "../../src/models/MidtransModel.js";
import { SupabaseModel } from "../../src/models/SupabaseModel.js";

export async function handler(event) {
  try {
    const body = JSON.parse(event.body);

    const { order_id, status_code, gross_amount, signature_key, transaction_status } = body;
    const valid = MidtransModel.verifySignature({ order_id, status_code, gross_amount, signature_key });

    if (!valid) {
      console.warn("[payment-callback] invalid signature");
      return { statusCode: 400, body: "Invalid signature" };
    }

    const newStatus =
      transaction_status === "settlement"
        ? "paid"
        : transaction_status === "cancel"
        ? "cancelled"
        : transaction_status;

    await SupabaseModel.updateOrderStatus(order_id, newStatus);

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error("[payment-callback]", err);
    return { statusCode: 500, body: "Error" };
  }
}
