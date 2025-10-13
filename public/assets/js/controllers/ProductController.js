// public/assets/js/controllers/ProductController.js
import { ProductModel } from "../models/ProductModel.js";
import { ProductView } from "../views/ProductView.js";

const uuid = () =>
  (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const MAX_IMAGES = 8;
const SUPABASE_BASE_URL = window.__SUPABASE__?.url
  ? window.__SUPABASE__.url.replace(/\/+$/, "")
  : "";

const isVideoFile = (file) => Boolean(file?.type?.startsWith("video/"));

const encodePath = (path = "") =>
  path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const ensureAbsoluteMediaUrl = (value) => {
  if (typeof value !== "string" || !value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (!SUPABASE_BASE_URL) return value;
  const normalized = value.startsWith("product_media/")
    ? value
    : `product_media/${value.replace(/^public\//, "")}`;
  return `${SUPABASE_BASE_URL}/storage/v1/object/public/${encodePath(normalized)}`;
};

const uploadMediaSecure = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/.netlify/functions/upload-media", {
    method: "POST",
    body: formData,
  });

  const json = await response.json().catch(() => ({}));
  console.log("[ProductController] Response:", json);

  if (response.ok && json?.data?.publicUrl) {
    console.log("[UPLOAD SUCCESS]", json.data.publicUrl);
    return json.data.publicUrl;
  }

  const message = json?.message || `Upload failed: ${response.status}`;
  console.error("[ProductController] Upload Error:", json?.details || json);
  throw new Error(message);
};

export const ProductController = {
  init(admin) {
    if (this._initialized) return;
    this.admin = null;
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

    const resolvedAdmin = this.resolveAdminUser(admin);
    if (!resolvedAdmin) {
      console.error("[ProductController.init] Access denied: missing admin context");
      return;
    }

    ProductView.init(this);
    this.loadProducts();
    this._initialized = true;
  },

  resolveAdminUser(override) {
    if (override?.id && override?.role === "admin") {
      this.admin = override;
      return this.admin;
    }

    if (this.admin?.id && this.admin?.role === "admin") {
      return this.admin;
    }

    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      const role = stored?.role || localStorage.getItem("user_role") || "";
      if (stored?.id && role === "admin") {
        this.admin = { ...stored, role };
        return this.admin;
      }
    } catch (error) {
      console.warn("[ProductController.resolveAdminUser]", error);
    }

    return null;
  },

  async loadProducts() {
    const adminUser = this.resolveAdminUser();
    if (!adminUser) {
      console.warn("[ProductController.loadProducts] Access denied: admin only");
      return;
    }
    try {
      ProductView.showProductLoader?.(true);
      const response = await ProductModel.getAllProducts({
        adminId: adminUser.id,
        page: this.page,
        limit: this.limit,
        search: this.searchTerm,
        status: this.statusFilter,
      });
      console.log("[ProductController] Response:", response);

      const payload = response?.data;
      const products = Array.isArray(payload?.records)
        ? payload.records
        : Array.isArray(payload)
        ? payload
        : [];

      this.products = products.map((item) => ({
        ...item,
        images: Array.isArray(item?.images)
          ? item.images.map((image) => ensureAbsoluteMediaUrl(image))
          : [],
        video: ensureAbsoluteMediaUrl(item?.video),
      }));
      this.total =
        (typeof payload?.count === "number"
          ? payload.count
          : this.products.length) ?? this.products.length;
      ProductView.renderProductList({
        products: this.products,
        page: this.page,
        limit: this.limit,
        total: this.total,
      });
    } catch (error) {
      console.warn("[ProductController.loadProducts]", error);
      ProductView.showToast?.(error.message || "Failed to load products", "error");
    } finally {
      ProductView.showProductLoader?.(false);
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
    const adminUser = this.resolveAdminUser();
    const view = ProductView || {};

    const disableForm = (disabled) => {
      if (typeof view.setFormDisabled === "function") {
        view.setFormDisabled(disabled);
      }
    };
    const showToast = (message, type = "success") => {
      if (typeof view.showToast === "function") {
        view.showToast(message, type);
      } else {
        console[type === "error" ? "error" : "log"](`[toast:${type}]`, message);
      }
    };

    if (!adminUser?.id || adminUser.role !== "admin") {
      showToast("Access denied: admin only", "error");
      console.error("[ProductController.handleSubmit] Missing or unauthorized admin user", {
        adminUser,
      });
      return null;
    }

    try {
      disableForm(true);
      view.clearUploadProgress?.();

      const productData = formData || {};
      const imagesList = Array.isArray(productData.images) ? productData.images : [];
      const existingImageUrls = imagesList
        .filter((item) => typeof item === "string")
        .map((url) => ensureAbsoluteMediaUrl(url));

      const fileCtor = typeof File !== "undefined" ? File : null;
      const imageFiles =
        fileCtor && Array.isArray(imagesList)
          ? imagesList.filter((item) => item instanceof fileCtor && !isVideoFile(item))
          : [];

      const videoSource = productData.video;
      const videoFile =
        fileCtor && videoSource instanceof fileCtor && isVideoFile(videoSource)
          ? videoSource
          : null;
      const existingVideoUrl =
        typeof videoSource === "string" ? ensureAbsoluteMediaUrl(videoSource) : null;

      const uploadQueue = [
        ...imageFiles.map((file) => ({ kind: "image", file })),
        ...(videoFile ? [{ kind: "video", file: videoFile }] : []),
      ];

      let uploadedVideoUrl = existingVideoUrl;
      const uploadedImageUrls = [];

      for (const item of uploadQueue) {
        const progressId = `upload-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        ProductView.showUploadProgress?.(progressId, item.file.name || "Media file");
        try {
          const url = await uploadMediaSecure(item.file);
          if (item.kind === "video") {
            uploadedVideoUrl = url;
          } else {
            uploadedImageUrls.push(url);
          }
          ProductView.completeUploadProgress?.(progressId, "success", "Upload complete");
        } catch (error) {
          ProductView.completeUploadProgress?.(
            progressId,
            "error",
            error?.message || "Upload failed"
          );
          throw error;
        }
      }

      const finalImages = [...existingImageUrls, ...uploadedImageUrls]
        .map((item) => ensureAbsoluteMediaUrl(item))
        .slice(0, MAX_IMAGES);
      const videoUrl = ensureAbsoluteMediaUrl(uploadedVideoUrl) || null;

      if (!finalImages.length) {
        showToast("Please add at least one product image.", "error");
        return null;
      }

      this.setMediaState({ images: [...finalImages], video: videoUrl });
      view.renderImagePreviews?.(finalImages);
      view.renderVideoPreview?.(videoUrl);

      const toNumberOrNull = (value) => {
        if (value === null || value === undefined || value === "") return null;
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
      };

      const normalizedVariations = Array.isArray(productData.variations)
        ? productData.variations
            .map((variation) => {
              if (!variation) return null;
              const rawOptions = variation.options;
              const optionsArray = Array.isArray(rawOptions)
                ? rawOptions.map((opt) => String(opt || "").trim()).filter(Boolean)
                : String(rawOptions || "")
                    .split(",")
                    .map((opt) => opt.trim())
                    .filter(Boolean);
              return {
                name: String(variation.name || "").trim(),
                options: optionsArray,
                price: toNumberOrNull(variation.price) ?? 0,
                stock: toNumberOrNull(variation.stock) ?? 0,
              };
            })
            .filter(Boolean)
        : [];

      const normalizedAttributes =
        productData.attributes && typeof productData.attributes === "object"
          ? Object.entries(productData.attributes).reduce((acc, [key, value]) => {
              if (!key) return acc;
              acc[key] = typeof value === "string" ? value : String(value ?? "");
              return acc;
            }, {})
          : {};

      const payload = {
        name: String(productData.name || "").trim(),
        description: String(productData.description || ""),
        category: String(productData.category || "General").trim() || "General",
        price: toNumberOrNull(productData.price),
        stock: toNumberOrNull(productData.stock),
        sku: String(productData.sku || "").trim(),
        weight: toNumberOrNull(productData.weight),
        status: productData.status || "active",
        variations: normalizedVariations,
        attributes: normalizedAttributes,
        images: finalImages,
        video: videoUrl,
        min_qty: toNumberOrNull(productData.min_qty),
        max_qty: toNumberOrNull(productData.max_qty),
        user_id: adminUser.id,
      };

      const missingFields = [];
      if (!payload.name) missingFields.push("name");
      if (!payload.sku) missingFields.push("sku");
      if (payload.price === null) missingFields.push("price");
      if (payload.stock === null) missingFields.push("stock");
      if (payload.weight === null) missingFields.push("weight");

      if (missingFields.length) {
        showToast(`Please fill required fields: ${missingFields.join(", ")}`, "error");
        return null;
      }

      const requestPayload = {
        ...payload,
        ...(productData.id ? { id: productData.id } : {}),
      };

      console.log("[UPLOAD FIX] using service-role key and correct path");
      console.log("[ProductController.handleSubmit] Sending payload", {
        keys: Object.keys(requestPayload),
        size: JSON.stringify(requestPayload).length,
        isUpdate: Boolean(productData.id),
      });

      const response = await fetch("/.netlify/functions/admin-product-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      const json = await response.json().catch(() => ({}));
      console.log("[ProductController] Response:", json);

      if (response.ok && json?.data) {
        showToast(json.message || "✅ Product saved successfully");
        this.resetForm();
        await this.loadProducts();
        ProductView.scrollToTop?.();
        return json.data;
      }

      const errorMessage = json?.message || "Failed to save product";
      console.error("[ProductController.handleSubmit] Error response:", json?.details || json);
      const error = new Error(errorMessage);
      error.details = json?.details || json;
      throw error;
    } catch (error) {
      console.error("[ProductController.handleSubmit]", {
        status: error?.status,
        message: error?.message,
        body: error?.details,
      });
      showToast(error.message || "Failed to save product", "error");
      return null;
    } finally {
      disableForm(false);
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
        console.log("[ProductController] Response:", response);
        const payload = response?.data || response;
        const sanitized = payload
          ? {
              ...payload,
              images: Array.isArray(payload.images)
                ? payload.images.map((image) => ensureAbsoluteMediaUrl(image))
                : [],
              video: ensureAbsoluteMediaUrl(payload.video),
            }
          : payload;
        if (!sanitized) {
          throw new Error(response?.message || "Product not found");
        }
        ProductView.populateForm(sanitized);
        return;
      }
      ProductView.populateForm({
        ...product,
        images: Array.isArray(product.images)
          ? product.images.map((image) => ensureAbsoluteMediaUrl(image))
          : [],
        video: ensureAbsoluteMediaUrl(product.video),
      });
    } catch (error) {
      console.warn("[ProductController.handleEdit]", error);
      ProductView.showToast(error.message || "Failed to load product", "error");
    }
  },

  async handleDeleteConfirmed(productId) {
    try {
      const response = await ProductModel.deleteProduct({
        adminId: this.admin.id,
        id: productId,
      });
      console.log("[ProductController] Response:", response);
      if (!response?.data) {
        throw new Error(response?.message || "Failed to delete product.");
      }
      ProductView.showToast(response.message || "Product deleted");
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
    ProductView.resetForm?.();
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
      const payload = rows.map((row) => {
        const parsedImages =
          safeJSON(row.images) ||
          (row.images
            ? row.images
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : []);
        const normalizedImages = parsedImages.map((image) => ensureAbsoluteMediaUrl(image));

        return {
          name: row.name || "Untitled Product",
          description: row.description || "",
          category: row.category || "General",
          price: Number(row.price || 0),
          stock: Number(row.stock || 0),
          sku: row.sku || uuid(),
          weight: Number(row.weight || 0),
          variations: safeJSON(row.variations) || [],
          attributes: safeJSON(row.attributes) || {},
          images: normalizedImages,
          video: ensureAbsoluteMediaUrl(row.video || null),
          status: row.status || "active",
        };
      });

      ProductView.showBulkProgress(`Importing ${payload.length} products…`);
      const response = await ProductModel.bulkImport({
        adminId: this.admin.id,
        products: payload,
      });
      console.log("[ProductController] Response:", response);
      const count = response?.data?.count;
      const message = response?.message ||
        `Bulk import completed${typeof count === "number" ? ` (${count})` : ""}`;
      ProductView.showBulkProgress(message, false, true);
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
