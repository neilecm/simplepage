const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body);

    // Verify signature from Midtrans
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const hash = crypto
      .createHash("sha512")
      .update(body.order_id + body.status_code + body.gross_amount + serverKey)
      .digest("hex");

    if (body.signature_key !== hash) {
      console.error("❌ Invalid signature in callback");
      return { statusCode: 403, body: "Forbidden" };
    }

    // Connect to Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Determine new status
    let newStatus = "pending";
    if (body.transaction_status === "settlement") {
      newStatus = "paid";
    } else if (body.transaction_status === "expire") {
      newStatus = "expired";
    } else if (body.transaction_status === "cancel" || body.transaction_status === "deny") {
      newStatus = "failed";
    }

    // Update order in DB
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: newStatus, midtrans_response: body })
      .eq("id", body.order_id);

    if (error) {
      console.error("❌ DB update error:", error);
      return { statusCode: 500, body: JSON.stringify({ error: "Database error" }) };
    }

    console.log(`✅ Order ${body.order_id} updated to ${newStatus}`);

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("❌ Callback error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
