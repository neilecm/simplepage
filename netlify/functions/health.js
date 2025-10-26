import { createClient } from '@supabase/supabase-js';

export async function handler() {
  const report = { env: {}, db: {}, ok: true };

  // Env checks
  const reqEnv = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'MIDTRANS_SERVER_KEY',
    'MIDTRANS_CLIENT_KEY'
  ];
  for (const key of reqEnv) {
    report.env[key] = Boolean(process.env[key]);
    if (!process.env[key]) report.ok = false;
  }
  report.env.MIDTRANS_IS_PROD = String(process.env.MIDTRANS_IS_PROD || '') || null;

  // DB connectivity and tables
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    // probe tables existence by counting
    const tables = ['orders', 'function_logs', 'webhook_events'];
    report.db.tables = {};
    for (const t of tables) {
      const { error } = await supabase.from(t).select('id', { count: 'exact', head: true });
      report.db.tables[t] = !error;
      if (error) report.ok = false;
    }
  } catch (e) {
    report.db.error = e.message || String(e);
    report.ok = false;
  }

  return { statusCode: report.ok ? 200 : 500, body: JSON.stringify(report) };
}

