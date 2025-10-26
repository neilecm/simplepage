// public/assets/js/models/AdminModel.js
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers || {}
    },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data?.error || res.statusText);
    error.status = res.status;
    error.payload = data;
    throw error;
  }
  return data;
}
var AdminModel = {
  /**
   * Fetch orders from the admin Netlify function.
   * @param {{ adminId: string, status?: string, search?: string }} params
   */
  async fetchOrders({ adminId, status, search } = {}) {
    const query = new URLSearchParams();
    if (status && status !== "all") query.set("status", status);
    if (search) query.set("search", search);
    return request(
      `/.netlify/functions/admin-get-orders${query.size ? `?${query}` : ""}`,
      {
        method: "GET",
        headers: {
          "x-admin-id": adminId
        }
      }
    );
  },
  /**
   * Update order status through Netlify proxy.
   * @param {{ adminId: string, orderId: string, status: string }} params
   */
  async updateOrderStatus({ adminId, orderId, status }) {
    const result = await request("/.netlify/functions/admin-update-order", {
      method: "POST",
      headers: {
        "x-admin-id": adminId
      },
      body: JSON.stringify({
        order_id: orderId,
        status
      })
    });
    return result.order || result;
  },
  async fetchOrderDetails({ adminId, orderId }) {
    return request(
      `/.netlify/functions/admin-get-order-details?order_id=${encodeURIComponent(
        orderId
      )}`,
      {
        method: "GET",
        headers: {
          "x-admin-id": adminId
        }
      }
    );
  }
};

// public/assets/js/views/AdminView.js
var STATUS_BADGES = {
  pending: "badge badge-pending",
  paid: "badge badge-paid",
  shipped: "badge badge-shipped",
  completed: "badge badge-completed",
  cancelled: "badge badge-cancelled",
  delivered: "badge badge-completed"
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
    minute: "2-digit"
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
    order.address_data
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
    phone: address.phone || address.receiver_phone || ""
  };
}
var AdminView = {
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
      setTimeout(() => this.toastEl.hidden = true, 200);
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
    const options = statuses.map(
      (value) => `<option value="${value}" ${value === current ? "selected" : ""}>${value.toUpperCase()}</option>`
    ).join("");
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
    this.modalContent.innerHTML = `<p class="modal-value">Loading order details\u2026</p>`;
    this.openModal();
  },
  renderOrderDetails(order) {
    this.cache();
    if (!this.modalContent) return;
    const status = String(order.status || "pending").toLowerCase();
    const badgeClass = STATUS_BADGES[status] || STATUS_BADGES.pending;
    const address = extractAddress(order);
    const items = parseItemsField(order.items);
    const addressHTML = address ? `<div>
          <span class="modal-label">Address</span>
          <p class="modal-value">${address.street || "-"}<br />
            ${[address.district, address.city, address.province].filter(Boolean).join(", ")}
            ${address.postal_code ? ` ${address.postal_code}` : ""}
          </p>
        </div>` : `<div><span class="modal-label">Address</span><p class="modal-value">-</p></div>`;
    const itemsTable = items.length ? `<table class="modal-items">
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            ${items.map((item) => {
      const qty = Number(item.qty || item.quantity || 1);
      const price = Number(item.price || 0);
      const subtotal = price * qty;
      return `<tr>
                  <td>${item.name || item.title || "Unnamed item"}</td>
                  <td>${qty}</td>
                  <td>${formatCurrency(price)}</td>
                  <td>${formatCurrency(subtotal)}</td>
                </tr>`;
    }).join("")}
          </tbody>
        </table>` : `<p class="modal-value">No items recorded.</p>`;
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
  }
};

// public/assets/js/models/ProductModel.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
var BUCKET = "product_media";
var SUPABASE_URL = window.__SUPABASE__?.url;
var SUPABASE_ANON_KEY = window.__SUPABASE__?.anonKey;
var supabaseClient = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn("\u26A0\uFE0F Supabase configuration missing for ProductModel upload operations.");
}
async function request2(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers || {}
    },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data?.error || res.statusText);
    error.status = res.status;
    error.payload = data;
    throw error;
  }
  return data;
}
function ensureClient() {
  if (!supabaseClient) {
    throw new Error("Supabase client not configured for media uploads.");
  }
  return supabaseClient;
}
async function uploadSingleFile(file, folder) {
  const client = ensureClient();
  const ext = file.name.split(".").pop();
  const safeName = `${folder}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  const { error } = await client.storage.from(BUCKET).upload(safeName, file, {
    cacheControl: "3600",
    upsert: false
  });
  if (error) {
    throw new Error(error.message);
  }
  const { data } = client.storage.from(BUCKET).getPublicUrl(safeName);
  return data?.publicUrl;
}
var ProductModel = {
  async getAllProducts({ adminId, page = 1, limit = 10, search = "", status = "all" }) {
    const query = new URLSearchParams();
    query.set("page", page);
    query.set("limit", limit);
    if (search) query.set("search", search);
    if (status && status !== "all") query.set("status", status);
    return request2(`/.netlify/functions/admin-products-get?${query}`, {
      method: "GET",
      headers: { "x-admin-id": adminId }
    });
  },
  async getProductById({ adminId, id }) {
    return request2(`/.netlify/functions/admin-products-get?id=${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "x-admin-id": adminId }
    });
  },
  async createProduct({ adminId, payload }) {
    return request2("/.netlify/functions/admin-product-save", {
      method: "POST",
      headers: { "x-admin-id": adminId },
      body: JSON.stringify(payload)
    });
  },
  async updateProduct({ adminId, id, payload }) {
    return request2("/.netlify/functions/admin-product-save", {
      method: "POST",
      headers: { "x-admin-id": adminId },
      body: JSON.stringify({ id, ...payload })
    });
  },
  async deleteProduct({ adminId, id }) {
    return request2("/.netlify/functions/admin-product-delete", {
      method: "POST",
      headers: { "x-admin-id": adminId },
      body: JSON.stringify({ id })
    });
  },
  async bulkImport({ adminId, products }) {
    return request2("/.netlify/functions/admin-products-bulk", {
      method: "POST",
      headers: { "x-admin-id": adminId },
      body: JSON.stringify({ products })
    });
  },
  async uploadImages(files, adminId) {
    if (!files?.length) return [];
    const urls = [];
    for (const file of files) {
      if (!file) continue;
      const url = await uploadSingleFile(file, `${adminId}/images`);
      if (url) urls.push(url);
    }
    return urls;
  },
  async uploadVideo(file, adminId) {
    if (!file) return null;
    return uploadSingleFile(file, `${adminId}/videos`);
  }
};

// public/assets/js/views/ProductView.js
import { format } from "https://esm.sh/date-fns@3.6.0";

// public/assets/js/utils/uuid.js
var uuid = () => crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

// public/assets/js/views/ProductView.js
function safeFormatDate(value) {
  if (!value) return "-";
  try {
    return format(new Date(value), "d MMM yyyy HH:mm");
  } catch {
    return value;
  }
}
function currency(value) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}
var ProductView = {
  init(controller) {
    this.controller = controller;
    this.cache();
    this.bindEvents();
    this.renderVariations([]);
    this.renderAttributes([]);
  },
  cache() {
    this.form = document.getElementById("product-form");
    this.resetBtn = document.getElementById("product-reset");
    this.imageInput = document.getElementById("product-images");
    this.videoInput = document.getElementById("product-video");
    this.imagePreviews = document.getElementById("image-previews");
    this.videoPreview = document.getElementById("video-preview");
    this.variationList = document.getElementById("variation-list");
    this.attributeList = document.getElementById("attribute-list");
    this.addVariationBtn = document.getElementById("add-variation");
    this.addAttributeBtn = document.getElementById("add-attribute");
    this.productsBody = document.getElementById("products-body");
    this.productsTable = document.getElementById("products-table");
    this.pageInfo = document.getElementById("product-page-info");
    this.prevBtn = document.getElementById("product-prev");
    this.nextBtn = document.getElementById("product-next");
    this.searchInput = document.getElementById("product-search");
    this.statusFilter = document.getElementById("product-status-filter");
    this.bulkFile = document.getElementById("product-bulk-file");
    this.bulkUploadBtn = document.getElementById("product-bulk-upload");
    this.bulkProgress = document.getElementById("product-bulk-progress");
    this.deleteModal = document.getElementById("product-delete-modal");
    this.deleteMessage = document.getElementById("product-delete-message");
    this.deleteConfirm = document.getElementById("product-delete-confirm");
    this.deleteCancel = document.getElementById("product-delete-cancel");
    this.deleteClose = document.getElementById("product-delete-close");
    this.toast = document.getElementById("admin-toast");
    this.modal = document.getElementById("order-modal");
  },
  bindEvents() {
    if (this.form) {
      this.form.addEventListener("submit", (event) => {
        event.preventDefault();
        this.controller.handleSubmit(this.getFormData());
      });
    }
    this.resetBtn?.addEventListener("click", () => this.controller.resetForm());
    this.addVariationBtn?.addEventListener("click", () => this.controller.addVariation());
    this.addAttributeBtn?.addEventListener("click", () => this.controller.addAttribute());
    this.imageInput?.addEventListener("change", (event) => {
      const files = Array.from(event.target.files || []);
      const existing = (this.controller.currentImages || []).filter(
        (item) => typeof item === "string"
      );
      const combined = [...files, ...existing];
      const previews = combined.map(
        (item) => typeof item === "string" ? { url: item } : { file: item, url: URL.createObjectURL(item) }
      );
      this.renderImagePreviews(previews);
      this.controller.setMediaState({
        images: combined,
        video: this.controller.currentVideo
      });
    });
    this.videoInput?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) {
        this.renderVideoPreview({ file, url: URL.createObjectURL(file) });
        this.controller.setMediaState({
          images: this.controller.currentImages,
          video: file
        });
      }
    });
    this.variationList?.addEventListener("input", (event) => {
      const row = event.target.closest(".variation-row");
      if (!row) return;
      const id = row.dataset.id;
      const field = event.target.name;
      this.controller.updateVariation(id, field, event.target.value);
    });
    this.variationList?.addEventListener("click", (event) => {
      if (event.target.matches(".variation-remove")) {
        const id = event.target.closest(".variation-row")?.dataset.id;
        if (id) this.controller.removeVariation(id);
      }
    });
    this.attributeList?.addEventListener("input", (event) => {
      const row = event.target.closest(".attribute-row");
      if (!row) return;
      const id = row.dataset.id;
      const field = event.target.name;
      this.controller.updateAttribute(id, field, event.target.value);
    });
    this.attributeList?.addEventListener("click", (event) => {
      if (event.target.matches(".attribute-remove")) {
        const id = event.target.closest(".attribute-row")?.dataset.id;
        if (id) this.controller.removeAttribute(id);
      }
    });
    this.productsBody?.addEventListener("click", (event) => {
      const editBtn = event.target.closest(".edit-btn");
      const deleteBtn = event.target.closest(".delete-btn");
      const productId = editBtn?.dataset.id || deleteBtn?.dataset.id;
      if (!productId) return;
      if (editBtn) {
        this.controller.handleEdit(productId);
      } else if (deleteBtn) {
        this.showDeleteModal(productId);
      }
    });
    this.prevBtn?.addEventListener("click", () => this.controller.changePage(-1));
    this.nextBtn?.addEventListener("click", () => this.controller.changePage(1));
    this.searchInput?.addEventListener("input", (event) => {
      this.controller.setSearch(event.target.value.trim());
    });
    this.statusFilter?.addEventListener("change", (event) => {
      this.controller.setStatusFilter(event.target.value);
    });
    this.bulkUploadBtn?.addEventListener("click", () => {
      const file = this.bulkFile?.files?.[0];
      if (!file) {
        this.showBulkProgress("Select a CSV or XLSX file first", true);
        return;
      }
      this.controller.handleBulkImport(file);
    });
    this.deleteCancel?.addEventListener("click", () => this.closeDeleteModal());
    this.deleteClose?.addEventListener("click", () => this.closeDeleteModal());
  },
  getFormData() {
    const formData = new FormData(this.form);
    const product = {
      id: this.form.dataset.editing || null,
      name: formData.get("product-name")?.trim(),
      description: formData.get("product-description")?.trim(),
      category: formData.get("product-category")?.trim(),
      price: formData.get("product-price"),
      stock: formData.get("product-stock"),
      sku: formData.get("product-sku")?.trim(),
      weight: formData.get("product-weight"),
      status: formData.get("product-status") || "active",
      min_qty: formData.get("product-min-qty"),
      max_qty: formData.get("product-max-qty"),
      variations: this.collectVariations(),
      attributes: this.collectAttributes(),
      images: [...this.controller.currentImages || []],
      video: this.controller.currentVideo
    };
    return product;
  },
  collectVariations() {
    const rows = this.variationList?.querySelectorAll(".variation-row") || [];
    return Array.from(rows).map((row) => ({
      name: row.querySelector("input[name='name']")?.value?.trim() || "",
      options: row.querySelector("input[name='options']")?.value?.split(",").map((opt) => opt.trim()).filter(Boolean) || [],
      price: Number(row.querySelector("input[name='price']")?.value || 0),
      stock: Number(row.querySelector("input[name='stock']")?.value || 0)
    }));
  },
  collectAttributes() {
    const rows = this.attributeList?.querySelectorAll(".attribute-row") || [];
    const attributes = {};
    Array.from(rows).forEach((row) => {
      const key = row.querySelector("input[name='key']")?.value?.trim();
      const value = row.querySelector("input[name='value']")?.value?.trim();
      if (key) attributes[key] = value || "";
    });
    return attributes;
  },
  renderVariations(variations = []) {
    this.variationList.innerHTML = variations.map(
      (variation) => `
          <div class="variation-row" data-id="${variation.id}">
            <div class="group-row">
              <div>
                <label>Variation Name</label>
                <input type="text" name="name" value="${variation.name || ""}" />
              </div>
              <div>
                <label>Options (comma separated)</label>
                <input type="text" name="options" value="${Array.isArray(variation.options) ? variation.options.join(", ") : variation.options || ""}" />
              </div>
            </div>
            <div class="group-row" style="margin-top:10px;">
              <div>
                <label>Price</label>
                <input type="number" name="price" value="${variation.price || ""}" />
              </div>
              <div>
                <label>Stock</label>
                <input type="number" name="stock" value="${variation.stock || ""}" />
              </div>
              <button type="button" class="variation-remove" style="align-self:end;">Remove</button>
            </div>
          </div>
        `
    ).join("");
    const state = Array.from(
      this.variationList.querySelectorAll(".variation-row")
    ).map((row) => ({
      id: row.dataset.id,
      name: row.querySelector("input[name='name']")?.value || "",
      options: row.querySelector("input[name='options']")?.value || "",
      price: row.querySelector("input[name='price']")?.value || "",
      stock: row.querySelector("input[name='stock']")?.value || ""
    }));
    this.controller.setVariationState(state);
  },
  renderAttributes(attributes = []) {
    this.attributeList.innerHTML = attributes.map(
      (attribute) => `
          <div class="attribute-row" data-id="${attribute.id}">
            <div class="group-row">
              <div>
                <label>Attribute</label>
                <input type="text" name="key" value="${attribute.key || ""}" />
              </div>
              <div>
                <label>Value</label>
                <input type="text" name="value" value="${attribute.value || ""}" />
              </div>
              <button type="button" class="attribute-remove" style="align-self:end;">Remove</button>
            </div>
          </div>
        `
    ).join("");
    const state = Array.from(
      this.attributeList.querySelectorAll(".attribute-row")
    ).map((row) => ({
      id: row.dataset.id,
      key: row.querySelector("input[name='key']")?.value || "",
      value: row.querySelector("input[name='value']")?.value || ""
    }));
    this.controller.setAttributeState(state);
  },
  renderImagePreviews(items = []) {
    this.imagePreviews.innerHTML = items.map(
      (item, idx) => `
          <div class="media-thumb" data-index="${idx}" data-type="image">
            <img src="${item.url || item}" alt="preview" />
            <button type="button">\xD7</button>
          </div>
        `
    ).join("");
  },
  renderVideoPreview(item) {
    this.videoPreview.innerHTML = item ? `
          <div class="media-thumb" data-type="video">
            <video src="${item.url || item}" controls></video>
            <button type="button">\xD7</button>
          </div>
        ` : "";
  },
  renderProductList({ products, page, limit, total }) {
    if (!this.productsBody) return;
    this.productsBody.innerHTML = products.map((product) => {
      const thumb = product.images?.[0] || "https://placehold.co/80x80/FFF5F5/E63446?text=No+Image";
      return `
          <tr>
            <td><img src="${thumb}" alt="${product.name}" /></td>
            <td>
              <strong>${product.name}</strong><br />
              <small>SKU: ${product.sku || "-"}</small>
            </td>
            <td>${currency(product.price)}</td>
            <td>${product.stock ?? 0}</td>
            <td>${(product.status || "active").toUpperCase()}</td>
            <td>${safeFormatDate(product.created_at)}</td>
            <td>
              <div class="row-actions">
                <button class="edit-btn" data-id="${product.id}">Edit</button>
                <button class="delete-btn" data-id="${product.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
    }).join("");
    const maxPage = Math.ceil((total || 0) / (limit || 10)) || 1;
    if (this.pageInfo) this.pageInfo.textContent = `Page ${page} of ${maxPage}`;
  },
  setFormDisabled(disabled) {
    if (!this.form) return;
    Array.from(this.form.elements).forEach((el) => el.disabled = disabled);
  },
  resetForm() {
    this.form?.reset();
    this.form.dataset.editing = "";
    this.renderImagePreviews([]);
    this.renderVideoPreview(null);
    this.renderVariations([]);
    this.renderAttributes([]);
  },
  populateForm(product) {
    if (!this.form) return;
    this.form.dataset.editing = product.id;
    this.form.querySelector("#product-name").value = product.name || "";
    this.form.querySelector("#product-description").value = product.description || "";
    this.form.querySelector("#product-category").value = product.category || "";
    this.form.querySelector("#product-price").value = product.price ?? "";
    this.form.querySelector("#product-stock").value = product.stock ?? "";
    this.form.querySelector("#product-sku").value = product.sku || "";
    this.form.querySelector("#product-weight").value = product.weight ?? "";
    const statusEl = this.form.querySelector("#product-status");
    if (statusEl) statusEl.value = product.status || "active";
    this.form.querySelector("#product-min-qty").value = product.min_qty ?? "";
    this.form.querySelector("#product-max-qty").value = product.max_qty ?? "";
    this.renderVariations(
      (product.variations || []).map((variation) => ({
        id: crypto.randomUUID(),
        name: variation.name || "",
        options: Array.isArray(variation.options) ? variation.options.join(", ") : variation.options || "",
        price: variation.price || "",
        stock: variation.stock || ""
      }))
    );
    this.controller.setVariationState(
      Array.from(this.variationList.querySelectorAll(".variation-row")).map((row) => ({
        id: row.dataset.id,
        name: row.querySelector("input[name='name']").value,
        options: row.querySelector("input[name='options']").value,
        price: row.querySelector("input[name='price']").value,
        stock: row.querySelector("input[name='stock']").value
      }))
    );
    const attributesEntries = product.attributes ? Object.entries(product.attributes).map(([key, value]) => ({
      id: crypto.randomUUID(),
      key,
      value
    })) : [];
    this.renderAttributes(attributesEntries);
    this.controller.setAttributeState(attributesEntries);
    const images = product.images || [];
    this.renderImagePreviews(images.map((url) => ({ url })));
    this.controller.setMediaState({ images, video: product.video || null });
    this.renderVideoPreview(product.video ? { url: product.video } : null);
    this.scrollToTop();
  },
  renderImagePreviews(previews = []) {
    this.imagePreviews.innerHTML = previews.map(
      (item, idx) => `
          <div class="media-thumb" data-index="${idx}" data-type="image">
            <img src="${item.url || item}" alt="preview" />
            <button type="button" data-index="${idx}">\xD7</button>
          </div>
        `
    ).join("");
    this.imagePreviews.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.index);
        const list = [...this.controller.currentImages || []];
        list.splice(index, 1);
        this.controller.setMediaState({ images: list, video: this.controller.currentVideo });
        this.renderImagePreviews(list.map((item) => typeof item === "string" ? { url: item } : { url: URL.createObjectURL(item) }));
      });
    });
  },
  renderVideoPreview(item) {
    if (!item) {
      this.videoPreview.innerHTML = "";
      return;
    }
    this.videoPreview.innerHTML = `
      <div class="media-thumb" data-type="video">
        <video src="${item.url || item}" controls></video>
        <button type="button">\xD7</button>
      </div>
    `;
    const btn = this.videoPreview.querySelector("button");
    btn?.addEventListener("click", () => {
      this.controller.setMediaState({ images: this.controller.currentImages, video: null });
      this.renderVideoPreview(null);
    });
  },
  showProductLoader(show) {
    const card = this.productsTable?.closest(".product-card");
    if (!card) return;
    card.style.opacity = show ? 0.5 : 1;
  },
  showBulkProgress(message, isError = false, autoHide = false) {
    if (!this.bulkProgress) return;
    this.bulkProgress.style.display = "block";
    this.bulkProgress.style.color = isError ? "#b91c1c" : "#6b7280";
    this.bulkProgress.textContent = message;
    if (autoHide) {
      setTimeout(() => {
        this.bulkProgress.style.display = "none";
        this.clearBulkInput();
      }, 2500);
    }
  },
  clearBulkInput() {
    if (this.bulkFile) this.bulkFile.value = "";
  },
  showToast(message, type = "success") {
    const toast = document.getElementById("admin-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle("error", type === "error");
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("show"));
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.hidden = true, 200);
    }, 2500);
  },
  showDeleteModal(productId) {
    if (!this.deleteModal) return;
    this.deleteModal.hidden = false;
    requestAnimationFrame(() => this.deleteModal.classList.add("show"));
    this.deleteConfirm.dataset.id = productId;
    this.deleteConfirm.onclick = () => this.controller.handleDeleteConfirmed(productId);
    if (this.deleteMessage) {
      const product = this.controller.products?.find((item) => item.id === productId);
      const name = product?.name || productId;
      this.deleteMessage.textContent = `Are you sure you want to delete "${name}"?`;
    }
  },
  closeDeleteModal() {
    if (!this.deleteModal) return;
    this.deleteModal.classList.remove("show");
    this.deleteConfirm.dataset.id = "";
    setTimeout(() => this.deleteModal.hidden = true, 200);
  },
  setProductListLoading(show) {
    const tableWrapper = this.productsTable?.parentElement;
    if (!tableWrapper) return;
    tableWrapper.style.opacity = show ? 0.6 : 1;
  },
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

// public/assets/js/controllers/ProductController.js
var ProductController = {
  init(admin) {
    if (this._initialized) return;
    this.admin = admin;
    this.page = 1;
    this.limit = 10;
    this.searchTerm = "";
    this.statusFilter = "all";
    this.total = 0;
    this.products = [];
    this.currentEditingId = null;
    this.currentImages = [];
    this.currentVideo = null;
    this.variations = [];
    this.attributes = [];
    ProductView.init(this);
    this.loadProducts();
    this._initialized = true;
  },
  async loadProducts() {
    if (!this.admin) return;
    try {
      ProductView.showProductLoader(true);
      const response = await ProductModel.getAllProducts({
        adminId: this.admin.id,
        page: this.page,
        limit: this.limit,
        search: this.searchTerm,
        status: this.statusFilter
      });
      this.products = Array.isArray(response?.data) ? response.data : [];
      this.total = response?.count ?? this.products.length;
      ProductView.renderProductList({
        products: this.products,
        page: this.page,
        limit: this.limit,
        total: this.total
      });
    } catch (error) {
      console.warn("[ProductController.loadProducts]", error);
      ProductView.showToast(error.message || "Failed to load products", "error");
    } finally {
      ProductView.showProductLoader(false);
    }
  },
  setSearch(term) {
    this.searchTerm = term;
    this.page = 1;
    this.loadProducts();
  },
  setStatusFilter(status) {
    this.statusFilter = status;
    this.page = 1;
    this.loadProducts();
  },
  async handleSubmit(formData) {
    if (!this.admin) return;
    try {
      ProductView.setFormDisabled(true);
      const imagesToUpload = formData.images.filter((item) => item instanceof File);
      const preservedImages = formData.images.filter((item) => typeof item === "string");
      const uploadedImages = await ProductModel.uploadImages(imagesToUpload, this.admin.id);
      const finalImages = [...preservedImages, ...uploadedImages].slice(0, 8);
      let videoUrl = formData.video;
      if (formData.video instanceof File) {
        videoUrl = await ProductModel.uploadVideo(formData.video, this.admin.id);
      }
      this.setMediaState({ images: finalImages, video: videoUrl || null });
      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: Number(formData.price || 0),
        stock: Number(formData.stock || 0),
        sku: formData.sku,
        weight: Number(formData.weight || 0),
        status: formData.status,
        variations: formData.variations,
        attributes: formData.attributes,
        images: finalImages,
        video: videoUrl || null,
        min_qty: formData.min_qty ? Number(formData.min_qty) : null,
        max_qty: formData.max_qty ? Number(formData.max_qty) : null
      };
      let response;
      if (formData.id) {
        response = await ProductModel.updateProduct({
          adminId: this.admin.id,
          id: formData.id,
          payload
        });
        ProductView.showToast("Product updated successfully");
      } else {
        response = await ProductModel.createProduct({
          adminId: this.admin.id,
          payload
        });
        ProductView.showToast("Product created successfully");
      }
      this.resetForm();
      this.loadProducts();
      ProductView.scrollToTop();
      return response?.product;
    } catch (error) {
      console.warn("[ProductController.handleSubmit]", error);
      ProductView.showToast(error.message || "Failed to save product", "error");
    } finally {
      ProductView.setFormDisabled(false);
    }
  },
  async handleEdit(productId) {
    try {
      const product = this.products.find((item) => item.id === productId);
      if (!product) {
        const response = await ProductModel.getProductById({
          adminId: this.admin.id,
          id: productId
        });
        ProductView.populateForm(response);
        return;
      }
      ProductView.populateForm(product);
    } catch (error) {
      console.warn("[ProductController.handleEdit]", error);
      ProductView.showToast(error.message || "Failed to load product", "error");
    }
  },
  async handleDeleteConfirmed(productId) {
    try {
      await ProductModel.deleteProduct({ adminId: this.admin.id, id: productId });
      ProductView.showToast("Product deleted");
      ProductView.closeDeleteModal();
      this.loadProducts();
    } catch (error) {
      console.warn("[ProductController.handleDeleteConfirmed]", error);
      ProductView.showToast(error.message || "Failed to delete product", "error");
    }
  },
  resetForm() {
    this.currentEditingId = null;
    this.currentImages = [];
    this.currentVideo = null;
    this.variations = [];
    this.attributes = [];
    this.setMediaState({ images: [], video: null });
    ProductView.resetForm();
  },
  addVariation() {
    this.variations.push({
      id: uuid(),
      name: "",
      options: "",
      price: "",
      stock: ""
    });
    ProductView.renderVariations(this.variations);
  },
  removeVariation(id) {
    this.variations = this.variations.filter((item) => item.id !== id);
    ProductView.renderVariations(this.variations);
  },
  updateVariation(id, field, value) {
    this.variations = this.variations.map(
      (variation) => variation.id === id ? { ...variation, [field]: value } : variation
    );
  },
  addAttribute() {
    this.attributes.push({ id: uuid(), key: "", value: "" });
    ProductView.renderAttributes(this.attributes);
  },
  removeAttribute(id) {
    this.attributes = this.attributes.filter((item) => item.id !== id);
    ProductView.renderAttributes(this.attributes);
  },
  updateAttribute(id, field, value) {
    this.attributes = this.attributes.map(
      (attr) => attr.id === id ? { ...attr, [field]: value } : attr
    );
  },
  setMediaState({ images, video }) {
    this.currentImages = Array.isArray(images) ? images : [];
    this.currentVideo = video || null;
  },
  setVariationState(list) {
    this.variations = list;
  },
  setAttributeState(list) {
    this.attributes = list;
  },
  async handleBulkImport(file) {
    if (!file) return;
    try {
      ProductView.showBulkProgress("Parsing file\u2026");
      const rows = await parseBulkFile(file);
      if (!rows.length) {
        ProductView.showBulkProgress("No rows detected", true);
        return;
      }
      const payload = rows.map((row) => ({
        name: row.name || "Untitled Product",
        description: row.description || "",
        category: row.category || "General",
        price: Number(row.price || 0),
        stock: Number(row.stock || 0),
        sku: row.sku || uuid(),
        weight: Number(row.weight || 0),
        variations: safeJSON2(row.variations) || [],
        attributes: safeJSON2(row.attributes) || {},
        images: safeJSON2(row.images) || (row.images ? row.images.split(",").map((s) => s.trim()).filter(Boolean) : []),
        video: row.video || null,
        status: row.status || "active"
      }));
      ProductView.showBulkProgress(`Importing ${payload.length} products\u2026`);
      await ProductModel.bulkImport({ adminId: this.admin.id, products: payload });
      ProductView.showBulkProgress("Bulk import completed", false, true);
      this.page = 1;
      this.loadProducts();
    } catch (error) {
      console.warn("[ProductController.handleBulkImport]", error);
      ProductView.showBulkProgress(error.message || "Bulk import failed", true);
    }
  },
  changePage(delta) {
    const maxPage = Math.ceil((this.total || 0) / this.limit) || 1;
    const nextPage = this.page + delta;
    if (nextPage < 1 || nextPage > maxPage) return;
    this.page = nextPage;
    this.loadProducts();
  }
};
async function parseBulkFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (extension === "csv") {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data || []),
        error: (err) => reject(err)
      });
    });
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      resolve(json);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
function safeJSON2(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// public/assets/js/models/AdminOrdersModelV2.js
var AdminOrdersModelV2 = {
  async list({ page = 1, limit = 10, q = "", status = "all" } = {}) {
    const params = new URLSearchParams({ page, limit, q, status });
    const res = await fetch(`/.netlify/functions/admin-get-orders-view?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};

// public/assets/js/controllers/AdminController.js
var FILTER_DEBOUNCE = 300;
var __useAdminV2 = /(?:^|[?&])v=2(?:&|$)/.test(location.search);
async function __fetchOrders({ page = 1, limit = 10, q = "", status = "all", adminId } = {}) {
  if (__useAdminV2 && AdminOrdersModelV2) {
    return AdminOrdersModelV2.list({ page, limit, q, status });
  }
  return AdminModel.fetchOrders({ adminId });
}
var AdminController = {
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
    this.tabButtons?.forEach(
      (button) => button.addEventListener("click", () => this.switchTab(button.dataset.tab))
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
      const response = await __fetchOrders({
        adminId: this.user.id,
        // used by legacy path only
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
        AdminView.renderOrdersTable(this.orders);
      } else {
        AdminView.renderOrdersTable(this.orders);
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
        return name.includes(term) || email.includes(term) || id.includes(term);
      });
    }
    this.filteredOrders = filtered;
    if (__useAdminV2) {
      AdminView.renderOrdersTable(filtered);
    } else {
      AdminView.renderOrdersTable(filtered);
    }
  },
  switchTab(tab) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.tabButtons?.forEach(
      (button) => button.classList.toggle("active", button.dataset.tab === tab)
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
        status
      });
      const index = this.orders.findIndex((o) => o.order_id === orderId);
      if (index >= 0) {
        this.orders[index] = { ...this.orders[index], ...updated };
      } else {
        this.orders.push(updated);
      }
      this.applyFilters();
      AdminView.showToast(`\u2714 Order ${orderId} marked as ${(updated.status || status).toUpperCase()}.`);
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
        orderId
      });
      AdminView.renderOrderDetails(detail);
    } catch (error) {
      console.warn("[AdminController.showOrderDetails]", error);
      AdminView.closeModal();
      AdminView.showToast(error.message || "Failed to load order details.", "error");
    }
  }
};

// public/assets/js/admin-main.js
window.AdminController = AdminController;
window.AdminView = AdminView;
window.ProductController = ProductController;
window.ProductView = ProductView;
window.AdminModel = AdminModel;
window.ProductModel = ProductModel;
window.AdminOrdersModelV2 = AdminOrdersModelV2;
window.uuid = uuid;
window.addEventListener("DOMContentLoaded", () => {
  AdminController.init();
});
