// netlify/functions/debug-env.js
export async function handler() {
  const data = {
    SUPABASE_URL: process.env.SUPABASE_URL || "❌ missing",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? "✅ exists"
      : "❌ missing",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
      ? "✅ exists"
      : "❌ missing",
    RAJAONGKIR_API_KEY: process.env.RAJAONGKIR_API_KEY
      ? "✅ exists"
      : "❌ missing",
    MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY
      ? "✅ exists"
      : "❌ missing",
  };

  console.log("[debug-env] Success:", data);
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Environment variables fetched successfully",
      data,
    }),
  };
}
