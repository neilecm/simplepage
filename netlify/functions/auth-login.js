import { createClient } from "@supabase/supabase-js";

console.log("[INIT] Supabase using service role key in auth-login.js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const successResponse = (message, data) => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message, data }),
});

const errorResponse = (status, message, details = null) => ({
  statusCode: status || 500,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: message || "Unexpected server error",
    details,
  }),
});

export async function handler(event) {
  try {
    if (event.httpMethod && event.httpMethod !== "POST") {
      return errorResponse(405, "Method not allowed");
    }

    const { email, password } = JSON.parse(event.body || "{}");

    if (!email || !password) {
      console.warn("❌ Missing email or password in request body");
      return errorResponse(400, "Missing email or password");
    }

    console.log("🔍 Attempting login for:", email);

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signInData?.user) {
      console.warn("❌ Supabase auth signIn failed:", signInError);
      return errorResponse(401, "Invalid email or password", signInError?.message || null);
    }

    const authUser = signInData.user;
    console.log("🔑 Auth user:", authUser.id);

    let { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role, name, phone")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profileError) {
      console.warn("⚠️ Supabase profile lookup failed:", profileError.message);
    }

    if (!profile) {
      console.warn("🧩 Profile missing for user:", authUser.email);
      const fallbackProfile = {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || "",
        role: "user",
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("users")
        .insert([fallbackProfile]);

      if (insertError) {
        console.error("❌ Failed to create fallback profile:", insertError.message);
      } else {
        console.log("✅ Fallback profile created for", authUser.email);
        profile = fallbackProfile;
      }
    }

    const role = profile?.role || "user";
    console.log("👤 Profile role:", role);

    const payload = {
      token: signInData.session?.access_token || null,
      user: {
        id: authUser.id,
        email: authUser.email,
        name: profile?.name || authUser.user_metadata?.full_name || "",
        phone: profile?.phone || authUser.user_metadata?.phone || "",
        role,
      },
    };

    console.log("✅ Login successful for:", email);
    console.log("[auth-login] Success:", { userId: authUser.id, role });

    return successResponse("Login successful", payload);
  } catch (err) {
    console.error("🔥 Exception in login handler:", err);
    return errorResponse(err?.status || 500, err?.message || "Internal server error", err?.details || null);
  }
}
