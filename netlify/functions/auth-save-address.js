// netlify/functions/auth-save-address.js (ESM)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function handler(event) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};

    const payload = {
      // identities (one of them must exist)
      user_id:  body.user_id  ?? null,
      guest_id: body.guest_id ?? null,

      // address core (use your actual column names)
      full_name:       body.full_name       ?? null,
      phone:           body.phone           ?? null,
      street:          body.street          ?? null,
      province:        body.province_id     ?? body.province ?? null, // you store plain text "province"
      city_id:         body.city_id         ?? null,                  // you have a city_id column
      district:        body.district_id     ?? body.district ?? null, // you store plain text "district"
      subdistrict:     body.subdistrict_id  ?? body.subdistrict ?? null, // plain text "subdistrict"
      postal_code:     body.postal_code     ?? null,

      // shipping selections (these are what the Admin view wants)
      courier:         body.courier         ?? null,
      shipping_service:body.shipping_service ?? null,

      // order_id intentionally null here; create-transaction will attach it later
      order_id: null,
      // optional: keep raw meta if you pass any
      meta: body.meta ?? null
    };

    // Very light validation (avoid inserting totally empty rows)
    if (!payload.user_id && !payload.guest_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing user_id | guest_id' }) };
    }
    if (!payload.full_name) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing full_name' }) };
    }

    const { data, error } = await supabase.from('addresses').insert(payload).select('id').single();
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ id: data.id }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
