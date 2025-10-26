export const PaymentModel = {
  async createTransaction({ orderId, items, address, amount, payment_type }) {
    // identity
    let user_id = null;
    try {
      if (window.supabase?.auth?.getUser) {
        const { data: { user } } = await window.supabase.auth.getUser();
        user_id = user?.id || null;
      }
    } catch {}
    const guest_id = user_id ? null : (localStorage.getItem('guest_id') || null);

    // compute amount if not passed
    let grossAmount = Number(amount ?? 0);
    if (!grossAmount) {
      try {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const itemsTotal = cart.reduce((sum, it) => sum + Number(it.price ?? 0) * Number(it.qty ?? 1), 0);
        const shipping = Number(localStorage.getItem('shipping_cost') || 0);
        grossAmount = itemsTotal + shipping;
      } catch { grossAmount = 0; }
    }

    // Normalize items to expected shape
    const normalizedItems = Array.isArray(items)
      ? items.map((it, idx) => ({
          id: String(it.id ?? idx + 1),
          name: String(it.name ?? it.title ?? 'Item'),
          price: Number(it.price ?? it.unit_price ?? 0),
          quantity: Number(it.quantity ?? it.qty ?? 1)
        }))
        .filter(it => Number.isFinite(it.price) && it.price >= 0 && Number.isFinite(it.quantity) && it.quantity > 0)
      : (() => {
          try {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            return cart.map((it, idx) => ({
              id: String(it.id ?? idx + 1),
              name: String(it.name ?? it.title ?? 'Item'),
              price: Number(it.price ?? 0),
              quantity: Number(it.qty ?? 1)
            })).filter(it => Number.isFinite(it.price) && it.price >= 0 && Number.isFinite(it.quantity) && it.quantity > 0);
          } catch { return []; }
        })();

    const payload = {
      order_id: orderId || undefined,
      amount: grossAmount,
      payment_type: payment_type || null,
      items: normalizedItems,
      address: address || {
        full_name: localStorage.getItem('full_name') || '',
        phone: localStorage.getItem('phone') || '',
        street: localStorage.getItem('street') || '',
        city: localStorage.getItem('city') || '',
        postal_code: localStorage.getItem('postal_code') || ''
      },
      user_id,
      guest_id,
      shipping: (() => {
        try {
          const s = JSON.parse(localStorage.getItem('komerceShippingSelection') || '{}');
          return { courier: s?.courier || s?.code || null, service: s?.service || s?.name || null };
        } catch { return {}; }
      })()
    };

    const resp = await fetch('/.netlify/functions/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const message = data?.error?.message || data?.error || `HTTP ${resp.status}`;
      throw new Error(message);
    }
    return data;
  }
};
