const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return { statusCode: 400, body: "Missing email or password" };
    }

    // get user from Supabase
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (error) {
      return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
    }

    if (!users || users.length === 0) {
      return { statusCode: 401, body: JSON.stringify({ error: "User not found" }) };
    }

    const user = users[0];

    // compare hashed password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid password" }) };
    }

    // success → return minimal safe user data
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone
        }
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
