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
async function loginUser(e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/.netlify/functions/auth-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (res.ok) {
    saveUser(data.user);
    // Redirect to intended page or index.html
    const redirect = localStorage.getItem("redirectAfterLogin") || "index.html";
    localStorage.removeItem("redirectAfterLogin");
    window.location.href = redirect;
  } else {
    alert(data.error || "Login failed");
  }
}

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
