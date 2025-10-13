export const PaymentModel = {
  async createTransaction(total_cost) {
    try {
      const res = await fetch("/.netlify/functions/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total_cost })
      });

      const json = await res.json().catch(() => ({}));
      console.log("[PaymentModel] Response:", json);

      if (res.ok && json?.data) {
        return json;
      }

      const message = json?.message || `Failed to create transaction (${res.status})`;
      const error = new Error(message);
      error.status = res.status;
      error.details = json?.details || json;
      throw error;
    } catch (error) {
      console.error("PaymentModel error:", error);
      throw error;
    }
  }
};
