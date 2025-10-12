import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Debug Supabase init
console.log("🔧 Supabase init:", {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY ? "loaded" : "MISSING"
});

export async function handler(event) {
  try {
    const { name, email, password, phone } = JSON.parse(event.body);

    if (!name || !email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
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
      return {
        statusCode: 500,
        body: JSON.stringify({ error: signUpError.message }),
      };
    }

    const authUser = signUpData?.user;
    if (!authUser) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to create auth user." }),
      };
    }

    // Step 2: Count existing profiles to determine role
    const { count, error: countError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("❌ Failed counting users:", countError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: countError.message }),
      };
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
      return {
        statusCode: 500,
        body: JSON.stringify({ error: profileLookupError.message }),
      };
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "User registered",
        user: {
          id: authUser.id,
          email: authUser.email,
          role,
        },
      }),
    };
  } catch (err) {
    console.error("❌ Exception in register:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
}
