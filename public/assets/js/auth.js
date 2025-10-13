// Save logged in user
function saveUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

// Get logged in user
function getUser() {
  const user = localStorage.getItem("currentUser");
  return user ? JSON.parse(user) : null;
}

// Logout
function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("user");
  localStorage.removeItem("user_role");
  localStorage.removeItem("user_email");
  localStorage.removeItem("auth_token");
  window.location.href = "login.html";
}

async function registerUser(event) {
  event.preventDefault();
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const phone = document.getElementById("phone").value;

  console.log("📨 Register attempt:", { name, email, phone });

  try {
    const res = await fetch("/.netlify/functions/auth-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, phone }),
    });
    const json = await res.json().catch(() => ({}));
    console.log("[Auth] Response:", json);

    if (res.ok && json?.data) {
      alert(json.message || "Registration successful! Please log in.");
      window.location.href = "login.html";
    } else {
      alert("❌ " + (json?.message || "Registration failed"));
      console.error("[Auth] API error:", json?.details || json);
    }
  } catch (err) {
    console.error("[Auth] Error:", err);
    alert("❌ " + (err.message || "Unexpected error during register."));
  }
}

async function loginUser(event) {
  event.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  console.log("📨 Login attempt:", { email });

  try {
    const res = await fetch("/.netlify/functions/auth-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => ({}));
    console.log("[Auth] Response:", json);

    if (res.ok && json?.data?.user) {
      const { user, token } = json.data;
      localStorage.setItem("user", JSON.stringify(user));
      saveUser(user);
      if (token) {
        localStorage.setItem("auth_token", token);
      }
      if (user?.role) {
        localStorage.setItem("user_role", user.role);
      }
      if (user?.email) {
        localStorage.setItem("user_email", user.email);
      }
      alert(json.message || `Welcome ${user.name || user.email}`);
      window.location.href = "cart.html";
    } else {
      alert("❌ " + (json?.message || "Login failed"));
      console.error("[Auth] API error:", json?.details || json);
    }
  } catch (err) {
    console.error("[Auth] Error:", err);
    alert("❌ " + (err.message || "Unexpected error during login."));
  }
}
