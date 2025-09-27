// netlify/functions/auth-register.js
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { name, email, password, phone } = body;

    if (!name || !email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing fields" }),
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into Supabase
    const { data, error } = await supabase
      .from("users")
      .insert([{ name, email, password: hashedPassword, phone }])
      .select();

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "User registered successfully",
        user: { id: data[0].id, name: data[0].name, email: data[0].email, phone: data[0].phone }
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
