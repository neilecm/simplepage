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
async function loginUser(event) {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/.netlify/functions/auth-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Save logged in user
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect after login
      const redirect = localStorage.getItem("redirectAfterLogin") || "cart.html";
      localStorage.removeItem("redirectAfterLogin");
      window.location.href = redirect;
    } else {
      alert(data.error || "Login failed");
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("Something went wrong. Please try again.");
  }
}

// attach handler
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  if (form) form.addEventListener("submit", loginUser);
});


// Check login-required pages
function requireLogin() {
  const user = getUser();
  if (!user) {
    // Save intended page
    localStorage.setItem("redirectAfterLogin", window.location.pathname.split("/").pop());
    window.location.href = "login.html";
  }
}

// Show greeting if logged in
function showGreeting() {
  const user = getUser();
  if (user) {
    const el = document.getElementById("greeting");
    if (el) el.textContent = `Welcome, ${user.name}!`;
  }
}
