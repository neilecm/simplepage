import midtransClient from "midtrans-client";

export const handler = async (event) => {
  try {
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Notification processed successfully",
        status: statusResponse.transaction_status
      })
    };
  } catch (error) {
    console.error("Midtrans payment-callback error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
