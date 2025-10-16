// public/assets/js/models/OrdersModel.js
window.OrdersModel = (() => {
  const listEP   = "/.netlify/functions/admin-get-orders";
  const detailEP = "/.netlify/functions/admin-get-order-details";
  const updateEP = "/.netlify/functions/admin-update-order";

  async function fetchOrders({ page = 1, limit = 10, status = "all", q = "", includeTotal = false } = {}) {
    const params = new URLSearchParams({ page, limit, includeTotal: String(includeTotal) });
    if (status && status !== "all") params.set("status", status);
    if (q) params.set("q", q);
    const res = await fetch(`${listEP}?${params.toString()}`, { credentials: "include" });
    if (!res.ok) throw new Error(await res.text());
    return res.json(); // { data, total, page, limit }
  }

  async function fetchOrder(orderId) {
    const res = await fetch(`${detailEP}?id=${encodeURIComponent(orderId)}`, { credentials: "include" });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] || null : rows;
  }

  async function updateOrder(orderId, patch = {}) {
    const res = await fetch(updateEP, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: orderId, patch }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  return { fetchOrders, fetchOrder, updateOrder };
})();
