// src/controllers/PaymentController.js
import { MidtransModel } from "../models/MidtransModel.js";

export class PaymentController {
  static async createTransaction({ totalAmount, items, customer }) {
    const order_id = "ORDER-" + Date.now();

    const payload = {
      transaction_details: {
        order_id,
        gross_amount: totalAmount,
      },
      item_details: items.map((i) => ({
        id: i.id || i.name,
        price: i.price,
        quantity: i.qty || 1,
        name: i.name,
      })),
      customer_details: {
        first_name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    };

    return MidtransModel.createSnapTransaction(payload);
  }
}
