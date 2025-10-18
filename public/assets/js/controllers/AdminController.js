// public/assets/js/controllers/AdminController.js
//import { AdminModel } from "../models/AdminModel.js";
//import { AdminView } from "../views/AdminView.js";
//import { ProductController } from "./ProductController.js";
//import { AdminOrdersModelV2 } from "../models/AdminOrdersModelV2.js";


/* global AdminModel, AdminView, AdminOrdersModelV2 */

// ===== Admin V2 toggle & fetch wrapper (top-of-file) =====
const __useAdminV2 = /(?:^|[?&])v=2(?:&|$)/.test(location.search);

// Chooses VIEW-based V2 when ?v=2, otherwise falls back to your existing API.
async function __fetchOrders({ page = 1, limit = 10, q = "", status = "all", adminId } = {}) {
  if (__useAdminV2 && window.AdminOrdersModelV2) {
    return window.AdminOrdersModelV2.list({ page, limit, q, status });
  }
  // legacy path (your existing model)
  return AdminModel.fetchOrders({ adminId });
}


 const AdminController = {
  init() {
    this.cacheElements();
    this.bindEvents();
    this.orders = [];
    this.filteredOrders = [];
    this.user = this.getCurrentUser();

    if (!this.user) {
      const storedRole = localStorage.getItem("user_role");
      if (storedRole && storedRole !== "admin") {
        window.location.href = "/index.html";
      } else {
        window.location.href = "/login.html";
      }
      return;
    }

    AdminView.showLoading();
    this.loadOrders();
    if (window.ProductController?.init) {
    ProductController.init(this.user);
  }
    this.switchTab("orders");
  },

  cacheElements() {
    this.searchInput = document.getElementById("order-search");
    this.filterSelect = document.getElementById("order-status-filter");
    this.table = document.getElementById("orders-table");
    this.logoutBtn = document.getElementById("admin-logout");
    this.ordersSection = document.getElementById("orders-section");
    this.ordersCard = document.getElementById("orders-card");
    this.productsSection = document.getElementById("products-section");
    this.tabButtons = document.querySelectorAll(".tab-button");
  },

  bindEvents() {
    this.logoutBtn?.addEventListener("click", () => {
      localStorage.removeItem("user");
      localStorage.removeItem("user_role");
      localStorage.removeItem("user_email");
      localStorage.removeItem("auth_token");
      window.location.href = "/login.html";
    });

    if (this.filterSelect) {
      this.filterSelect.addEventListener("change", () => this.applyFilters());
    }

    if (this.searchInput) {
      let debounceTimer;
      this.searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.applyFilters(), FILTER_DEBOUNCE);
      });
    }

    this.table?.addEventListener("change", (event) => {
      if (event.target.matches(".status-select")) {
        const select = event.target;
        const orderId = select.dataset.order;
        const previousStatus = select.dataset.current || select.dataset.prev || select.getAttribute("data-current") || "pending";
        const newStatus = select.value;
        if (previousStatus === newStatus) return;
        select.disabled = true;
        this.updateOrderStatus(orderId, newStatus, previousStatus, select);
      }
    });

    this.table?.addEventListener("click", (event) => {
      if (event.target.matches(".view-btn")) {
        const orderId = event.target.dataset.order;
        this.showOrderDetails(orderId);
      }
    });

    this.tabButtons?.forEach((button) =>
      button.addEventListener("click", () => this.switchTab(button.dataset.tab))
    );
  },

  getCurrentUser() {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (!user?.id) return null;
      user.role = user.role || localStorage.getItem("user_role") || "user";
      if (user.role !== "admin") {
        return null;
      }
      return user;
    } catch {
      return null;
    }
  },

  async loadOrders() {
    try {
      AdminView.showLoading();
      // You can wire real filters later; these safe defaults just work
      const response = await __fetchOrders({
      adminId: this.user.id, // used by legacy path only
      page: 1,
      limit: 10,
      q: "",
      status: document.getElementById("order-status-filter")?.value || "all"
    });

      if (response && Array.isArray(response.data)) {
        this.orders = response.data;
      } else if (Array.isArray(response)) {
        this.orders = response;
      } else {
        this.orders = [];
      }
      if (__useAdminV2) {
     __renderOrdersTableV2(this.orders);   // render with enriched fields
   } else {
     this.applyFilters();                   // your existing flow
  }
    } catch (error) {
      console.warn("[AdminController.loadOrders]", error);
      if (error.status === 401 || error.status === 403) {
        alert("You are not authorized to view this page.");
        window.location.href = "/login.html";
        return;
      }
      AdminView.showError(error.message || "Failed to load orders.");
    } finally {
      AdminView.hideLoading();
    }
  },

  applyFilters() {
    const term = (this.searchInput?.value || "").trim().toLowerCase();
    const statusFilter = (this.filterSelect?.value || "all").toLowerCase();

    let filtered = Array.isArray(this.orders) ? [...this.orders] : [];

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (order) => String(order.status || "").toLowerCase() === statusFilter
      );
    }

    if (term) {
      filtered = filtered.filter((order) => {
        const name = String(order.customer_name || order.user_id || "").toLowerCase();
        const email = String(order.customer_email || "").toLowerCase();
        const id = String(order.order_id || "").toLowerCase();
        return (
          name.includes(term) ||
          email.includes(term) ||
          id.includes(term)
        );
      });
    }

    this.filteredOrders = filtered;
if (__useAdminV2) {
  __renderOrdersTableV2(filtered);        // enriched view
} else {
  AdminView.renderOrdersTable(filtered);  // legacy renderer
}


  },

  switchTab(tab) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;

    this.tabButtons?.forEach((button) =>
      button.classList.toggle("active", button.dataset.tab === tab)
    );

    if (tab === "orders") {
      this.ordersSection?.removeAttribute("hidden");
      this.ordersCard?.removeAttribute("hidden");
      this.productsSection?.setAttribute("hidden", "");
    } else {
      this.ordersSection?.setAttribute("hidden", "");
      this.ordersCard?.setAttribute("hidden", "");
      this.productsSection?.removeAttribute("hidden");
    }
  },

  async updateOrderStatus(orderId, status, previousStatus, selectEl) {
    if (!orderId) return;
    try {
      const updated = await AdminModel.updateOrderStatus({
        adminId: this.user.id,
        orderId,
        status,
      });
      const index = this.orders.findIndex((o) => o.order_id === orderId);
      if (index >= 0) {
        this.orders[index] = { ...this.orders[index], ...updated };
      } else {
        this.orders.push(updated);
      }
      this.applyFilters();
      AdminView.showToast(`✔ Order ${orderId} marked as ${(updated.status || status).toUpperCase()}.`);
    } catch (error) {
      console.warn("[AdminController.updateOrderStatus]", error);
      if (selectEl) {
        selectEl.value = previousStatus;
        selectEl.dataset.current = previousStatus;
        selectEl.disabled = false;
      }
      AdminView.showToast(error.message || "Failed to update order status.", "error");
    }
  },

  async showOrderDetails(orderId) {
    if (!orderId) return;
    try {
      AdminView.showModalLoading();
      const detail = await AdminModel.fetchOrderDetails({
        adminId: this.user.id,
        orderId,
      });
      AdminView.renderOrderDetails(detail);
    } catch (error) {
      console.warn("[AdminController.showOrderDetails]", error);
      AdminView.closeModal();
      AdminView.showToast(error.message || "Failed to load order details.", "error");
    }
  },
};

window.AdminController = AdminController;


function __formatIDR(n) {
  try {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
      .format(Math.max(0, Number(n) || 0));
  } catch {
    return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
  }
}

function __renderOrdersTableV2(rows = []) {
  const tbody = document.getElementById("orders-body");
  const empty = document.getElementById("orders-empty");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (!rows.length) {
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  const frag = document.createDocumentFragment();

  rows.forEach((row) => {
    const orderId = row.order_id || "—";
    const created = row.created_at ? new Date(row.created_at).toLocaleString() : "—";
     const total   = row.total
    ?? row.gross_amount
    ?? Number(row.midtrans_payload?.gross_amount)
    ?? 0;
    const payType = row.payment_type || "—";
    const status  = row.status || "—";

    const customer = row.customer_name || row.customer || "—";
    const shipping = row.shipping_method
      ? (row.shipping_service ? `${row.shipping_method} (${row.shipping_service})` : row.shipping_method)
      : "—";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Order ID">${orderId}</td>
      <td data-label="Customer">${customer}</td>
      <td data-label="Date">${created}</td>
      <td data-label="Total">${__formatIDR(total)}</td>
      <td data-label="Payment">${payType}</td>
      <td data-label="Shipping">
  ${row.shipping_display || row.service_label || row.shipping_service || '—'}
  <div class="subtext">
    ${(row.etd_display || row.etd || '—')} • ${(row.shipping_cost_display || '—')}
  </div>
</td>

      <td data-label="Shipping">${shipping}</td>
      <td data-label="Status"><span class="badge badge-${status}">${status}</span></td>
      <td data-label="Actions">
        <div class="actions">
          <button class="pill-button secondary" data-order="${orderId}" data-action="view">View Details</button>
        </div>
      </td>
    `;
    frag.appendChild(tr);
  });

  tbody.appendChild(frag);

  // optional details hook
  tbody.querySelectorAll('button[data-action="view"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-order");
      const row = rows.find(r => (r.order_id || "") === id);
      if (row && window.AdminView?.renderOrderDetails) {
        AdminView.renderOrderDetails(row);
      }
    });
  });
}



window.addEventListener("DOMContentLoaded", () => AdminController.init());

// TODO: wire “View Details” button to a modal with line items in the next phase.
