// public/assets/js/controllers/VendorController.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { VendorModel } from "../models/VendorModel.js";

const SUPABASE_URL =
  window.__SUPABASE__?.url || "https://cdadixyavaxkzjovrlek.supabase.co";
const SUPABASE_ANON_KEY =
  window.__SUPABASE__?.anonKey ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkYWRpeHlhdmF4a3pqb3ZybGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NTcwNTEsImV4cCI6MjA3NDUzMzA1MX0.8SrOwwxy7rzBcM3ctFyLQ93hQy2OjsVp8ZbKGGx8kcc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const VendorController = {
  /**
   * Bootstrap dashboard: wire events, resolve Supabase session, load vendor + products.
   */
  async init() {
    this.state = {
      userId: "",
      vendor: null,
      isEditing: false,
    };

    this.cacheElements();
    this.bindEvents();
    await this.refreshSessionAndVendor();
  },

  /**
   * Collect frequently used DOM nodes to avoid repeated lookups.
   */
  cacheElements() {
    this.elements = {
      registerForm: document.getElementById("vendor-register-form"),
      registerSubmit: document.getElementById("register-submit"),
      productForm: document.getElementById("vendor-product-form"),
      productsContainer: document.getElementById("vendor-products"),
      statusBox: document.getElementById("vendor-status"),
      vendorNameLabel: document.getElementById("vendor-name-label"),
      registerSection: document.getElementById("register-section"),
      dashboardSection: document.getElementById("dashboard-section"),
      vendorInfoCard: document.getElementById("vendor-info"),
      vendorName: document.getElementById("vendor-name"),
      vendorDesc: document.getElementById("vendor-desc"),
      vendorLogo: document.getElementById("vendor-logo"),
      editStoreBtn: document.getElementById("edit-store-btn"),
      viewStoreBtn: document.getElementById("view-store-btn"),
      logoutBtn: document.getElementById("logout-btn"),
    };

    this.updateRegisterButtonState();
  },

  /**
   * Attach form submits, nav actions, and helper listeners.
   */
  bindEvents() {
    this.elements.registerForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleRegisterOrUpdate();
    });
    this.elements.registerForm?.addEventListener("input", () => {
      this.updateRegisterButtonState();
    });

    this.elements.productForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      this.addProduct();
    });

    this.elements.editStoreBtn?.addEventListener("click", () => {
      this.startEditingVendor();
    });

    this.elements.logoutBtn?.addEventListener("click", async (event) => {
      event.preventDefault();
      await supabase.auth.signOut();
      localStorage.clear();
      window.location.href = "/login.html";
    });
  },

  /**
   * Resolve Supabase session and vendor record, then shape UI accordingly.
   */
  async refreshSessionAndVendor() {
    try {
      this.setStatus("Checking session…", "info");
      this.toggleForms(false);

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const session = data?.session;
      if (!session) {
        this.showLoginRequired();
        return;
      }

      this.state.userId = session.user.id;

      const {
        data: vendor,
        error: vendorError,
      } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", this.state.userId)
        .maybeSingle();

      if (vendorError && vendorError.code !== "PGRST116") throw vendorError;

      if (vendor) {
        this.applyVendorState(vendor);
        await this.loadProducts();
      } else {
        this.prepareNewVendorState();
      }
     this.setStatus("");
    } catch (error) {
      console.error("[VendorController.refreshSessionAndVendor]", error);
      this.setStatus(error.message || "Unable to verify user session.", "error");
      this.toggleForms(false);
    }
  },

  /**
   * Show login guard messaging when no authenticated session exists.
   */
  showLoginRequired() {
    this.state.userId = "";
    this.state.vendor = null;
    localStorage.removeItem("vendor_id");
    localStorage.removeItem("vendor_store_name");
    this.updateVendorLabel("");
    this.updateVendorInfoCard(null);
    this.toggleSections({ register: true, dashboard: false });
    this.toggleForms(false, { includeRegister: true, includeProducts: false });
    this.setStatus("⚠️ Please log in first to access your vendor dashboard.", "error");
    this.updateRegisterButtonState();
  },

  /**
   * Render a vendor's dashboard and sync local state/storage.
   */
  applyVendorState(vendor) {
    this.state.vendor = vendor;
    this.state.isEditing = false;
    localStorage.setItem("vendor_id", vendor.id);
    localStorage.setItem("vendor_store_name", vendor.store_name);

    this.updateVendorLabel(vendor.store_name);
    this.updateVendorInfoCard(vendor);
    this.toggleSections({ register: false, dashboard: true });
    this.toggleForms(true, { includeRegister: false, includeProducts: true });
    this.populateRegisterForm(null); // reset form fields
    this.configureViewStoreLink(vendor.slug);
    if (this.elements.registerSubmit) {
      this.elements.registerSubmit.textContent = "Register Store";
    }
    this.updateRegisterButtonState();
  },

  /**
   * Prepare UI for users who have not yet registered a vendor profile.
   */
  prepareNewVendorState() {
    this.state.vendor = null;
    this.state.isEditing = false;
    localStorage.removeItem("vendor_id");
    localStorage.removeItem("vendor_store_name");

    this.updateVendorLabel("");
    this.updateVendorInfoCard(null);
    this.toggleSections({ register: true, dashboard: false });
    this.populateRegisterForm(null);
    this.configureViewStoreLink("");
    this.toggleForms(true, { includeRegister: true, includeProducts: false });
    if (this.elements.registerSubmit) {
      this.elements.registerSubmit.textContent = "Register Store";
    }
    this.setStatus("Create your store to start selling with us.", "info");
    this.renderProducts([]);
    this.updateRegisterButtonState();
  },

  /**
   * Handle vendor create or update submission based on current state.
   */
  async handleRegisterOrUpdate() {
    const wasEditing = this.state.isEditing;
    try {
      if (!this.state.userId) {
        throw new Error("Please log in before creating a store.");
      }

      const store_name = document.getElementById("store_name")?.value.trim();
      const description = document.getElementById("description")?.value.trim();
      const logo_url = document.getElementById("logo_url")?.value.trim();

      if (!store_name) {
        throw new Error("Store name is required.");
      }

      this.toggleForms(false);
      this.setStatus(
        this.state.isEditing ? "Updating store…" : "Registering store…",
        "info"
      );

      let vendorResponse;
      if (this.state.isEditing && this.state.vendor?.id) {
        vendorResponse = await VendorModel.updateVendor(this.state.vendor.id, {
          user_id: this.state.userId,
          store_name,
          description,
          logo_url,
        });
      } else {
        vendorResponse = await VendorModel.register({
          user_id: this.state.userId,
          store_name,
          description,
          logo_url,
        });
      }

     console.log("[VendorController] Response:", vendorResponse);
     const vendor = vendorResponse?.data || vendorResponse;
      if (!vendor) {
        throw new Error(vendorResponse?.message || "Vendor data missing");
      }
      this.applyVendorState(vendor);
      await this.loadProducts();

      this.state.isEditing = false;
      this.setStatus(
        vendorResponse?.message ||
          (wasEditing
            ? "✅ Store updated successfully."
            : "✅ Store registered successfully."),
        "success"
      );
      this.toggleRegisterFormVisibility(false);
    } catch (error) {
      console.error("[VendorController.handleRegisterOrUpdate]", error);
      this.setStatus(error.message, "error");
      this.toggleForms(true, {
        includeRegister: true,
        includeProducts: Boolean(this.state.vendor),
      });
      if (wasEditing) {
        this.state.isEditing = true;
        this.toggleRegisterFormVisibility(true);
      }
    } finally {
      this.updateRegisterButtonState();
    }
  },

  /**
   * Prefill the register form with the vendor's current data when editing.
   */
  populateRegisterForm(vendor) {
    const form = this.elements.registerForm;
    if (!form) return;

    const data = vendor || {};
    form.store_name.value = data.store_name || "";
    form.description.value = data.description || "";
    form.logo_url.value = data.logo_url || "";
    this.updateRegisterButtonState();
  },

  /**
   * Enable editing mode for vendor details.
   */
  startEditingVendor() {
    if (!this.state.vendor) return;
    this.state.isEditing = true;
    this.populateRegisterForm(this.state.vendor);
    if (this.elements.registerSubmit) {
      this.elements.registerSubmit.textContent = "Save Changes";
    }
    this.toggleRegisterFormVisibility(true);
    this.setStatus("Edit your store information and save the changes.", "info");
    this.elements.registerForm.scrollIntoView({ behavior: "smooth" });
  },

  /**
   * Persist a new product for the vendor.
   */
  async addProduct() {
    if (!this.state.vendor?.id) {
      this.setStatus("Register your store before adding products.", "error");
      return;
    }

    const form = this.elements.productForm;
    if (!form) return;

    const product = {
      vendor_id: this.state.vendor.id,
      name: document.getElementById("product_name")?.value.trim(),
      description: document.getElementById("product_desc")?.value.trim(),
      price: Number(document.getElementById("product_price")?.value || 0),
      stock: Number(document.getElementById("product_stock")?.value || 0),
      weight: Number(document.getElementById("product_weight")?.value || 0),
      category: document.getElementById("product_cat")?.value.trim(),
      image_url: document.getElementById("product_img")?.value.trim(),
    };

    try {
      if (!product.name) {
        throw new Error("Product name is required.");
      }
      if (!(product.price > 0)) {
        throw new Error("Product price must be greater than zero.");
      }

      this.setStatus("Saving product…", "info");
      const response = await VendorModel.addProduct(product);
      console.log("[VendorController] Response:", response);
      if (!response?.data) {
        throw new Error(response?.message || "Failed to add product.");
      }
      form.reset();
      await this.loadProducts();
      this.setStatus(response.message || "✅ Product added successfully.", "success");
    } catch (error) {
      console.error("[VendorController.addProduct]", error);
      this.setStatus(error.message, "error");
    }
  },

  /**
   * Delete a vendor product after user confirmation.
   */
  async deleteProduct(id) {
    if (!id) return;
    const confirmed = window.confirm("Delete this product?");
    if (!confirmed) return;

    try {
      this.setStatus("Deleting product…", "info");
      const response = await VendorModel.deleteProduct(id);
      console.log("[VendorController] Response:", response);
      if (!response?.data) {
        throw new Error(response?.message || "Failed to delete product.");
      }
      await this.loadProducts();
      this.setStatus(response?.message || "✅ Product deleted.", "success");
    } catch (error) {
      console.error("[VendorController.deleteProduct]", error);
      this.setStatus(error.message, "error");
    }
  },

  /**
   * Pull the vendor's product catalog for dashboard rendering.
   */
  async loadProducts() {
    if (!this.state.vendor?.id) {
      this.renderProducts([]);
      return;
    }

    try {
      const response = await VendorModel.listProducts(this.state.vendor.id);
      console.log("[VendorController] Response:", response);
      const products = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];
      this.renderProducts(products);
    } catch (error) {
      console.error("[VendorController.loadProducts]", error);
      this.renderProducts([]);
      this.setStatus(error.message, "error");
    }
  },

  /**
   * Update the products grid with current vendor inventory.
   */
  renderProducts(list = []) {
    const container = this.elements.productsContainer;
    if (!container) return;
    container.innerHTML = "";

    if (!this.state.vendor?.id) {
      container.innerHTML =
        '<p class="vendor-empty">Register your store to start adding products.</p>';
      return;
    }

    if (!list.length) {
      container.innerHTML =
        '<p class="vendor-empty">No products yet. Use the form above to add one.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    list.forEach((product) => {
      const card = document.createElement("article");
      card.className = "vendor-product-card";
      card.innerHTML = `
        <div class="vendor-product-media">
          ${
            product.image_url
              ? `<img src="${product.image_url}" alt="${product.name}" loading="lazy" />`
              : `<div class="vendor-product-placeholder">No Image</div>`
          }
        </div>
        <div class="vendor-product-info">
          <h4>${product.name}</h4>
          <p class="vendor-product-meta">Rp ${Number(
            product.price || 0
          ).toLocaleString("id-ID")}</p>
          ${
            product.description
              ? `<p class="vendor-product-description">${product.description}</p>`
              : ""
          }
          <div class="vendor-product-stats">
            <span>Stock: ${product.stock ?? 0}</span>
            <span>Weight: ${product.weight ?? 0} g</span>
          </div>
        </div>
        <button class="vendor-delete-button" data-id="${product.id}">Delete</button>
      `;
      fragment.appendChild(card);
    });

    container.appendChild(fragment);

    container.querySelectorAll(".vendor-delete-button").forEach((button) => {
      button.addEventListener("click", (event) => {
        const id = event.currentTarget.getAttribute("data-id");
        this.deleteProduct(id);
      });
    });
  },

  /**
   * Update the dashboard greeting heading.
   */
  updateVendorLabel(name) {
    if (this.elements.vendorNameLabel) {
      this.elements.vendorNameLabel.textContent = name
        ? `Welcome, ${name}!`
        : "Vendor Dashboard";
    }
  },

  /**
   * Fill vendor info card or reset when no profile exists.
   */
  updateVendorInfoCard(vendor) {
    if (!this.elements.vendorInfoCard) return;
    if (!vendor) {
      this.elements.vendorLogo.src =
        "https://placehold.co/80x80/fff2e5/df4530?text=Logo";
      this.elements.vendorName.textContent = "No store registered";
      this.elements.vendorDesc.textContent =
        "Register your store to start showcasing your products.";
      return;
    }

    this.elements.vendorLogo.src =
      vendor.logo_url ||
      "https://placehold.co/80x80/fff2e5/df4530?text=Logo";
    this.elements.vendorName.textContent = vendor.store_name;
    this.elements.vendorDesc.textContent =
      vendor.description || "Share your brand story with shoppers.";
  },

  /**
   * Configure the public storefront link visibility.
   */
  configureViewStoreLink(slug) {
    if (!this.elements.viewStoreBtn) return;
    if (slug) {
      this.elements.viewStoreBtn.classList.remove("disabled");
      this.elements.viewStoreBtn.href = `/store.html?slug=${encodeURIComponent(
        slug
      )}`;
    } else {
      this.elements.viewStoreBtn.classList.add("disabled");
      this.elements.viewStoreBtn.href = "/store.html";
    }
  },

  /**
   * Toggle availability of forms based on auth/vendor state.
   */
  toggleForms(enable, options = { includeRegister: true, includeProducts: true }) {
    const { includeRegister = true, includeProducts = true } = options;
    const toggle = (form, shouldEnable) => {
      if (!form) return;
      form.querySelectorAll("input, textarea, button").forEach((el) => {
        el.disabled = !shouldEnable;
      });
    };

    if (includeRegister) toggle(this.elements.registerForm, enable);
    if (includeProducts) toggle(this.elements.productForm, enable);
    this.updateRegisterButtonState();
  },

  /**
   * Show/hide register or dashboard sections.
   */
  toggleSections({ register, dashboard }) {
    if (this.elements.registerSection) {
      this.elements.registerSection.style.display = register ? "block" : "none";
    }
    if (this.elements.dashboardSection) {
      this.elements.dashboardSection.style.display = dashboard ? "block" : "none";
    }
  },

  /**
   * Explicitly display or hide the register form while editing.
   */
  toggleRegisterFormVisibility(visible) {
    if (this.elements.registerSection) {
      this.elements.registerSection.style.display = visible ? "block" : "none";
    }
    if (visible) {
      this.toggleSections({ register: true, dashboard: true });
      this.toggleForms(true, { includeRegister: true, includeProducts: true });
    } else if (this.state.vendor) {
      this.toggleSections({ register: false, dashboard: true });
      this.toggleForms(true, { includeRegister: false, includeProducts: true });
      this.elements.registerForm
        ?.querySelectorAll("input, textarea, button")
        .forEach((el) => {
          el.disabled = true;
        });
    } else {
      this.toggleSections({ register: true, dashboard: false });
      this.toggleForms(true, { includeRegister: true, includeProducts: false });
    }
    this.updateRegisterButtonState();
  },

  /**
   * Enable/disable the register button based on auth and field state.
   */
  updateRegisterButtonState() {
    const button = this.elements.registerSubmit;
    const form = this.elements.registerForm;
    if (!button || !form) return;

    const storeField = form.querySelector("#store_name");
    if (!storeField) return;

    if (storeField.disabled) {
      button.disabled = true;
      return;
    }

    const canSubmit =
      Boolean(this.state.userId) && Boolean(storeField.value.trim());
    button.disabled = !canSubmit;
  },

  /**
   * Render status messages with contextual styling.
   */
  setStatus(message, type = "") {
    if (!this.elements.statusBox) return;

    const icons = {
      success: "✅",
      error: "⚠️",
      info: "ℹ️",
    };

    const prefix = type && icons[type] ? `${icons[type]} ` : "";
    this.elements.statusBox.textContent = message ? `${prefix}${message}` : "";
    this.elements.statusBox.className = `vendor-status ${
      type ? `vendor-status-${type}` : ""
    }`;
  },
};

// Expose globally for inline access (init called from HTML)
window.VendorController = VendorController;

// TODO(Phase 2): Extend controller to support multi-vendor checkout orchestration.
