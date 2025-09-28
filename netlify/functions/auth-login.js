import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

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

    // Fetch user from Supabase
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !data) {
      console.warn("❌ User not found or query error:", error);
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid email or password" }),
      };
    }

    console.log("👤 User found:", {
      id: data.id,
      email: data.email,
      name: data.name,
    });

    // Compare password
    const valid = await bcrypt.compare(password, data.password);
    if (!valid) {
      console.warn("❌ Invalid password for user:", email);
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid email or password" }),
      };
    }

    console.log("✅ Password correct. Login successful for:", email);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Login successful",
        user: {
          id: data.id,
          email: data.email,
          name: data.name,
          phone: data.phone,
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
