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

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // insert into Supabase
    const { data, error } = await supabase
      .from("users")
      .insert([{ name, email, password: hashedPassword, phone }])
      .select();

    if (error) {
      console.error("❌ Error inserting user:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "User registered",
        user: data[0],
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
