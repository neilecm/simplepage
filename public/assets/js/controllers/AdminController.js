// public/assets/js/controllers/AdminController.js
import { AdminModel } from "../models/AdminModel.js";
import { AdminView } from "../views/AdminView.js";

const FILTER_DEBOUNCE = 300;

export const AdminController = {
  init() {
    this.cacheElements();
    this.bindEvents();
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
  },

  cacheElements() {
    this.searchInput = document.getElementById("order-search");
    this.filterSelect = document.getElementById("order-status-filter");
    this.table = document.getElementById("orders-table");
    this.logoutBtn = document.getElementById("admin-logout");
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
      this.filterSelect.addEventListener("change", () => this.loadOrders());
    }

    if (this.searchInput) {
      let debounceTimer;
      this.searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.loadOrders(), FILTER_DEBOUNCE);
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
        console.info("[AdminController] View details clicked:", orderId);
        alert("Order detail modal coming soon!");
      }
    });
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
      const status = this.filterSelect?.value || "all";
      const search = this.searchInput?.value?.trim() || "";

      const orders = await AdminModel.fetchOrders({
        adminId: this.user.id,
        status,
        search,
      });

      AdminView.renderOrdersTable(orders);
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

  async updateOrderStatus(orderId, status, previousStatus, selectEl) {
    if (!orderId) return;
    try {
      const updated = await AdminModel.updateOrderStatus({
        adminId: this.user.id,
        orderId,
        status,
      });
      AdminView.updateOrderRow(updated);
      if (selectEl) {
        selectEl.dataset.current = updated.status || status;
        selectEl.disabled = false;
      }
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
};

window.addEventListener("DOMContentLoaded", () => AdminController.init());

// TODO: wire “View Details” button to a modal with line items in the next phase.
