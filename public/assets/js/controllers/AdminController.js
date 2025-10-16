// public/assets/js/controllers/AdminController.js
// Plain global controller (no modules) to work with admin-dashboard.html

(function () {
  const AdminController = {
    user: {},
    orders: [],
    filtered: [],
    currentPage: 1,
    pageSize: 10,
    currentStatus: "all",
    currentSearch: "",

    init() {
      try {
        this.bindEvents();
        this.loadOrders();
      } catch (e) {
        console.warn("[AdminController.init]", e);
        AdminView?.showError?.(e?.message || "Failed to initialize Admin.");
      }
    },

    bindEvents() {
      // Open order details when a "View Details" button is clicked
      document.addEventListener("click", (e) => {
        const btn = e.target.closest(".js-view-order");
        if (!btn) return;
        const orderId = btn.getAttribute("data-order-id");
        if (orderId) this.openOrder(orderId);
      });
    },

    async loadOrders() {
      try {
        AdminView?.showLoading?.();

        const page = this.currentPage || 1;
        const limit = this.pageSize || 10;
        const status = this.currentStatus || "all";
        const q = (this.currentSearch || "").trim();
        const includeTotal = false; // faster locally

        const { data } = await window.OrdersModel.fetchOrders({ page, limit, status, q, includeTotal });
        this.orders = Array.isArray(data) ? data : [];

        this.applyFilters();
        const rowsToRender = Array.isArray(this.filtered) && this.filtered.length ? this.filtered : this.orders;
        this.renderOrdersTable(rowsToRender);
      } catch (error) {
        console.warn("[AdminController.loadOrders]", error);
        if (error?.status === 401 || error?.status === 403) {
          alert("You are not authorized to view this page.");
          window.location.href = "/login.html";
          return;
        }
        AdminView?.showError?.(error?.message || "Failed to load orders.");
      } finally {
        AdminView?.hideLoading?.();
      }
    },

    applyFilters() {
      // No-op for now; wire status/search later if desired
      this.filtered = this.orders;
    },

    renderOrdersTable(rows = []) {
      const tbody = document.getElementById("orders-body");
      if (!tbody) return;

      const safe = (v) => (v == null ? "—" : v);

      tbody.innerHTML = rows.map((row) => {
        const id       = row.order_id ?? "";
        const customer = row.customer_name ?? row.customer ?? "—";
        const created  = row.created_at ? new Date(row.created_at).toLocaleString() : "—";
        const total    = row.gross_amount ?? row.total ?? "—";
        const payment  = row.payment_type ?? "—";
        const shipping = row.shipping_status ?? "—";
        const status   = row.status ?? row.transaction_status ?? "—";

        return `
          <tr>
            <td data-label="Order ID">${safe(id)}</td>
            <td data-label="Customer">${safe(customer)}</td>
            <td data-label="Date">${safe(created)}</td>
            <td data-label="Total">${safe(total)}</td>
            <td data-label="Payment">${safe(payment)}</td>
            <td data-label="Shipping">${safe(shipping)}</td>
            <td data-label="Status">${safe(status)}</td>
            <td data-label="Actions">
              <button
                type="button"
                class="pill-button secondary js-view-order"
                data-order-id="${id}">
                View Details
              </button>
            </td>
          </tr>
        `;
      }).join("");

      const empty = document.getElementById("orders-empty");
      if (empty) empty.hidden = rows.length !== 0;
    },

    // Fetch one order and show details (modal/panel)
    async openOrder(orderId) {
      try {
        AdminView?.showOrderLoading?.();
        const order = await window.OrdersModel.fetchOrder(orderId);
        AdminView?.renderOrderDetails
          ? AdminView.renderOrderDetails(order)
          : alert(
              `Order ${order?.order_id ?? "—"}\n` +
              `Status: ${order?.status ?? order?.transaction_status ?? "—"}\n` +
              `Payment: ${order?.payment_type ?? "—"}\n` +
              `Amount: ${order?.gross_amount ?? order?.total ?? "—"}`
            );
      } catch (err) {
        console.warn("[AdminController.openOrder]", err);
        AdminView?.showError?.("Failed to load order details.");
      } finally {
        AdminView?.hideOrderLoading?.();
      }
    },
  };

  window.AdminController = AdminController;
  document.addEventListener("DOMContentLoaded", () => AdminController.init());
})();

