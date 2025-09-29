// netlify/functions/shipping.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { origin, user_id, weight, courier } = JSON.parse(event.body);

    // 1. Fetch the most recent address for this user from Supabase
    const { data: addressData, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !addressData) {
      console.error("Supabase address error:", error);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Address not found" })
      };
    }

    const cityName = addressData.city;
    console.log("📦 Using city:", cityName);

    // 2. Fetch RajaOngkir city list
    const cityRes = await fetch("https://api.rajaongkir.com/starter/city", {
      headers: { key: process.env.RAJAONGKIR_KEY }
    });
    const cityData = await cityRes.json();

    const normalize = s =>
      s.toLowerCase().replace("kota ", "").replace("kabupaten ", "").trim();

    const match = cityData.rajaongkir.results.find(
      c => normalize(c.city_name) === normalize(cityName)
    );

    if (!match) {
      console.error("City not found in RajaOngkir:", cityName);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `City not found: ${cityName}` })
      };
    }

    const destination = match.city_id;
    console.log(`✅ Mapped ${cityName} → city_id ${destination}`);

    // 3. Fetch RajaOngkir shipping cost
    const costRes = await fetch("https://api.rajaongkir.com/starter/cost", {
      method: "POST",
      headers: {
        key: process.env.RAJAONGKIR_KEY,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        origin,
        destination,
        weight,
        courier
      })
    });

    const costData = await costRes.json();
    console.log("🚚 Shipping options:", costData);

    return {
      statusCode: 200,
      body: JSON.stringify(costData)
    };
  } catch (error) {
    console.error("Shipping error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
}
