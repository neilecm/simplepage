// netlify/functions/create-transaction.js
const midtransClient = require("midtrans-client");

exports.handler = async (event) => {
  try {
    // Parse incoming body (cart total from frontend)
    const body = JSON.parse(event.body || "{}");
    const amount = body.amount || 10000; // fallback test value

    let snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY, // stored securely in Netlify env vars
    });

    // Prepare transaction
    let parameter = {
      transaction_details: {
        order_id: "order-id-" + Math.round(new Date().getTime() / 1000),
        gross_amount: amount,
      },
      credit_card: { secure: true },
    };

    let transaction = await snap.createTransaction(parameter);

    return {
      statusCode: 200,
      body: JSON.stringify({ token: transaction.token }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
