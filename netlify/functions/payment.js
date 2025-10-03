// netlify/functions/payment.js
//import fetch from "node-fetch";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body);

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

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error("Midtrans error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Payment failed" }) };
  }
}
