const { createClient } = require("@supabase/supabase-js");
const midtransClient = require("midtrans-client");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body);

    // 1. Save order in Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from("orders")
      .insert([{
        user_id: body.user_id || null,
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city_id: body.city_id,
        city_name: body.city_name,
        province: body.province,
        postal: body.postal,
        shipping_courier: body.shipping?.courier,
        shipping_service: body.shipping?.service,
        shipping_price: body.shipping?.price,
        cart: body.cart
      }])
      .select()
      .single();

    if (error) {
      console.error("❌ DB error:", error);
      return { statusCode: 500, body: JSON.stringify({ error: "Database insert error" }) };
    }

    const order = data;

    // 2. Compute gross amount (cart subtotal + shipping)
    const subtotal = (body.cart || []).reduce((s, i) => s + (i.price * i.qty), 0);
    const grossAmount = subtotal + (body.shipping?.price || 0);

    // 3. Create Midtrans Snap transaction
    const snap = new midtransClient.Snap({
      isProduction: false, // change later when going live
      serverKey: process.env.MIDTRANS_SERVER_KEY,
    });

    const parameter = {
      transaction_details: {
        order_id: order.id, // use your DB order_id
        gross_amount: grossAmount,
      },
      item_details: [
        ...(body.cart || []).map(it => ({
          id: it.id,
          price: it.price,
          quantity: it.qty,
          name: it.name
        })),
        {
          id: "shipping",
          price: body.shipping?.price || 0,
          quantity: 1,
          name: `${body.shipping?.courier?.toUpperCase()} ${body.shipping?.service || "Shipping"}`
        }
      ],
      customer_details: {
        first_name: body.name,
        email: body.email,
        phone: body.phone,
        billing_address: {
          address: body.address,
          city: body.city_name,
          postal_code: body.postal,
          country_code: "IDN"
        }
      }
    };

    const transaction = await snap.createTransaction(parameter);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        order,
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url
      })
    };
  } catch (err) {
    console.error("❌ Order + Midtrans error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};

