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

    // Check for errors
    if (!res.ok) throw new Error(data.error || "Could not save address");

    // Save also to localStorage for instant use in cart.html
    if (res.ok) {  
      localStorage.setItem("address", JSON.stringify(data.address));
      alert("✅ Address saved successfully!");
      window.location.href = "cart.html";
    } else {
      document.getElementById("error-box").textContent =
        "❌ Error: " + (data.error || "Could not save address");
    }

    // Build payload for Midtrans
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const amount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    const payload = {
      amount,
      cart,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || address.phone,
        address: address.street,
        city: address.city,
        province: address.province,
        postal: address.postal_code,
      },
    };

    // Request Midtrans transaction
    const trxRes = await fetch("/.netlify/functions/create-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const trxData = await trxRes.json();

    if (!trxRes.ok || !trxData.token) {
      throw new Error(trxData.error || "Transaction failed");
    }

    // Launch Midtrans Snap
    window.snap.pay(trxData.token, {
      onSuccess: function (result) {
        console.log("Payment success:", result);
        window.location.href = "payment-successful.html";
      },
      onPending: function (result) {
        console.log("Payment pending:", result);
        window.location.href = "pending.html";
      },
      onError: function (result) {
        console.error("Payment error:", result);
        window.location.href = "failed-payment.html";
      },
    });

  } catch (err) {
    console.error("❌ Address save error:", err);
    document.getElementById("error-box").textContent =
      "❌ Error: " + err.message;
  }
}

