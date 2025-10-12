// public/assets/js/controllers/ProductController.js
import { ProductModel } from "../models/ProductModel.js";
import { ProductView } from "../views/ProductView.js";

const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export const ProductController = {
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
        status: this.statusFilter,
      });
      this.products = Array.isArray(response?.data) ? response.data : [];
      this.total = response?.count ?? this.products.length;
      ProductView.renderProductList({
        products: this.products,
        page: this.page,
        limit: this.limit,
        total: this.total,
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
        max_qty: formData.max_qty ? Number(formData.max_qty) : null,
      };

      let response;
      if (formData.id) {
        response = await ProductModel.updateProduct({
          adminId: this.admin.id,
          id: formData.id,
          payload,
        });
        ProductView.showToast("Product updated successfully");
      } else {
        response = await ProductModel.createProduct({
          adminId: this.admin.id,
          payload,
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
          id: productId,
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
      stock: "",
    });
    ProductView.renderVariations(this.variations);
  },

  removeVariation(id) {
    this.variations = this.variations.filter((item) => item.id !== id);
    ProductView.renderVariations(this.variations);
  },

  updateVariation(id, field, value) {
    this.variations = this.variations.map((variation) =>
      variation.id === id ? { ...variation, [field]: value } : variation
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
    this.attributes = this.attributes.map((attr) =>
      attr.id === id ? { ...attr, [field]: value } : attr
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
      ProductView.showBulkProgress("Parsing file…");
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
        variations: safeJSON(row.variations) || [],
        attributes: safeJSON(row.attributes) || {},
        images: safeJSON(row.images) || (row.images ? row.images.split(",").map((s) => s.trim()).filter(Boolean) : []),
        video: row.video || null,
        status: row.status || "active",
      }));

      ProductView.showBulkProgress(`Importing ${payload.length} products…`);
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
  },
};

async function parseBulkFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (extension === "csv") {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data || []),
        error: (err) => reject(err),
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

function safeJSON(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
