// netlify/functions/create-transaction.js
// Safe Midtrans Snap transaction creator with cart + shipping support

const midtransClient = require("midtrans-client");

// Toggle production via env (defaults to false)
const IS_PRODUCTION =
  String(process.env.MIDTRANS_IS_PRODUCTION || "").toLowerCase() === "true";

// Create Snap client
const snap = new midtransClient.Snap({
  isProduction: IS_PRODUCTION,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

// Helpers
const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : def;
};
const sanitizeId = (s) =>
  (s || "item")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 50); // Midtrans item id max length 50

exports.handler = async (event) => {
  try {
    // Parse JSON body
    let body = {};
    try {
      body = JSON.parse(event.body);
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
    }

    const { cart = [], address = {}, shipping = null } = body;

    // Build cart items
    const itemDetails = cart.map((item) => ({
      id: sanitizeId(item.id),
      price: toInt(item.price),
      quantity: toInt(item.qty),
      name: item.name,
    }));

    // Add shipping as an item if present
    if (shipping && shipping.cost) {
      itemDetails.push({
        id: "shipping",
        price: toInt(shipping.cost),
        quantity: 1,
        name: `${shipping.courier.toUpperCase()} - ${shipping.service}`,
      });
    }

    // Calculate total
    const grossAmount = itemDetails.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    // Midtrans transaction params
    const parameter = {
      transaction_details: {
        order_id: "order-" + Date.now(),
        gross_amount: grossAmount,
      },
      item_details: itemDetails,
      customer_details: {
        first_name: address.full_name || "Customer",
        email: address.email || "no-email@example.com",
        phone: address.phone || "",
        billing_address: {
          first_name: address.full_name,
          address: address.street,
          city: address.city,
          postal_code: address.postal_code,
        },
        shipping_address: {
          first_name: address.full_name,
          address: address.street,
          city: address.city,
          postal_code: address.postal_code,
          phone: address.phone,
        },
      },
    };

    // Request Snap token
    const transaction = await snap.createTransaction(parameter);

    return {
      statusCode: 200,
      body: JSON.stringify({ token: transaction.token }),
    };
  } catch (err) {
    console.error("Midtrans error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
