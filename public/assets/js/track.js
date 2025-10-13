// assets/js/track.js

// Delivery tracking function
async function trackDelivery(waybill, courier) {
  if (!waybill || !courier) {
    alert("⚠️ Please enter a waybill number and select a courier.");
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/shipping?type=delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waybill, courier })
    });

    const json = await res.json().catch(() => ({}));
    console.log("[Track] Response:", json);

    const trackDiv = document.getElementById("tracking-result");
    const payload = json?.data?.rajaongkir || json?.rajaongkir;

    if (res.ok && payload?.result) {
      const { summary, manifest, delivery_status } = payload.result;

      let output = `
📌 Courier: ${summary.courier_name}
📦 Waybill: ${summary.waybill_number}
👤 Receiver: ${summary.receiver_name}
🚚 Status: ${delivery_status.status}
      `;

      output += `\n\n📜 Manifest:\n`;
      manifest.forEach(m => {
        output += `- ${m.manifest_date} ${m.manifest_time} | ${m.city_name} → ${m.manifest_description}\n`;
      });

      trackDiv.textContent = output;
    } else {
      trackDiv.textContent =
        "❌ " + (json?.message || "No tracking info found. Please check the waybill.");
      console.error("[Track] API error:", json?.details || json);
    }
  } catch (err) {
    console.error("❌ Tracking error:", err);
    document.getElementById("tracking-result").textContent = "⚠️ Error: " + err.message;
  }
}
