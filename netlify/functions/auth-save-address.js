// netlify/functions/auth-save-address.js
// Save checkout address + Komerce (RajaOngkir via Komerce) shipping into public.addresses
// ESM (your package.json has "type":"module")
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------- helpers ----------
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

const OK  = (json) => ({ statusCode: 200, headers: CORS, body: JSON.stringify(json) });
const ERR = (code, json) => ({ statusCode: code, headers: CORS, body: JSON.stringify(json) });

const toNum = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') return OK({ ok: true });
  if (event.httpMethod !== 'POST')    return ERR(405, { error: 'Method Not Allowed' });

  // Parse JSON body
  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return ERR(400, { error: 'Invalid JSON body', details: String(e?.message || e) });
  }

  // ---------- address / buyer basics (keep backward compatibility) ----------
  const user_id     = body.user_id ?? null;
  const guest_id    = body.guest_id ?? null;

  const full_name   = body.full_name ?? body.name ?? null;
  const phone       = body.phone ?? null;

  // Accept both plain and *_id forms
  const street      = body.street ?? body.address ?? null;
  const province    = body.province ?? body.province_id ?? null; // your schema uses 'province' text
  const city_id     = body.city_id ?? body.city ?? null;
  const district    = body.district ?? body.district_id ?? null;
  const subdistrict = body.subdistrict ?? body.subdistrict_id ?? null;
  const postal_code = body.postal_code ?? body.postcode ?? null;

  const order_id    = body.order_id ?? null;

  // Arbitrary metadata from client (optional)
  const extra_meta  = body.meta ?? null;

  // ---------- Komerce shipping block (new + legacy fallbacks) ----------
  // Preferred shape sent by CheckoutController.js
  const { shipping = {} } = body;

  // Rich Komerce fields (tolerant defaults)
  const provider        = shipping.provider ?? 'komerce';

  const courier_code    = shipping.courier_code ?? shipping.courier ?? body.courier ?? null; // e.g., "jne"
  const courier_name    = shipping.courier_name ?? null;                                      // e.g., "JNE"
  const service_code    = shipping.service_code ?? shipping.shipping_service ?? body.shipping_service ?? null; // "REG"
  const service_label   =
    shipping.service_label ??
    (courier_name && service_code ? `${courier_name} ${service_code}` : null);

  const etd             = shipping.etd ?? null;                         // e.g., "2-3"
  const etd_days        = Number.isFinite(shipping.etd_days) ? shipping.etd_days : toNum(shipping.etd_days);

  const shipping_cost   = toNum(shipping.shipping_cost);

  // Legacy fields (keep for compatibility with older queries)
  const courier         = shipping.courier ?? body.courier ?? courier_code ?? null;
  const shipping_service= shipping.shipping_service ?? body.shipping_service ?? service_code ?? null;

  // Keep a raw snapshot for debugging/backfill (optional but useful)
  const shipping_meta_raw = Object.keys(shipping || {}).length ? shipping : null;

  // ---------- Build insert row for public.addresses ----------
  const insert = {
    // core identity / address
    user_id,
    guest_id,
    full_name,
    phone,
    street,
    province,
    city_id,
    district,
    subdistrict,
    postal_code,

    // legacy shipping (old UI still reads these)
    courier,
    shipping_service,

    // Komerce-rich fields you showed in your Supabase UI
    provider,
    courier_code,
    courier_name,
    service_code,
    service_label,
    etd,
    etd_days,
    shipping_cost,

    // raw meta (jsonb in DB is ideal if column type is json/jsonb)
    meta: shipping_meta_raw ?? extra_meta ?? null,

    // association with order (nullable during address-save step)
    order_id,
  };

  try {
    const { data, error } = await supabase
      .from('addresses')
      .insert([insert])
      .select('id')
      .single();

    if (error) {
      // Return the actual DB error so you can fix column names/types quickly
      return ERR(400, { error: error.message, details: error, insert });
    }

    return OK({ id: data?.id ?? null });
  } catch (e) {
    return ERR(500, { error: e?.message || 'Unexpected server error' });
  }
}
