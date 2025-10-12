// public/assets/js/models/ProductModel.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const BUCKET = "product_media";
const SUPABASE_URL = window.__SUPABASE__?.url;
const SUPABASE_ANON_KEY = window.__SUPABASE__?.anonKey;
let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn("⚠️ Supabase configuration missing for ProductModel upload operations.");
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
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
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(safeName);
  return data?.publicUrl;
}

export const ProductModel = {
  async getAllProducts({ adminId, page = 1, limit = 10, search = "", status = "all" }) {
    const query = new URLSearchParams();
    query.set("page", page);
    query.set("limit", limit);
    if (search) query.set("search", search);
    if (status && status !== "all") query.set("status", status);

    return request(`/.netlify/functions/admin-products-get?${query}`, {
      method: "GET",
      headers: { "x-admin-id": adminId },
    });
  },

  async getProductById({ adminId, id }) {
    return request(`/.netlify/functions/admin-products-get?id=${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "x-admin-id": adminId },
    });
  },

  async createProduct({ adminId, payload }) {
    return request("/.netlify/functions/admin-product-save", {
      method: "POST",
      headers: { "x-admin-id": adminId },
      body: JSON.stringify(payload),
    });
  },

  async updateProduct({ adminId, id, payload }) {
    return request("/.netlify/functions/admin-product-save", {
      method: "POST",
      headers: { "x-admin-id": adminId },
      body: JSON.stringify({ id, ...payload }),
    });
  },

  async deleteProduct({ adminId, id }) {
    return request("/.netlify/functions/admin-product-delete", {
      method: "POST",
      headers: { "x-admin-id": adminId },
      body: JSON.stringify({ id }),
    });
  },

  async bulkImport({ adminId, products }) {
    return request("/.netlify/functions/admin-products-bulk", {
      method: "POST",
      headers: { "x-admin-id": adminId },
      body: JSON.stringify({ products }),
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
  },
};

