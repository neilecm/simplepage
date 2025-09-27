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

    const { name, email, password, phone } = JSON.parse(event.body);

    if (!name || !email || !password) {
      return { statusCode: 400, body: "Missing fields" };
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // insert into supabase
    const { data, error } = await supabase
      .from("users")
      .insert([
        { name, email, password: hashedPassword, phone }
      ])
      .select();

    if (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User registered", user: data[0] })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
