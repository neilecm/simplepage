// netlify/functions/create-order.js
import { OrderController } from "../../src/controllers/OrderController.js";

export async function handler(event) {
  try {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS")
      return { statusCode: 200, headers: cors(), body: "" };

    if (event.httpMethod !== "POST") {
      return errorResponse(405, "Method not allowed");
    }

    // Parse incoming data
    const body = JSON.parse(event.body || "{}");

    // Delegate to MVC controller
    const result = await OrderController.createOrder(body);

    console.log("[create-order] Success:", { orderId: result?.order_id });
    return successResponse("Order created successfully", result);
  } catch (err) {
    console.error("[create-order] Error:", err);
    return errorResponse(err?.status || 500, err?.message, err?.details || null);
  }
}

// Common CORS helper
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

const successResponse = (message, data) => ({
  statusCode: 200,
  headers: { ...cors(), "Content-Type": "application/json" },
  body: JSON.stringify({ message, data }),
});

const errorResponse = (status, message, details = null) => ({
  statusCode: status || 500,
  headers: { ...cors(), "Content-Type": "application/json" },
  body: JSON.stringify({
    message: message || "Unexpected server error",
    details,
  }),
});
