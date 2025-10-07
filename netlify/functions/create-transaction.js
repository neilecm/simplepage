import { PaymentController } from "../../src/controllers/PaymentController.js";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const result = await PaymentController.createTransaction(body);
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("create-transaction error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
