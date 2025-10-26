console.log('[create-transaction] source loaded');
import midtransClient from 'midtrans-client';
import { createClient } from '@supabase/supabase-js';
import { requireString, normalizeAmount, ensureArray, ensureObject, normalizeItems } from './_utils/validator.js';
import { audit } from './_utils/audit.js';
import { badRequest, serverError, gatewayError, ok } from './_utils/errors.js';
import { rateLimit } from './_utils/rateLimit.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Require clients to pass order_id; do not auto-generate to ensure idempotency
function bad(msg) { return badRequest(msg); }
export const handler = async (event) => {
  try {
    // Best-effort rate limit by IP + route
    const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || event.headers['client-ip'] || 'unknown';
    const rl = rateLimit(`create-transaction:${ip}`, { windowMs: 60_000, max: 30 });
    if (rl.limited) return badRequest('rate limit exceeded', 'rate_limited');
    const body = event.body ? JSON.parse(event.body) : {};
    let order_id;
    try { order_id = requireString(body.order_id, 'order_id'); } catch (e) { return bad(e.message); }

    let grossAmount;
    try { grossAmount = normalizeAmount(body); } catch (e) { return bad(e.message); }

    // Optional input validations
    try { ensureArray(body.items, 'items'); } catch (e) { return bad(e.message); }
    const items = normalizeItems(body.items);
    try { ensureObject(body.address, 'address'); } catch (e) { return bad(e.message); }

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
      item_details: items
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
    const isProduction = String(process.env.MIDTRANS_IS_PROD || '').toLowerCase() === 'true';
    const snap = new midtransClient.Snap({
      isProduction,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    let trx;
    try {
      trx = await snap.createTransaction(payload);
    } catch (e) {
      console.error('Midtrans createTransaction failed', e);
      await audit('create-transaction', 'midtrans_error', { order_id, error: e.message || String(e), payload });
      return gatewayError('Failed to create transaction with payment gateway');
    }

    // upsert order with token details
    const upsertRes = await supabase
      .from('orders')
      .upsert([{
        order_id,
        user_id,
        guest_id,
        total: grossAmount || null,
        payment_type: body.payment_type || null,
        status: existing?.status || 'pending',
        snap_token: trx?.token || null,
        redirect_url: trx?.redirect_url || null,
      }], { onConflict: 'order_id' });

    if (upsertRes.error) {
      console.error('Supabase upsert error', upsertRes.error);
      await audit('create-transaction', 'supabase_error', { order_id, error: upsertRes.error.message, trx });
      return serverError('Failed to persist order');
    }

    await audit('create-transaction', 'created', { order_id, token: trx?.token, redirect_url: trx?.redirect_url, total: grossAmount });

    return ok({ token: trx?.token, redirect_url: trx?.redirect_url, order_id });
  } catch (err) {
    console.error('create-transaction error:', err);
    return badRequest(err.message || 'unknown-error');
  }
};
