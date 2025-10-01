exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { order_id, courier } = JSON.parse(event.body);

    if (!order_id || !courier) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing order_id or courier" }) };
    }

    // Mock response until RajaOngkir Enterprise API is live
    return {
      statusCode: 200,
      body: JSON.stringify({
        order_id,
        courier,
        label_url: "https://dummyimage.com/400x200/000/fff.png&text=Mock+Shipping+Label"
      })
    };
  } catch (err) {
    console.error("❌ Order creation error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
