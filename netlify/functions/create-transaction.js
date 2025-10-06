// netlify/functions/create-transaction.js
import { PaymentController } from "../../src/controllers/PaymentController.js";

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS")
      return { statusCode: 200, headers: cors(), body: "" };

    const body = JSON.parse(event.body);
    const data = await PaymentController.createTransaction(body);

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("[create-transaction]", err);
    return {
      statusCode: 500,
      headers: cors(),
      body: JSON.stringify({ error: err.message }),
    };
  }
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
