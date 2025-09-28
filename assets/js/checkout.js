async function saveAddress(event) {
  event.preventDefault();

  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user) {
    alert("⚠️ Please login first.");
    window.location.href = "login.html";
    return;
  }

  const address = {
    user_id: user.id,
    full_name: document.getElementById("full_name").value,
    street: document.getElementById("street").value,
    city: document.getElementById("city").value,
    province: document.getElementById("province").value,
    postal_code: document.getElementById("postal_code").value,
    phone: document.getElementById("phone").value,
  };

  try {
    // Save to Supabase via Netlify function
    const res = await fetch("/.netlify/functions/auth-save-address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(address),
    });

    const data = await res.json();
    console.log("✅ Address save response:", data);

    if (res.ok) {
      // Save also to localStorage for instant use in cart.html
      localStorage.setItem("address", JSON.stringify(data.address));

      alert("✅ Address saved successfully!");
      window.location.href = "cart.html";
    } else {
      document.getElementById("error-box").textContent =
        "❌ Error: " + (data.error || "Could not save address");
    }
  } catch (err) {
    console.error("❌ Address save error:", err);
    document.getElementById("error-box").textContent =
      "❌ Error: " + err.message;
  }
}
