// public/assets/js/views/ProductView.js
import { format } from "https://esm.sh/date-fns@3.6.0";

const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

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

export const ProductView = {
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
      const previews = combined.map((item) =>
        typeof item === "string"
          ? { url: item }
          : { file: item, url: URL.createObjectURL(item) }
      );
      this.renderImagePreviews(previews);
      this.controller.setMediaState({
        images: combined,
        video: this.controller.currentVideo,
      });
    });

    this.videoInput?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) {
        this.renderVideoPreview({ file, url: URL.createObjectURL(file) });
        this.controller.setMediaState({
          images: this.controller.currentImages,
          video: file,
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
      images: [...(this.controller.currentImages || [])],
      video: this.controller.currentVideo,
    };
    return product;
  },

  collectVariations() {
    const rows = this.variationList?.querySelectorAll(".variation-row") || [];
    return Array.from(rows).map((row) => ({
      name: row.querySelector("input[name='name']")?.value?.trim() || "",
      options:
        row
          .querySelector("input[name='options']")
          ?.value?.split(",")
          .map((opt) => opt.trim())
          .filter(Boolean) || [],
      price: Number(row.querySelector("input[name='price']")?.value || 0),
      stock: Number(row.querySelector("input[name='stock']")?.value || 0),
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
    this.variationList.innerHTML = variations
      .map(
        (variation) => `
          <div class="variation-row" data-id="${variation.id}">
            <div class="group-row">
              <div>
                <label>Variation Name</label>
                <input type="text" name="name" value="${variation.name || ""}" />
              </div>
              <div>
                <label>Options (comma separated)</label>
                <input type="text" name="options" value="${Array.isArray(variation.options) ? variation.options.join(", ") : (variation.options || "")}" />
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
      )
      .join("");

    const state = Array.from(
      this.variationList.querySelectorAll(".variation-row")
    ).map((row) => ({
      id: row.dataset.id,
      name: row.querySelector("input[name='name']")?.value || "",
      options: row.querySelector("input[name='options']")?.value || "",
      price: row.querySelector("input[name='price']")?.value || "",
      stock: row.querySelector("input[name='stock']")?.value || "",
    }));
    this.controller.setVariationState(state);
  },

  renderAttributes(attributes = []) {
    this.attributeList.innerHTML = attributes
      .map(
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
      )
      .join("");

    const state = Array.from(
      this.attributeList.querySelectorAll(".attribute-row")
    ).map((row) => ({
      id: row.dataset.id,
      key: row.querySelector("input[name='key']")?.value || "",
      value: row.querySelector("input[name='value']")?.value || "",
    }));
    this.controller.setAttributeState(state);
  },

  renderImagePreviews(items = []) {
    this.imagePreviews.innerHTML = items
      .map(
        (item, idx) => `
          <div class="media-thumb" data-index="${idx}" data-type="image">
            <img src="${item.url || item}" alt="preview" />
            <button type="button">×</button>
          </div>
        `
      )
      .join("");
  },

  renderVideoPreview(item) {
    this.videoPreview.innerHTML = item
      ? `
          <div class="media-thumb" data-type="video">
            <video src="${item.url || item}" controls></video>
            <button type="button">×</button>
          </div>
        `
      : "";
  },

  renderProductList({ products, page, limit, total }) {
    if (!this.productsBody) return;
    this.productsBody.innerHTML = products
      .map((product) => {
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
      })
      .join("");

    const maxPage = Math.ceil((total || 0) / (limit || 10)) || 1;
    if (this.pageInfo) this.pageInfo.textContent = `Page ${page} of ${maxPage}`;
  },

  setFormDisabled(disabled) {
    if (!this.form) return;
    Array.from(this.form.elements).forEach((el) => (el.disabled = disabled));
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
        options: Array.isArray(variation.options)
          ? variation.options.join(", ")
          : variation.options || "",
        price: variation.price || "",
        stock: variation.stock || "",
      }))
    );
    this.controller.setVariationState(
      Array.from(this.variationList.querySelectorAll(".variation-row")).map((row) => ({
        id: row.dataset.id,
        name: row.querySelector("input[name='name']").value,
        options: row.querySelector("input[name='options']").value,
        price: row.querySelector("input[name='price']").value,
        stock: row.querySelector("input[name='stock']").value,
      }))
    );

    const attributesEntries = product.attributes
      ? Object.entries(product.attributes).map(([key, value]) => ({
          id: crypto.randomUUID(),
          key,
          value,
        }))
      : [];
    this.renderAttributes(attributesEntries);
    this.controller.setAttributeState(attributesEntries);

    const images = product.images || [];
    this.renderImagePreviews(images.map((url) => ({ url })));
    this.controller.setMediaState({ images, video: product.video || null });
    this.renderVideoPreview(product.video ? { url: product.video } : null);

    this.scrollToTop();
  },

  renderImagePreviews(previews = []) {
    this.imagePreviews.innerHTML = previews
      .map(
        (item, idx) => `
          <div class="media-thumb" data-index="${idx}" data-type="image">
            <img src="${item.url || item}" alt="preview" />
            <button type="button" data-index="${idx}">×</button>
          </div>
        `
      )
      .join("");

    this.imagePreviews.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.index);
        const list = [...(this.controller.currentImages || [])];
        list.splice(index, 1);
        this.controller.setMediaState({ images: list, video: this.controller.currentVideo });
        this.renderImagePreviews(list.map((item) => (typeof item === "string" ? { url: item } : { url: URL.createObjectURL(item) })));
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
        <button type="button">×</button>
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
      setTimeout(() => (toast.hidden = true), 200);
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
    setTimeout(() => (this.deleteModal.hidden = true), 200);
  },

  setProductListLoading(show) {
    const tableWrapper = this.productsTable?.parentElement;
    if (!tableWrapper) return;
    tableWrapper.style.opacity = show ? 0.6 : 1;
  },

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  },
};
