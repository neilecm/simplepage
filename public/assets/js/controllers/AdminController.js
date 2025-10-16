// public/assets/js/controllers/AdminController.js
import { AdminModel } from "../models/AdminModel.js";
import { AdminView } from "../views/AdminView.js";
import { ProductController } from "./ProductController.js";

const FILTER_DEBOUNCE = 300;

export const AdminController = {
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
    ProductController.init(this.user);
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

    const page   = this.currentPage || 1;
    const limit  = this.pageSize || 10;           // ↓ default smaller for local speed
    const status = this.currentStatus || "all";
    const q      = (this.currentSearch || "").trim();
    const includeTotal = false;                   // set true only when you need totals

    const { data } = await window.OrdersModel.fetchOrders({ page, limit, status, q, includeTotal });
    this.orders = Array.isArray(data) ? data : [];

    this.applyFilters();
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
    AdminView.renderOrdersTable(filtered);
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

window.addEventListener("DOMContentLoaded", () => AdminController.init());

// TODO: wire “View Details” button to a modal with line items in the next phase.
