import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

export async function audit(event, category, payload) {
  try {
    if (!supabase) return;
    await supabase
      .from('function_logs')
      .insert([{ event, category, payload }]);
  } catch (e) {
    // best-effort only
    console.error('audit insert failed', e);
  }
}

