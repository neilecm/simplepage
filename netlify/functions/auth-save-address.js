// netlify/functions/auth-save-address.js
// ESM-compatible Netlify function
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a server-side client (bypasses RLS with service role)
// NOTE: Never expose SERVICE ROLE key to the client.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return ok({ ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return err(405, { error: 'Method Not Allowed' });
  }

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return err(400, { error: 'Invalid JSON body' });
  }

  // ---- Address/customer basics (keep backward-compat) ----------------------
  const user_id      = body.user_id      ?? null;
  const guest_id     = body.guest_id     ?? null;
  const full_name    = body.full_name    ?? body.name ?? null;
  const phone        = body.phone        ?? null;
  const street       = body.street       ?? body.address ?? null;

  // Accept both *_id or plain strings (normalize minimally)
  const province     = body.province     ?? body.province_id ?? null;
  const city_id      = body.city_id      ?? body.city       ?? null;
  const district     = body.district     ?? body.district_id ?? null;
  const subdistrict  = body.subdistrict  ?? body.subdistrict_id ?? null;
  const postal_code  = body.postal_code  ?? body.postcode ?? null;

  const order_id     = body.order_id     ?? null;

  // Keep any extra meta the caller sends (safe to store as JSONB)
  const extra_meta   = body.meta ?? null;

  // ---- Komerce shipping (new + legacy) -------------------------------------
  // Prefer body.shipping.*, but gracefully fall back to top-level legacy fields
  const { shipping = {} } = body || {};

  // Pull with defaults to avoid undefined
  const {
    provider = 'komerce', // default: komerce flow
    courier,               // legacy string code e.g., "jne"
    shipping_service,      // legacy service code e.g., "REG"
    courier_code,          // e.g., "jne"
    courier_name,          // e.g., "JNE"
    service_code,          // e.g., "REG"
    service_label,         // e.g., "JNE REG"
    etd,                   // e.g., "2-3"
    etd_days,              // number e.g., 3
    shipping_cost          // number
    // Optionals for later expansion:
    // shipping_cashback,
    // shipping_cost_net,
    // grandtotal,
    // service_fee,
    // net_income,
    // weight,
    // is_cod
  } = shipping;

  // Backfill from legacy top-level when shipping{} missing
  const legacyCourier         = courier ?? body.courier ?? null;
  const legacyShippingService = shipping_service ?? body.shipping_service ?? null;

  // Build a compact shipping meta snapshot (helps debugging/backfill later)
  const shipping_meta = {
    provider,
    courier: legacyCourier,
    shipping_service: legacyShippingService,
    courier_code: courier_code ?? legacyCourier ?? null,
    courier_name: courier_name ?? null,
    service_code: service_code ?? legacyShippingService ?? null,
    service_label:
      service_label ??
      (courier_name && (service_code ?? legacyShippingService)
        ? `${courier_name} ${service_code ?? legacyShippingService}`
        : null),
    etd: etd ?? null,
    etd_days: Number.isFinite(etd_days) ? etd_days : null,
    shipping_cost:
      typeof shipping_cost === 'string'
        ? Number(shipping_cost)
        : (Number.isFinite(shipping_cost) ? shipping_cost : null),
  };

  // ---- Build insert row for public.addresses --------------------------------
  const insert = {
    // existing address/customer fields
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

    // legacy fields (keep for backward compatibility)
    courier: legacyCourier,
    shipping_service: legacyShippingService,

    // Komerce-rich fields
    provider: shipping_meta.provider,
    courier_code: shipping_meta.courier_code,
    courier_name: shipping_meta.courier_name,
    service_code: shipping_meta.service_code,
    service_label: shipping_meta.service_label,
    etd: shipping_meta.etd,
    etd_days: shipping_meta.etd_days,
    shipping_cost: shipping_meta.shipping_cost,

    // raw meta: prefer the caller's shipping object; fall back to extra_meta
    meta: body.shipping ?? extra_meta ?? null,

    // assignment to order (nullable)
    order_id,
  };

  try {
    const { data, error } = await supabase
      .from('addresses')
      .insert([insert])
      .select('id')
      .single();

    if (error) {
      // Surface constraint/column errors clearly for quick fixes
      return err(400, { error: error.message, details: error });
    }

    return ok({ id: data?.id ?? null });
  } catch (e) {
    return err(500, { error: e.message ?? 'Unexpected error' });
  }
}

// ----------------- helpers -----------------
function ok(json) {
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify(json),
  };
}
function err(status, json) {
  return {
    statusCode: status,
    headers: corsHeaders(),
    body: JSON.stringify(json),
  };
}
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
  };
}
