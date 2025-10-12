// public/assets/js/models/AdminModel.js

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

export const AdminModel = {
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
          "x-admin-id": adminId,
        },
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
        "x-admin-id": adminId,
      },
      body: JSON.stringify({
        order_id: orderId,
        status,
      }),
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
          "x-admin-id": adminId,
        },
      }
    );
  },
};
