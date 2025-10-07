// src/models/PaymentModel.js
export async function createTransaction(payload) {
  try {
    const res = await fetch("/.netlify/functions/api?action=payment&method=createTransaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("PaymentModel.createTransaction error:", err);
    throw err;
  }
}
