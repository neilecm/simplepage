// public/assets/js/views/AdminView.js

const STATUS_BADGES = {
  pending: "badge badge-pending",
  paid: "badge badge-paid",
  shipped: "badge badge-shipped",
  delivered: "badge badge-delivered",
  cancelled: "badge badge-cancelled",
};

function formatCurrency(value) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function formatDate(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const AdminView = {
  cache() {
    this.loadingEl = document.getElementById("admin-loading");
    this.tableBody = document.getElementById("orders-body");
    this.emptyState = document.getElementById("orders-empty");
    this.errorBanner = document.getElementById("admin-error");
  },

  showLoading() {
    this.cache();
    if (this.loadingEl) this.loadingEl.hidden = false;
  },

  hideLoading() {
    if (this.loadingEl) this.loadingEl.hidden = true;
  },

  showError(message) {
    if (!this.errorBanner) return;
    this.errorBanner.textContent = message;
    this.errorBanner.hidden = false;
    this.errorBanner.style.display = "block";
  },

  clearError() {
    if (!this.errorBanner) return;
    this.errorBanner.hidden = true;
    this.errorBanner.textContent = "";
    this.errorBanner.style.display = "none";
  },

  renderOrdersTable(orders = []) {
    this.cache();
    this.clearError();

    if (!this.tableBody) return;
    this.tableBody.innerHTML = "";

    if (!orders.length) {
      if (this.emptyState) this.emptyState.hidden = false;
      return;
    }

    if (this.emptyState) this.emptyState.hidden = true;

    const fragment = document.createDocumentFragment();

    orders.forEach((order) => {
      const tr = document.createElement("tr");
      tr.dataset.orderId = order.order_id;

      const status = String(order.status || "pending").toLowerCase();
      const badgeClass = STATUS_BADGES[status] || STATUS_BADGES.pending;

      tr.innerHTML = `
        <td data-label="Order ID">${order.order_id}</td>
        <td data-label="Customer">${order.customer_name || order.user_id || "-"}</td>
        <td data-label="Date">${formatDate(order.created_at)}</td>
        <td data-label="Total">${formatCurrency(order.total)}</td>
        <td data-label="Payment">${(order.payment_status || "unknown").toUpperCase()}</td>
        <td data-label="Shipping">${order.shipping_provider || "N/A"}</td>
        <td data-label="Status">
          <span class="${badgeClass}">${status.toUpperCase()}</span>
        </td>
        <td data-label="Actions">
          <div class="actions">
            <select class="status-select" data-order="${order.order_id}">
              ${this.buildStatusOptions(status)}
            </select>
            <button class="view-btn" data-order="${order.order_id}">View Details</button>
          </div>
        </td>
      `;

      fragment.appendChild(tr);
    });

    this.tableBody.appendChild(fragment);
  },

  buildStatusOptions(current) {
    const statuses = ["pending", "paid", "shipped", "delivered", "cancelled"];
    return statuses
      .map(
        (value) =>
          `<option value="${value}" ${
            value === current ? "selected" : ""
          }>${value.toUpperCase()}</option>`
      )
      .join("");
  },

  updateOrderRow(order) {
    if (!order?.order_id) return;
    const row = document.querySelector(
      `#orders-body tr[data-order-id="${order.order_id}"]`
    );
    if (!row) return;

    const statusCell = row.querySelector('[data-label="Status"]');
    const select = row.querySelector(".status-select");
    if (statusCell) {
      const status = String(order.status || "pending").toLowerCase();
      const badgeClass = STATUS_BADGES[status] || STATUS_BADGES.pending;
      statusCell.innerHTML = `<span class="${badgeClass}">${status.toUpperCase()}</span>`;
    }
    if (select) select.value = order.status;
  },
};

// TODO: add modal rendering for detailed order view in future phases.
