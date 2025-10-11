// public/assets/js/models/VendorModel.js
/**
 * Small helper for performing JSON-based fetch requests and surfacing errors.
 */
async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error || res.statusText || "Request failed";
    throw new Error(message);
  }
  return data;
}

export const VendorModel = {
  /**
   * Register a vendor profile and store data returned from the backend.
   */
  async register(vendor) {
    return request("/.netlify/functions/vendor-register", {
      method: "POST",
      body: JSON.stringify(vendor),
    });
  },

  /**
   * Fetch all products belonging to the authenticated vendor.
   */
  async listProducts(vendorId) {
    return request(`/.netlify/functions/vendor-products?vendor_id=${encodeURIComponent(vendorId)}`, {
      method: "GET",
    });
  },

  /**
   * Create a new product for the vendor dashboard.
   */
  async addProduct(product) {
    return request("/.netlify/functions/vendor-products", {
      method: "POST",
      body: JSON.stringify(product),
    });
  },

  /**
   * Update an existing vendor's profile details.
   */
  async updateVendor(id, updates) {
    return request("/.netlify/functions/vendor-register", {
      method: "PUT",
      body: JSON.stringify({ id, ...updates }),
    });
  },

  /**
   * Remove a product by id.
   */
  async deleteProduct(id) {
    return request(`/.netlify/functions/vendor-products?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
