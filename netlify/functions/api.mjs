// netlify/functions/api.js
import { Router } from "../../src/controllers/Router.js";

export async function handler(event) {
  try {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS")
      return { statusCode: 200, headers: cors(), body: "" };

    if (!["GET", "POST"].includes(event.httpMethod)) {
      return errorResponse(405, "Method not allowed");
    }

    // Parse body and query params
    const body = event.body ? JSON.parse(event.body) : {};
    const query = event.queryStringParameters || {};
    const action = query.action || body.action;
    const method = query.method || body.method;

    if (!action) {
      return errorResponse(400, "Missing 'action' parameter");
    }

    // Dispatch to Router
    const result = await Router.handle({ action, method, body, query });

    console.log("[api] Success:", { action, method });
    return successResponse("API request handled successfully", result);
  } catch (err) {
    console.error("[api]", err);
    return errorResponse(err?.status || 500, err?.message, err?.details || null);
  }
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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
