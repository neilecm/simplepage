// netlify/functions/auth-save-address.js
import { AuthController } from "../../src/controllers/AuthController.js";

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers: cors(), body: "" };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const result = await AuthController.saveAddress(body);

    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("[auth-save-address]", err);
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
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
