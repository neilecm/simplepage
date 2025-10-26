// public/assets/js/models/AdminOrdersModelV2.js
export const AdminOrdersModelV2 = {
  async list({ page = 1, limit = 10, q = "", status = "all" } = {}) {
    const params = new URLSearchParams({ page, limit, q, status });
    const res = await fetch(`/.netlify/functions/admin-get-orders-view?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json(); // { data, count, page, limit }
  }
};
