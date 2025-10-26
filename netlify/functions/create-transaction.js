// netlify/functions/create-transaction.mjs
export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const isProd = String(process.env.MIDTRANS_IS_PROD).toLowerCase() === 'true';
    const baseURL = isProd ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) return { statusCode: 500, body: JSON.stringify({ error: 'Missing MIDTRANS_SERVER_KEY' }) };

    const req = JSON.parse(event.body || '{}');

    const item_details = (req.items || []).map(it => ({
      id: String(it.id),
      name: String(it.name),
      price: Math.round(Number(it.price)),
      quantity: Math.round(Number(it.quantity)),
    }));

    const gross_amount = Math.round(Number(
      req.gross_amount ?? item_details.reduce((s, it) => s + it.price * it.quantity, 0)
    ));

    const order_id = String(req.order_id || `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

    const customer_details = {
      first_name: req.customer?.first_name ?? req.address?.full_name ?? 'Customer',
      email: req.customer?.email ?? 'no-email@example.com',
      phone: req.customer?.phone ?? req.address?.phone,
      shipping_address: {
        first_name: req.address?.full_name ?? 'Customer',
        phone: req.address?.phone,
        address: req.address?.street ?? '',
        postal_code: req.address?.postal_code ?? '',
        city: req.address?.city_label ?? String(req.address?.city ?? ''),
        country_code: 'IDN',
      },
    };

    const body = {
      transaction_details: { order_id, gross_amount },
      item_details,
      customer_details,
      credit_card: { secure: true },
      callbacks: req.callbacks,
    };

    const auth = Buffer.from(`${serverKey}:`).toString('base64');

    const resp = await fetch(`${baseURL}/snap/v1/transactions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error('Midtrans createTransaction failed:', resp.status, text);
      return { statusCode: 502, body: JSON.stringify({ error: 'midtrans_error', status: resp.status, body: text }) };
    }
    return { statusCode: 200, body: text }; // { token, redirect_url }
  } catch (err) {
    console.error('create-transaction error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'HTTP 500', message: String(err) }) };
  }
}
