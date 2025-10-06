// src/models/MidtransModel.js
const IS_PROD = String(process.env.MIDTRANS_IS_PROD).toLowerCase() === "true";
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;

const BASE = IS_PROD
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

function authHeader() {
  const token = Buffer.from(`${SERVER_KEY}:`).toString("base64");
  return `Basic ${token}`;
}

export class MidtransModel {
  static async createSnapTransaction(payload) {
    const res = await fetch(BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`[Midtrans] ${res.status} ${res.statusText}: ${text}`);
    }

    return res.json(); // { token, redirect_url }
  }

  static verifySignature({ order_id, status_code, gross_amount, signature_key }) {
    const crypto = await import("crypto");
    const generated = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${SERVER_KEY}`)
      .digest("hex");
    return generated === signature_key;
  }
}
