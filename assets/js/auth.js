document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  // Helper: get logged-in user
  function getUser() {
    return JSON.parse(localStorage.getItem("user") || "null");
  }

  // Helper: require login
  function requireLogin() {
    const user = getUser();
    if (!user) {
      // Save the page user wanted
      localStorage.setItem("redirectAfterLogin", window.location.pathname);
      alert("Please login to continue.");
      window.location.href = "login.html";
    }
    return user;
  }

  // Register
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        phone: document.getElementById("phone").value,
      };

      try {
        const res = await fetch("/.netlify/functions/auth-register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok) {
          alert("Registration successful! Please login.");
          window.location.href = "login.html";
        } else {
          alert(data.error || "Registration failed");
        }
      } catch (err) {
        alert("Server error: " + err.message);
      }
    });
  }

  // Login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
      };

      try {
        const res = await fetch("/.netlify/functions/auth-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok) {
          alert("Login successful!");
          localStorage.setItem("user", JSON.stringify(data.user));

          // Redirect to saved page if available
          const redirectTo = localStorage.getItem("redirectAfterLogin") || "index.html";
          localStorage.removeItem("redirectAfterLogin");
          window.location.href = redirectTo;
        } else {
          alert(data.error || "Login failed");
        }
      } catch (err) {
        alert("Server error: " + err.message);
      }
    });
  }

  // Show login state on all pages
  const userInfoDiv = document.getElementById("user-info");
  const user = getUser();

  if (user && userInfoDiv) {
    // Hide login/register links if logged in
    const loginLink = document.getElementById("login-link");
    const registerLink = document.getElementById("register-link");
    if (loginLink) loginLink.style.display = "none";
    if (registerLink) registerLink.style.display = "none";

    // Show welcome message + logout button
    userInfoDiv.innerHTML = `
      <span>Welcome, ${user.name || user.email}!</span>
      <button id="logoutBtn">Logout</button>
    `;

    // Logout handler
    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });
  }

  // 🔒 Require login on restricted pages
  const restrictedPages = ["cart.html", "order.html"];
  const currentPage = window.location.pathname.split("/").pop();

  if (restrictedPages.includes(currentPage)) {
    requireLogin();
  }
});
