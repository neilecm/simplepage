// netlify/functions/create-komerce-label.js
const API_URL =
  "https://api-sandbox.collaborator.komerce.id/order/api/v1/label-order";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const apiKey = process.env.KOMERCE_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "KOMERCE_API_KEY is not configured." }),
      };
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: event.body,
    });

    const data = await response.json().catch(() => ({}));

    return {
      statusCode: response.status,
      headers: corsHeaders(),
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("[create-komerce-label] error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}
