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

function safeJSON(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function parseItemsField(items) {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  const parsed = safeJSON(items);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.items)) return parsed.items;
  return [];
}

function extractAddress(order) {
  const candidates = [
    order.address_json,
    order.address,
    order.shipping_address,
    order.address_data,
  ];

  let address = null;

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === "string") {
      const parsed = safeJSON(candidate);
      if (parsed) {
        address = parsed;
        break;
      }
      if (!address) address = { street: candidate };
    } else if (typeof candidate === "object") {
      address = candidate;
      break;
    }
  }

  if (!address) return null;

  return {
    street: address.street || address.address || "",
    district: address.district || address.district_name || "",
    city: address.city || address.city_name || "",
    province: address.province || address.province_name || "",
    postal_code: address.postal_code || address.postcode || "",
    phone: address.phone || address.receiver_phone || "",
  };
}

export const AdminView = {
  cache() {
    this.loadingEl = document.getElementById("admin-loading");
    this.tableBody = document.getElementById("orders-body");
    this.emptyState = document.getElementById("orders-empty");
    this.errorBanner = document.getElementById("admin-error");
    this.toastEl = document.getElementById("admin-toast");
    this.modalEl = document.getElementById("order-modal");
    this.modalContent = document.getElementById("order-modal-content");
    this.modalClose = document.getElementById("order-modal-close");

    if (this.modalEl && !this._modalBound) {
      this.modalClose?.addEventListener("click", () => this.closeModal());
      this.modalEl.addEventListener("click", (event) => {
        if (event.target === this.modalEl) this.closeModal();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") this.closeModal();
      });
      this._modalBound = true;
    }
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

  showModalLoading() {
    this.cache();
    if (!this.modalContent) return;
    this.modalContent.innerHTML = `<p class="modal-value">Loading order details…</p>`;
    this.openModal();
  },

  renderOrderDetails(order) {
    this.cache();
    if (!this.modalContent) return;

    const status = String(order.status || "pending").toLowerCase();
    const badgeClass = STATUS_BADGES[status] || STATUS_BADGES.pending;
    const address = extractAddress(order);
    const items = parseItemsField(order.items);

    const addressHTML = address
      ? `<div>
          <span class="modal-label">Address</span>
          <p class="modal-value">${address.street || "-"}<br />
            ${[address.district, address.city, address.province]
              .filter(Boolean)
              .join(", ")}
            ${address.postal_code ? ` ${address.postal_code}` : ""}
          </p>
        </div>`
      : `<div><span class="modal-label">Address</span><p class="modal-value">-</p></div>`;

    const itemsTable = items.length
      ? `<table class="modal-items">
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            ${items
              .map((item) => {
                const qty = Number(item.qty || item.quantity || 1);
                const price = Number(item.price || 0);
                const subtotal = price * qty;
                return `<tr>
                  <td>${item.name || item.title || "Unnamed item"}</td>
                  <td>${qty}</td>
                  <td>${formatCurrency(price)}</td>
                  <td>${formatCurrency(subtotal)}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>`
      : `<p class="modal-value">No items recorded.</p>`;

    const shippingCost = order.shipping_cost ?? order.shipping_cost_idr;
    const etd = order.shipping_etd || order.etd || "-";

    this.modalContent.innerHTML = `
      <section class="modal-section">
        <h3 id="order-modal-title">Order Summary</h3>
        <div class="modal-grid">
          <div>
            <span class="modal-label">Order ID</span>
            <p class="modal-value">${order.order_id}</p>
          </div>
          <div>
            <span class="modal-label">Total</span>
            <p class="modal-value">${formatCurrency(order.total)}</p>
          </div>
          <div>
            <span class="modal-label">Status</span>
            <span class="${badgeClass}">${status.toUpperCase()}</span>
          </div>
          <div>
            <span class="modal-label">Last Updated</span>
            <p class="modal-value">${formatDate(order.updated_at || order.created_at)}</p>
          </div>
        </div>
      </section>

      <section class="modal-section">
        <h3>Customer</h3>
        <div class="modal-grid">
          <div>
            <span class="modal-label">Name</span>
            <p class="modal-value">${order.customer_name || order.user_id || "-"}</p>
          </div>
          <div>
            <span class="modal-label">Email</span>
            <p class="modal-value">${order.customer_email || "-"}</p>
          </div>
          <div>
            <span class="modal-label">Phone</span>
            <p class="modal-value">${address?.phone || order.customer_phone || "-"}</p>
          </div>
          ${addressHTML}
        </div>
      </section>

      <section class="modal-section">
        <h3>Shipping</h3>
        <div class="modal-grid">
          <div>
            <span class="modal-label">Courier</span>
            <p class="modal-value">${order.shipping_provider || "-"}</p>
          </div>
          <div>
            <span class="modal-label">Service</span>
            <p class="modal-value">${order.shipping_service || "-"}</p>
          </div>
          <div>
            <span class="modal-label">ETD</span>
            <p class="modal-value">${etd}</p>
          </div>
          <div>
            <span class="modal-label">Shipping Cost</span>
            <p class="modal-value">${formatCurrency(shippingCost || 0)}</p>
          </div>
        </div>
      </section>

      <section class="modal-section">
        <h3>Payment</h3>
        <div class="modal-grid">
          <div>
            <span class="modal-label">Method</span>
            <p class="modal-value">${order.payment_method || "Midtrans"}</p>
          </div>
          <div>
            <span class="modal-label">Status</span>
            <p class="modal-value">${(order.payment_status || "unknown").toUpperCase()}</p>
          </div>
        </div>
      </section>

      <section class="modal-section">
        <h3>Items</h3>
        ${itemsTable}
      </section>
    `;

    this.openModal();
  },

  openModal() {
    if (!this.modalEl) return;
    this.modalEl.hidden = false;
    requestAnimationFrame(() => this.modalEl.classList.add("show"));
  },

  closeModal() {
    if (!this.modalEl || this.modalEl.hidden) return;
    this.modalEl.classList.remove("show");
    setTimeout(() => {
      if (this.modalEl) this.modalEl.hidden = true;
    }, 200);
  },
};
