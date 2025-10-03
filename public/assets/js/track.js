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
      body: JSON.stringify({ waybill, courier })
    });

    const result = await res.json();
    console.log("📦 Tracking result:", result);

    const trackDiv = document.getElementById("tracking-result");
    if (result.rajaongkir && result.rajaongkir.result) {
      const { summary, manifest, delivery_status } = result.rajaongkir.result;

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
      trackDiv.textContent = "❌ No tracking info found. Please check the waybill.";
    }
  } catch (err) {
    console.error("❌ Tracking error:", err);
    document.getElementById("tracking-result").textContent = "⚠️ Error: " + err.message;
  }
}
