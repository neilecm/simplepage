export const PaymentModel = {
  async createTransaction({ orderId, items, address, amount }) {
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

    const payload = {
      order_id: orderId || undefined,
      amount: grossAmount,
      items: Array.isArray(items) ? items : [],
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

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`PaymentModel error: ${err || resp.status}`);
    }
    return resp.json();
  }
};
