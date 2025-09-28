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
  window.location.href = "login.html";
}

// Handle Register
async function registerUser(e) {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const phone = document.getElementById("phone").value;

  const res = await fetch("/.netlify/functions/auth-register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, phone })
  });

  const data = await res.json();
  if (res.ok) {
    alert("Registration successful! Please login.");
    window.location.href = "login.html";
  } else {
    alert(data.error || "Registration failed");
  }
}

// Handle Login
// js/auth.js
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
    const data = await res.json();
    console.log("✅ Register response:", data);

    if (res.ok) {
      alert("Registration successful! Please log in.");
      window.location.href = "login.html";
    } else {
      alert("Registration failed: " + data.error);
    }
  } catch (err) {
    console.error("❌ Register error:", err);
    alert("Something went wrong during register.");
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
    const data = await res.json();
    console.log("✅ Login response:", data);

    if (res.ok) {
      localStorage.setItem("user", JSON.stringify(data.user));
      alert("Welcome " + data.user.name);
      window.location.href = "cart.html";
    } else {
      alert("Login failed: " + data.error);
    }
  } catch (err) {
    console.error("❌ Login error:", err);
    alert("Something went wrong during login.");
  }
}
