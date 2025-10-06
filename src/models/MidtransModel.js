import dotenv from "dotenv";
dotenv.config();

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

export class MidtransModel {
  // 🔹 Lazy-load midtrans-client when needed
  static async loadClient() {
    try {
      const pkg = await import("midtrans-client");
      return pkg.default || pkg;
    } catch (err) {
      console.error("[MidtransModel] Failed to import midtrans-client:", err);
      throw new Error("Cannot load Midtrans client");
    }
  }

  static async createTransaction({ amount, name, items }) {
    try {
      const midtransClient = await this.loadClient();
      const snap = new midtransClient.Snap({
        isProduction: IS_PRODUCTION,
        serverKey: SERVER_KEY,
        clientKey: CLIENT_KEY,
      });

      const parameter = {
        transaction_details: {
          order_id: `CERA-${Date.now()}`,
          gross_amount: amount,
        },
        credit_card: { secure: true },
        customer_details: { first_name: name || "Guest" },
        item_details: (items || []).map((i) => ({
          id: i.id || i.name || "item",
          price: i.price || 0,
          quantity: i.qty || 1,
          name: i.name || "Item",
        })),
      };

      const transaction = await snap.createTransaction(parameter);
      return {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
      };
    } catch (error) {
      console.error("[MidtransModel.createTransaction] Error:", error);
      throw new Error("Failed to create Midtrans transaction");
    }
  }

  static async verifySignature({ order_id, status_code, gross_amount, signature_key }) {
    try {
      const crypto = await import("crypto");
      const generated = crypto.createHash("sha512")
        .update(`${order_id}${status_code}${gross_amount}${SERVER_KEY}`)
        .digest("hex");
      return generated === signature_key;
    } catch (error) {
      console.error("[MidtransModel.verifySignature] Error:", error);
      return false;
    }
  }
}

export default MidtransModel;
