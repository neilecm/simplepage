import midtransClient from "midtrans-client";

export const MidtransModel = {
  async createSnapTransaction(total_cost) {
    const snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    const parameter = {
      transaction_details: {
        order_id: `ORDER-${Date.now()}`,
        gross_amount: total_cost
      },
      credit_card: { secure: true }
    };

    return await snap.createTransaction(parameter);
  }
};
