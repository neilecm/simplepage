// public/assets/js/views/AdminView.js

const STATUS_BADGES = {
  pending: "badge badge-pending",
  paid: "badge badge-paid",
  shipped: "badge badge-shipped",
  completed: "badge badge-completed",
  cancelled: "badge badge-cancelled",
  delivered: "badge badge-completed",
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
    this.toastEl = document.getElementById("admin-toast");
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

  showToast(message, type = "success") {
    this.cache();
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.classList.toggle("error", type === "error");
    this.toastEl.hidden = false;
    requestAnimationFrame(() => {
      this.toastEl.classList.add("show");
    });
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toastEl.classList.remove("show");
      setTimeout(() => (this.toastEl.hidden = true), 200);
    }, 2500);
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
      tr.dataset.status = order.status;

      const status = String(order.status || "pending").toLowerCase();
      const badgeClass = STATUS_BADGES[status] || STATUS_BADGES.pending;

      const updatedDate = formatDate(order.updated_at || order.created_at);

      tr.innerHTML = `
        <td data-label="Order ID">${order.order_id}</td>
        <td data-label="Customer">${order.customer_name || order.user_id || "-"}</td>
        <td data-label="Date">${formatDate(order.created_at)}</td>
        <td data-label="Total">${formatCurrency(order.total)}</td>
        <td data-label="Payment">${(order.payment_status || "unknown").toUpperCase()}</td>
        <td data-label="Shipping">${order.shipping_provider || "N/A"}</td>
        <td data-label="Status">
          <div class="status-cell">
            <span class="${badgeClass}">${status.toUpperCase()}</span>
            ${this.buildStatusSelect(order.order_id, status)}
            <small class="status-updated">Updated ${updatedDate}</small>
          </div>
        </td>
        <td data-label="Actions">
          <div class="actions">
            <button class="view-btn" data-order="${order.order_id}">View Details</button>
          </div>
        </td>
      `;

      fragment.appendChild(tr);
    });

    this.tableBody.appendChild(fragment);
  },

  buildStatusSelect(orderId, current) {
    const statuses = ["pending", "paid", "shipped", "completed", "cancelled"];
    const options = statuses
      .map(
        (value) =>
          `<option value="${value}" ${
            value === current ? "selected" : ""
          }>${value.toUpperCase()}</option>`
      )
      .join("");
    return `<select class="status-select" data-order="${orderId}" data-current="${current}">${options}</select>`;
  },

  updateOrderRow(order) {
    if (!order?.order_id) return;
    const row = document.querySelector(
      `#orders-body tr[data-order-id="${order.order_id}"]`
    );
    if (!row) return;

    const statusCell = row.querySelector(".status-cell");
    const select = row.querySelector(".status-select");
    if (statusCell) {
      const status = String(order.status || "pending").toLowerCase();
      const badgeClass = STATUS_BADGES[status] || STATUS_BADGES.pending;
      let badge = statusCell.querySelector(".badge");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = badgeClass;
        badge.textContent = status.toUpperCase();
        statusCell.prepend(badge);
      } else {
        badge.className = badgeClass;
        badge.textContent = status.toUpperCase();
      }
      const updatedEl = statusCell.querySelector(".status-updated");
      if (updatedEl) {
        updatedEl.textContent = `Updated ${formatDate(order.updated_at || order.created_at)}`;
      }
    }
    if (select) {
      select.value = order.status;
      select.dataset.current = order.status;
    }
    row.dataset.status = order.status;
  },
};

// TODO: add modal rendering for detailed order view in future phases.
