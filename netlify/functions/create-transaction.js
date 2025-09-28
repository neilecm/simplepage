// netlify/functions/create-transaction.js
// Safe, backward-compatible Midtrans Snap transaction creator
// Works with your new cart.js payload and preserves existing flow.

const midtransClient = require("midtrans-client");

// Toggle production via env if you want (defaults to false)
const IS_PRODUCTION =
  String(process.env.MIDTRANS_IS_PRODUCTION || "").toLowerCase() === "true";

// Create Snap client once (re-used across invocations when warm)
const snap = new midtransClient.Snap({
  isProduction: IS_PRODUCTION,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

// Small helpers
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
    // Accept JSON body (robust parse)
    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }

    // Expect new payload: { amount, cart: [{id,name,price,qty}], customer: {...} }
    // But remain backward-compatible with earlier shapes.
    const cartArr =
      Array.isArray(body.cart) && body.cart.length
        ? body.cart
        : Array.isArray(body.items) && body.items.length
        ? body.items
        : [];

    // Compute base total if amount not provided
    const computedTotal = cartArr.reduce((sum, it) => {
      const price = toInt(it.price, 0);
      const qty = toInt(it.qty || it.quantity || 1, 1);
      return sum + price * qty;
    }, 0);

    const baseAmount = toInt(body.amount, computedTotal);

    // Optional shipping as separate item:
    // - prefer body.customer.shippingCost
    // - fallback body.shippingCost
    const shippingCost = toInt(
      body?.customer?.shippingCost ?? body?.shippingCost,
      0
    );

    // Build item_details (map current items, keep names & prices)
    const item_details = cartArr.map((it) => {
      const price = toInt(it.price, 0);
      const qty = toInt(it.qty || it.quantity || 1, 1);
      const name = it.name || "Item";
      const id = it.id ? String(it.id) : sanitizeId(name);
      return {
        id,
        price,
        quantity: qty,
        name: String(name).slice(0, 50), // Midtrans name max 50 chars recommended
      };
    });

    // If shippingCost > 0, append as a separate item and add to gross_amount
    if (shippingCost > 0) {
      item_details.push({
        id: "shipping",
        price: shippingCost,
        quantity: 1,
        name: "Shipping",
      });
    }

    // Total sent to Midtrans
    const gross_amount = baseAmount + (shippingCost > 0 ? shippingCost : 0);

    if (!gross_amount || item_details.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Cart is empty or amount is missing/invalid",
        }),
      };
    }

    // Customer details (all optional-safe)
    const c = body.customer || {};
    const firstName = (c.name || "").toString().trim() || "Customer";
    const email = (c.email || "").toString().trim() || undefined;
    const phone = (c.phone || "").toString().trim() || undefined;
    const addressLine = (c.address || "").toString().trim() || undefined;
    const city = (c.city || "").toString().trim() || undefined;
    const postal = (c.postal || c.postal_code || "").toString().trim() || undefined;
    const province = (c.province || "").toString().trim() || undefined;

    // Midtrans payload
    const parameter = {
      transaction_details: {
        order_id: "order-" + Date.now(), // unique per call
        gross_amount,
      },
      item_details,
      customer_details: {
        first_name: firstName,
        email,
        phone,
        billing_address: {
          first_name: firstName,
          phone,
          email,
          address: addressLine,
          city,
          postal_code: postal,
          country_code: "IDN",
        },
        shipping_address: {
          first_name: firstName,
          phone,
          email,
          address: addressLine,
          city,
          postal_code: postal,
          country_code: "IDN",
        },
      },
      credit_card: { secure: true },
    };

    // Debug logs (visible in Netlify function logs)
    console.log("📦 Incoming payload:", JSON.stringify(body, null, 2));
    console.log("🧾 Midtrans param:", JSON.stringify(parameter, null, 2));

    // Create the transaction
    const transaction = await snap.createTransaction(parameter);

    // Return Snap token to frontend
    return {
      statusCode: 200,
      body: JSON.stringify({ token: transaction.token }),
    };
  } catch (err) {
    console.error("🔥 create-transaction error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
