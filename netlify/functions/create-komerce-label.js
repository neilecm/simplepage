// netlify/functions/create-komerce-label.js
const API_URL =
  "https://api-sandbox.collaborator.komerce.id/order/api/v1/label-order";

const successResponse = (message, data) => ({
  statusCode: 200,
  headers: { ...corsHeaders(), "Content-Type": "application/json" },
  body: JSON.stringify({ message, data }),
});

const errorResponse = (status, message, details = null) => ({
  statusCode: status || 500,
  headers: { ...corsHeaders(), "Content-Type": "application/json" },
  body: JSON.stringify({
    message: message || "Unexpected server error",
    details,
  }),
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    const apiKey = process.env.KOMERCE_API_KEY;
    if (!apiKey) {
      return errorResponse(500, "KOMERCE_API_KEY is not configured.");
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

    if (!response.ok) {
      console.error("[create-komerce-label] API Error:", data);
      return errorResponse(response.status, data?.message || "Failed to create Komerce label", data);
    }

    console.log("[create-komerce-label] Success:", data);
    return successResponse("Komerce label created successfully", data);
  } catch (error) {
    console.error("[create-komerce-label] error:", error);
    return errorResponse(error?.status || 500, error?.message || "Internal Server Error", error?.details || null);
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}
