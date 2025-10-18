// netlify/functions/admin-get-orders-view.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};
const OK  = (json) => ({ statusCode: 200, headers: CORS, body: JSON.stringify(json) });
const ERR = (code, json) => ({ statusCode: code, headers: CORS, body: JSON.stringify(json) });

const fmtIDR = (n) =>
  typeof n === 'number' && isFinite(n)
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
    : '—';

function bits(row) {
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

function latestByOrder(addresses, key = 'order_id') {
  const m = new Map();
  for (const a of addresses || []) {
    const k = a[key];
    if (!k) continue;
    const prev = m.get(k);
    if (!prev || new Date(a.created_at ?? 0) > new Date(prev.created_at ?? 0)) m.set(k, a);
  }
  return m;
}

const firstDefined = (...vals) => vals.find((v) => v !== undefined && v !== null) ?? null;

// Try a query; if it errors, return { error }
async function tryQuery(q) {
  try {
    const r = await q;
    return r.error ? { error: r.error } : { data: r.data, count: r.count };
  } catch (e) {
    return { error: { message: e?.message || String(e) } };
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return OK({ ok: true });
  if (event.httpMethod !== 'GET')     return ERR(405, { error: 'Method Not Allowed' });

  const diag = [];

  // Params (we won’t push filters to SQL until we know the column exists)
  const url   = new URL(event.rawUrl || 'http://local/?' + (event.queryStringParameters ?? ''));
  const page  = Math.max(parseInt(url.searchParams.get('page')  || '1', 10), 1);
  const limit = Math.max(parseInt(url.searchParams.get('limit') || '10', 10), 1);
  const q     = (url.searchParams.get('q')      || '').trim();
  const status= (url.searchParams.get('status') || '').trim(); // we’ll filter in JS for safety

  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  // ---------- 1) Try view with "*" (schema-agnostic) ----------
  {
    let qv = supabase.from('admin_orders_enriched').select('*', { count: 'exact' });
    // order by a likely timestamp if present; fallback to not ordering if it errors
    let r1 = await tryQuery(qv.order('created_at', { ascending: false }).range(from, to));
    if (r1.error) {
      diag.push({ where: 'view-order-created_at', message: r1.error.message });
      r1 = await tryQuery(qv.range(from, to)); // no order
    }
    if (!r1.error) {
      const rows = Array.isArray(r1.data) ? r1.data : [];
      const norm = rows.map((x) => {
        const order_id = firstDefined(x.order_id, x.id, x.orderid, x.order_no, x.number);
        const created_at = firstDefined(x.created_at, x.createdAt);
        const customer_name = firstDefined(x.customer_name, x.customer, x.full_name);
        const total_amount = firstDefined(x.total_amount, x.total, x.grandtotal, x.amount, x.total_price);
        const payment_method = firstDefined(x.payment_method, x.payment, x.payment_type);
        const row = {
          order_id, created_at, customer_name, total_amount, payment_method,
          status: x.status ?? null,
          courier_name: x.courier_name ?? null,
          service_code: x.service_code ?? null,
          service_label: x.service_label ?? null,
          etd: x.etd ?? null,
          etd_days: x.etd_days ?? null,
          shipping_cost: typeof x.shipping_cost === 'number' ? x.shipping_cost : null,
          shipping_service: x.shipping_service ?? null,
        };
        return { ...row, ...bits(row) };
      });

      // Safe front-end filters (since we don’t know exact columns)
      let filtered = norm;
      if (status && status !== 'all') filtered = filtered.filter((r) => (r.status || '').toLowerCase() === status.toLowerCase());
      if (q) {
        const s = q.toLowerCase();
        filtered = filtered.filter((r) =>
          String(r.order_id || '').toLowerCase().includes(s) ||
          String(r.customer_name || '').toLowerCase().includes(s)
        );
      }

      // Apply pagination in JS (since we filtered in JS)
      const count = filtered.length;
      const pageSlice = filtered.slice(from, to + 1);

      return OK({ data: pageSlice, count, page, limit, errors: diag });
    }
    diag.push({ where: 'view', message: r1.error.message });
  }

  // ---------- 2) Fallback: orders + addresses (both "*") ----------
  // orders
  let o = await tryQuery(
    supabase.from('orders').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  );
  if (o.error) {
    diag.push({ where: 'orders-order-created_at', message: o.error.message });
    o = await tryQuery(supabase.from('orders').select('*', { count: 'exact' }));
  }
  if (o.error) {
    // Still return OK with errors so UI doesn’t break
    return OK({ data: [], count: 0, page, limit, errors: [...diag, { where: 'orders', message: o.error.message }] });
  }

  const orders = Array.isArray(o.data) ? o.data : [];
  const normalized = orders.map((x) => ({
    order_id: firstDefined(x.order_id, x.id, x.orderid, x.order_no, x.number),
    created_at: firstDefined(x.created_at, x.createdAt),
    customer_name: firstDefined(x.customer_name, x.customer, x.full_name),
    total_amount: firstDefined(x.total_amount, x.total, x.grandtotal, x.amount, x.total_price),
    payment_method: firstDefined(x.payment_method, x.payment, x.payment_type),
    status: x.status ?? null,
  }));

  // JS filters (safe)
  let filtered = normalized;
  if (status && status !== 'all') filtered = filtered.filter((r) => (r.status || '').toLowerCase() === status.toLowerCase());
  if (q) {
    const s = q.toLowerCase();
    filtered = filtered.filter((r) =>
      String(r.order_id || '').toLowerCase().includes(s) ||
      String(r.customer_name || '').toLowerCase().includes(s)
    );
  }

  // addresses join (by order_id only if we have non-null ids)
  const ids = filtered.map((r) => r.order_id).filter(Boolean);
  let shipMap = new Map();
  if (ids.length) {
    let a = await tryQuery(
      supabase.from('addresses').select('*').in('order_id', ids)
    );
    if (!a.error) shipMap = latestByOrder(a.data, 'order_id');
    else diag.push({ where: 'addresses', message: a.error.message });
  }

  const merged = filtered.map((r) => {
    const a = shipMap.get(r.order_id) || {};
    const row = {
      ...r,
      courier_name: a.courier_name ?? null,
      service_code: a.service_code ?? null,
      service_label: a.service_label ?? null,
      etd: a.etd ?? null,
      etd_days: a.etd_days ?? null,
      shipping_cost: typeof a.shipping_cost === 'number' ? a.shipping_cost : null,
      shipping_service: a.shipping_service ?? null,
    };
    return { ...row, ...bits(row) };
  });

  // paginate in JS
  const count = merged.length;
  const pageSlice = merged.slice(from, to + 1);

  return OK({ data: pageSlice, count, page, limit, errors: diag });
}
