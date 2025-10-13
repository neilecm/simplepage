import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

console.log("[INIT] Supabase using service role key in auth-register.js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Debug Supabase init
console.log("🔧 Supabase init:", {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY ? "loaded" : "MISSING"
});

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

    const { name, email, password, phone } = JSON.parse(event.body || "{}");

    if (!name || !email || !password) {
      return errorResponse(400, "Missing required fields");
    }

    // Step 1: create Supabase Auth user
    const { data: signUpData, error: signUpError } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name || "",
            phone: phone || "",
          },
        },
      });

    if (signUpError) {
      console.error("❌ Supabase auth signUp failed:", signUpError);
      return errorResponse(
        signUpError.status || 500,
        signUpError.message,
        signUpError.details || null
      );
    }

    const authUser = signUpData?.user;
    if (!authUser) {
      return errorResponse(500, "Failed to create auth user.");
    }

    // Step 2: Count existing profiles to determine role
    const { count, error: countError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("❌ Failed counting users:", countError);
      return errorResponse(
        countError.status || 500,
        countError.message,
        countError.details || null
      );
    }

    const role = count === 0 ? "admin" : "user";

    // Step 3: Sync to public.users
    const { data: existingProfile, error: profileLookupError } = await supabase
      .from("users")
      .select("id")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profileLookupError) {
      console.error("❌ Failed to check user profile:", profileLookupError);
      return errorResponse(
        profileLookupError.status || 500,
        profileLookupError.message,
        profileLookupError.details || null
      );
    }

    if (!existingProfile) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const { error: profileInsertError } = await supabase.from("users").insert([
        {
          id: authUser.id,
          name: name || "",
          email,
          phone: phone || "",
          role,
          password: hashedPassword,
          created_at: new Date().toISOString(),
        },
      ]);

      if (profileInsertError) {
        console.error("❌ Failed to sync user profile:", profileInsertError);
      } else {
        console.log("✅ User synced:", authUser.id);
      }
    } else {
      console.log("ℹ️ User already exists:", authUser.id);
    }

    const result = {
      id: authUser.id,
      email: authUser.email,
      role,
    };

    console.log("[auth-register] Success:", {
      userId: authUser.id,
      role,
    });

    return successResponse("User registered successfully", result);
  } catch (err) {
    console.error("❌ Exception in register:", err);
    return errorResponse(err?.status || 500, err?.message || "Internal Server Error", err?.details || null);
  }
}
