// netlify/functions/payment.mjs (rename to .mjs or keep .js; ESM export either way)
export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const req = JSON.parse(event.body || '{}');

    // Normalize & validate items
    const items = Array.isArray(req.items) ? req.items : [];
    const norm = items.map(it => ({
      id: String(it.id ?? 'SKU'),
      name: String(it.name ?? 'Item'),
      price: Math.round(Number(it.price ?? 0)),
      quantity: Math.round(Number(it.quantity ?? 1)),
    })).filter(it => it.price > 0 && it.quantity > 0);

    // Compute amount on server to avoid mismatches
    const gross_amount = norm.reduce((s, it) => s + it.price * it.quantity, 0);

    const payload = {
      order_id: req.order_id || `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      gross_amount,
      items: norm,
      customer: req.customer ?? {},
      address: req.address ?? {},
      callbacks: req.callbacks,
    };

    // Call your server-side creator
    const host = (event.headers?.['x-forwarded-host'] || event.headers?.host || '').replace(/\/+$/, '');
    const origin = host ? `http://${host}` : (process.env.URL || 'http://localhost:8888');

    const res = await fetch(`${origin}/.netlify/functions/create-transaction`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    return { statusCode: res.status, body: text };
  } catch (err) {
    console.error('payment error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'HTTP 500', message: String(err) }) };
  }
}
