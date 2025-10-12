import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function handler(event) {
  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      console.warn("❌ Missing email or password in request body");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing email or password" }),
      };
    }

    console.log("🔍 Attempting login for:", email);

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signInData?.user) {
      console.warn("❌ Supabase auth signIn failed:", signInError);
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid email or password" }),
      };
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

    console.log("✅ Login successful for:", email);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Login successful",
        token: signInData.session?.access_token || null,
        user: {
          id: authUser.id,
          email: authUser.email,
          name: profile?.name || authUser.user_metadata?.full_name || "",
          phone: profile?.phone || authUser.user_metadata?.phone || "",
          role,
        },
      }),
    };
  } catch (err) {
    console.error("🔥 Exception in login handler:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}
