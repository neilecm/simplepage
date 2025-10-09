export const PaymentModel = {
  async createTransaction(total_cost) {
    try {
      const res = await fetch("/.netlify/functions/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total_cost })
      });

      if (!res.ok) {
        throw new Error(`Failed to create transaction (${res.status})`);
      }

      const data = await res.json();
      return data;
    } catch (error) {
      console.error("PaymentModel error:", error);
      throw error;
    }
  }
};
