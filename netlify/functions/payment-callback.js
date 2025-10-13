import midtransClient from "midtrans-client";

export const handler = async (event) => {
  try {
    if (event.httpMethod && event.httpMethod !== "POST") {
      return errorResponse(405, "Method not allowed");
    }

    const notification = JSON.parse(event.body || "{}");

    // Initialize Midtrans Core API client
    const core = new midtransClient.CoreApi({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    // Verify transaction status from notification
    const statusResponse = await core.transaction.notification(notification);

    console.log("Midtrans callback received:", statusResponse);

    // Example of what you might want to log or handle:
    // const { order_id, transaction_status, fraud_status } = statusResponse;

    console.log("[payment-callback] Success:", {
      orderId: statusResponse.order_id,
      status: statusResponse.transaction_status,
    });
    return successResponse("Notification processed successfully", statusResponse);
  } catch (error) {
    console.error("Midtrans payment-callback error:", error);
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
