// netlify/functions/create-order.js
import { OrderController } from "../../src/controllers/OrderController.js";

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS")
      return { statusCode: 200, headers: cors(), body: "" };

    const body = JSON.parse(event.body);
    const result = await OrderController.createOrder(body);

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("[create-order]", err);
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
