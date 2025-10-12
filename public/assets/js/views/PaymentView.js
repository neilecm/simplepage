export const PaymentView = {
  renderOrderTotal(total_cost) {
    const el = document.getElementById("order-total");
    if (el) el.textContent = `Total: Rp ${total_cost.toLocaleString("id-ID")}`;
  },

  showStatus(message, type = "info") {
    const container = document.getElementById("snap-container");
    if (!container) return;

    const colors = {
      info: "#333",
      success: "green",
      pending: "#e6b800",
      error: "red"
    };

    container.innerHTML = `<p style="color: ${colors[type]}; font-weight: 500;">${message}</p>`;
  },

  showLoading() {
    const container = document.getElementById("snap-container");
    if (container) container.innerHTML = "<p>Initializing payment...</p>";
  },

  showSuccess() {
    // ✅ Fixed redirect to successful-payment.html
    this.showStatus("✅ Payment successful! Redirecting...", "success");
    setTimeout(() => {
      window.location.href = "/successful-payment.html";
    }, 1500);

    // ✅ Added fallback redirect safety with loader feedback
    const container = document.getElementById("snap-container");
    setTimeout(() => {
      if (!window.location.href.includes("successful-payment.html")) {
        if (container) {
          container.innerHTML =
            '<p style="color: #047857; font-weight: 500;">Redirecting… Please wait.</p>';
        }
        window.location.replace("/successful-payment.html");
      }
    }, 3000);
  },

  showPending() {
    this.showStatus("⏳ Payment pending. Please complete your transaction.", "pending");
  },

  showError() {
    this.showStatus("❌ Payment failed. Please try again later.", "error");
  },

  showClosed() {
    this.showStatus("💤 Payment window closed before completion.", "info");
  }
};
