import { createClient } from "@supabase/supabase-js";
import { requireString, normalizeAmount } from './_utils/validator.js';
import { audit } from './_utils/audit.js';

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = JSON.parse(event.body || "{}");
    const { payment_type = null, status = "pending", user_id = null, guest_id = null } = body;

    let order_id;
    try { order_id = requireString(body.order_id, 'order_id'); } catch (e) { return { statusCode: 400, body: JSON.stringify({ error: e.message }) }; }
    let total;
    try { total = normalizeAmount({ total: body.total, ...body }); } catch (e) { return { statusCode: 400, body: JSON.stringify({ error: e.message }) }; }

    // 1) insert the order (with user or guest id)
    const { error: insErr } = await supabase.from("orders").insert([{
      order_id, user_id, guest_id, total, payment_type, status
    }]);
    if (insErr) {
      await audit('create-order', 'supabase_error', { order_id, error: insErr.message });
      return { statusCode: 500, body: JSON.stringify({ error: insErr.message }) };
    }

    // 2) attach latest address for that identity to this order
    if (user_id || guest_id) {
      const match = user_id ? { user_id, order_id: null } : { guest_id, order_id: null };

      const { data: latestAddr, error: selErr } = await supabase
        .from("addresses").select("id").match(match)
        .order("created_at", { ascending: false })
        .limit(1).maybeSingle();

      if (!selErr && latestAddr?.id) {
        await supabase.from("addresses").update({ order_id }).eq("id", latestAddr.id);
      }
    }

    await audit('create-order', 'created', { order_id, total, user_id, guest_id });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message || "unknown error" }) };
  }
}
