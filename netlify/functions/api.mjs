// netlify/functions/api.js
import { Router } from "../../src/controllers/Router.js";

export async function handler(event) {
  try {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS")
      return { statusCode: 200, headers: cors(), body: "" };

    // Parse body and query params
    const body = event.body ? JSON.parse(event.body) : {};
    const query = event.queryStringParameters || {};
    const action = query.action || body.action;
    const method = query.method || body.method;

    if (!action) throw new Error("Missing 'action' parameter");

    // Dispatch to Router
    const result = await Router.handle({ action, method, body, query });

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("[api]", err);
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
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
