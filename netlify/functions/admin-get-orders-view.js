// netlify/functions/admin-get-orders-view.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ---------- helpers ----------
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};
const OK  = (json) => ({ statusCode: 200, headers: cors, body: JSON.stringify(json) });
const ERR = (code, json) => ({ statusCode: code, headers: cors, body: JSON.stringify(json) });

function fmtIDR(n) {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}
function shippingBits(row) {
  const shipping_display =
    row?.service_label ||
    (row?.courier_name && row?.service_code ? `${row.courier_name} ${row.service_code}` : null) ||
    row?.shipping_service ||
    '—';
  const etd_display =
    Number.isFinite(row?.etd_days) && row.etd_days > 0 ? `${row.etd_days}d` : (row?.etd || '—');
  const shipping_cost_display =
    typeof row?.shipping_cost === 'number' ? fmtIDR(row.shipping_cost) : '—';
  return { shipping_display, etd_display, shipping_cost_display };
}
function latestByOrder(addresses) {
  const m = new Map();
  for (const a of addresses || []) {
    const prev = m.get(a.order_id);
    if (!prev || new Date(a.created_at) > new Date(prev.created_at)) m.set(a.order_id, a);
  }
  return m;
}
function derive(val, fallbacks = []) {
  for (const k of [val, ...fallbacks]) {
    if (k !== undefined && k !== null) return k;
  }
  return null;
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return OK({ ok: true });
  if (event.httpMethod !== 'GET') return ERR(405, { error: 'Method Not Allowed' });

  const diag = []; // returned for visibility

  try {
    const url   = new URL(event.rawUrl || 'http://local/?' + (event.queryStringParameters ?? ''));
    const page  = Math.max(parseInt(url.searchParams.get('page')  || '1', 10), 1);
    const limit = Math.max(parseInt(url.searchParams.get('limit') || '10', 10), 1);
    const q     = (url.searchParams.get('q')      || '').trim();
    const status= (url.searchParams.get('status') || 'all').trim();

    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    // 1) Try the enriched view first, but select * (tolerant to schema)
    try {
      let vq = supabase
        .from('admin_orders_enriched')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (q) vq = vq.or(`order_id.ilike.%${q}%,customer_name.ilike.%${q}%`);
      if (status && status !== 'all') vq = vq.eq('status', status);

      const r = await vq;
      if (!r.error) {
        const rows = (Array.isArray(r.data) ? r.data : []).map((x) => {
          // normalize common fields from whatever the view exposes
          const row = {
            order_id: derive(x.order_id, [x.id]),
            created_at: x.created_at ?? x.createdAt ?? null,
            customer_name: derive(x.customer_name, [x.customer, x.full_name]),
            total_amount: derive(x.total_amount, [x.total, x.grandtotal, x.amount, x.total_price]),
            payment_method: derive(x.payment_method, [x.payment, x.payment_type]),
            status: x.status ?? null,

            // raw shipping fields if present
            courier_name: x.courier_name ?? null,
            service_code: x.service_code ?? null,
            service_label: x.service_label ?? null,
            etd: x.etd ?? null,
            etd_days: x.etd_days ?? null,
            shipping_cost: typeof x.shipping_cost === 'number' ? x.shipping_cost : null,
            shipping_service: x.shipping_service ?? null,
          };
          return { ...row, ...shippingBits(row) };
        });

        return OK({ data: rows, count: r.count ?? rows.length, page, limit, errors: diag });
      }
      diag.push({ where: 'view', message: r.error.message });
    } catch (e) {
      diag.push({ where: 'view-catch', message: e?.message || String(e) });
    }

    // 2) Fallback: orders + latest addresses, select * to be resilient
    let oq = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (q) oq = oq.or(`id.ilike.%${q}%,customer_name.ilike.%${q}%,customer.ilike.%${q}%`);
    if (status && status !== 'all') oq = oq.eq('status', status);

    const ordersResp = await oq;
    if (ordersResp.error) {
      diag.push({ where: 'orders', message: ordersResp.error.message });
      return OK({ data: [], count: 0, page, limit, errors: diag });
    }

    const orders = Array.isArray(ordersResp.data) ? ordersResp.data : [];
    const orderIds = orders.map((o) => o.id);

    let addrMap = new Map();
    if (orderIds.length) {
      try {
        const addrResp = await supabase
          .from('addresses')
          .select('*') // tolerant to your current columns
          .in('order_id', orderIds);
        if (!addrResp.error) addrMap = latestByOrder(addrResp.data);
        else diag.push({ where: 'addresses', message: addrResp.error.message });
      } catch (e) {
        diag.push({ where: 'addresses-catch', message: e?.message || String(e) });
      }
    }

    const merged = orders.map((o) => {
      const a = addrMap.get(o.id) || {};
      const row = {
        order_id: o.id,
        created_at: o.created_at ?? o.createdAt ?? null,
        customer_name: derive(o.customer_name, [o.customer, o.full_name]),
        total_amount: derive(o.total_amount, [o.total, o.grandtotal, o.amount, o.total_price]),
        payment_method: derive(o.payment_method, [o.payment, o.payment_type]),
        status: o.status ?? null,

        courier_name: a.courier_name ?? null,
        service_code: a.service_code ?? null,
        service_label: a.service_label ?? null,
        etd: a.etd ?? null,
        etd_days: a.etd_days ?? null,
        shipping_cost: typeof a.shipping_cost === 'number' ? a.shipping_cost : null,
        shipping_service: a.shipping_service ?? null,
      };
      return { ...row, ...shippingBits(row) };
    });

    return OK({ data: merged, count: ordersResp.count ?? merged.length, page, limit, errors: diag });
  } catch (e) {
    return OK({ data: [], count: 0, page: 1, limit: 10, errors: [{ where: 'top', message: e?.message || String(e) }] });
  }
}
