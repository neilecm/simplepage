const midtransClient = require('midtrans-client');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Require clients to pass order_id; do not auto-generate to ensure idempotency
function bad(msg) { return { statusCode: 400, body: JSON.stringify({ error: msg }) }; }

module.exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const order_id = body.order_id;
    if (!order_id) return bad('order_id required');

    let grossAmount = Number(
      body.amount ??
      body.gross_amount ??
      (body.transaction_details && body.transaction_details.gross_amount) ??
      0
    );
    if (!grossAmount || isNaN(grossAmount)) grossAmount = 0;

    const payload = {
      transaction_details: { order_id, gross_amount: grossAmount },
      customer_details: {
        first_name: body.address?.full_name || '',
        phone:      body.address?.phone || '',
        billing_address: {
          address:     body.address?.street || '',
          city:        body.address?.city || '',
          postal_code: body.address?.postal_code || ''
        },
        shipping_address: {
          address:     body.address?.street || '',
          city:        body.address?.city || '',
          postal_code: body.address?.postal_code || ''
        }
      },
      item_details: Array.isArray(body.items) ? body.items : []
    };

    const user_id  = body.user_id  || null;
    const guest_id = body.guest_id || null;

    // Check existing order for idempotency
    const { data: existing } = await supabase
      .from('orders')
      .select('order_id,status,snap_token,redirect_url')
      .eq('order_id', order_id)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'paid') {
        return {
          statusCode: 200,
          body: JSON.stringify({ already_paid: true, order_id, token: null, redirect_url: existing.redirect_url || null })
        };
      }
      if (existing.snap_token && existing.redirect_url) {
        return {
          statusCode: 200,
          body: JSON.stringify({ order_id, token: existing.snap_token, redirect_url: existing.redirect_url })
        };
      }
    }

    // link latest address for identity to this order
    if (user_id || guest_id) {
      const match = user_id ? { user_id, order_id: null } : { guest_id, order_id: null };
      const { data: addr } = await supabase
        .from('addresses')
        .select('id')
        .match(match)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (addr?.id) await supabase.from('addresses').update({ order_id }).eq('id', addr.id);
    }

    // Midtrans
    const snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    const trx = await snap.createTransaction(payload);

    // upsert order with token details
    await supabase
      .from('orders')
      .upsert([{
        order_id,
        user_id,
        guest_id,
        total: grossAmount || null,
        payment_type: 'credit_card',
        status: existing?.status || 'pending',
        snap_token: trx?.token || null,
        redirect_url: trx?.redirect_url || null,
      }], { onConflict: 'order_id' });

    return {
      statusCode: 200,
      body: JSON.stringify({ token: trx?.token, redirect_url: trx?.redirect_url, order_id })
    };
  } catch (err) {
    console.error('create-transaction error:', err);
    return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
  }
};
