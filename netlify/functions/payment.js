// netlify/functions/payment.js
//import fetch from "node-fetch";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return errorResponse(405, "Method not allowed");
    }

    const body = JSON.parse(event.body || "{}");

    // Build order payload for Midtrans
    const orderId = "ORDER-" + Date.now();
    const grossAmount = body.amount; // products + shipping

    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount
      },
      customer_details: {
        first_name: body.address.full_name,
        phone: body.address.phone,
        billing_address: {
          address: body.address.street,
          city: body.address.city,
          postal_code: body.address.postal_code
        },
        shipping_address: {
          address: body.address.street,
          city: body.address.city,
          postal_code: body.address.postal_code
        }
      },
      item_details: body.items
    };

    const response = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(process.env.MIDTRANS_SERVER_KEY + ":").toString("base64"),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Midtrans error response:", data);
      return errorResponse(response.status, data?.message || "Payment initialization failed", data);
    }

    console.log("[payment] Success:", { orderId });
    return successResponse("Payment token generated successfully", data);
  } catch (err) {
    console.error("Midtrans error:", err);
    return errorResponse(err?.status || 500, err?.message || "Payment failed", err?.details || null);
  }
}

const successResponse = (message, data) => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message, data })
});

const errorResponse = (status, message, details = null) => ({
  statusCode: status || 500,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: message || "Unexpected server error",
    details
  })
});
