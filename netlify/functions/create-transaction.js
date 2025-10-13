import midtransClient from "midtrans-client";

// Netlify automatically runs handler() as an AWS Lambda
export const handler = async (event) => {
  try {
    if (event.httpMethod && event.httpMethod !== "POST") {
      return errorResponse(405, "Method not allowed");
    }

    const body = JSON.parse(event.body || "{}");
    const { total_cost } = body;

    if (!total_cost) {
      return errorResponse(400, "Missing total_cost in request body");
    }

    // Initialize Snap client with your keys
    const snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    // Prepare parameters
    const parameter = {
      transaction_details: {
        order_id: `ORDER-${Date.now()}`,
        gross_amount: total_cost
      },
      credit_card: { secure: true },
      item_details: [
        {
          id: "wax-001",
          price: total_cost,
          quantity: 1,
          name: "Brazilian Hard Wax"
        }
      ],
      customer_details: {
        first_name: "Neil",
        email: "neil@example.com"
      }
    };

    // Create transaction
    const transaction = await snap.createTransaction(parameter);

    console.log("[create-transaction] Success:", {
      orderId: parameter.transaction_details.order_id,
    });
    return successResponse("Transaction created successfully", {
      token: transaction.token,
      redirect_url: transaction.redirect_url
    });
  } catch (error) {
    console.error("Midtrans create-transaction error:", error);
    return errorResponse(error?.status || 500, error?.message, error?.details || null);
  }
};

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
