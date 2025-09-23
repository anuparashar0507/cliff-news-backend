// Auth module for The Cliff News CMS
// Handles authentication and user management

// Prevent redeclaration
if (typeof authModule === 'undefined') {
  var authModule = {
  // Initialize auth module
  init: function () {
    console.log("🔐 Initializing auth module...");
    this.setupEventListeners();
  },

  // Setup event listeners
  setupEventListeners: function () {
    // Login form submission
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // Logout button
    const logoutBtn = document.querySelector('[onclick*="logout"]');
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.logout();
      });
    }
  },

  // Handle login
  async handleLogin() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorDiv = document.getElementById("login-error");

    try {
      showLoading("Logging in...");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem("authToken", authToken);
        showApp();
        showNotification("Login successful!", "success");
      } else {
        errorDiv.textContent = data.error || "Login failed";
        errorDiv.style.display = "block";
      }
    } catch (error) {
      errorDiv.textContent = "Network error. Please try again.";
      errorDiv.style.display = "block";
    } finally {
      hideLoading();
    }
  },

  // Logout function
  logout: function () {
    localStorage.removeItem("authToken");
    authToken = null;
    currentUser = null;
    showLogin();
    showNotification("Logged out successfully", "info");
  },

  // Verify token
  async verifyToken() {
    if (!authToken) return false;

    try {
      const response = await fetch("/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        currentUser = data.user;
        return true;
      } else {
        localStorage.removeItem("authToken");
        authToken = null;
        return false;
      }
    } catch (error) {
      console.error("Auth verification failed:", error);
      return false;
    }
  },

  // Get current user
  getCurrentUser: function () {
    return currentUser;
  },

  // Check if user is admin
  isAdmin: function () {
    return currentUser && currentUser.role === "ADMIN";
  },

  // Check if user is editor
  isEditor: function () {
    return (
      currentUser &&
      (currentUser.role === "EDITOR" || currentUser.role === "ADMIN")
    );
  },

  // Update user profile
  async updateProfile(profileData) {
    try {
      const response = await apiCall("/auth/profile", "PUT", profileData);

      if (response.success) {
        showNotification("Profile updated successfully", "success");
        if (response.user) {
          currentUser = response.user;
          document.getElementById("user-name").textContent = currentUser.name;
        }
      } else {
        showNotification("Failed to update profile", "error");
      }
    } catch (error) {
      console.error("❌ Failed to update profile:", error);
      showNotification("Failed to update profile", "error");
    }
  },

  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await apiCall("/auth/change-password", "PUT", {
        currentPassword,
        newPassword,
      });

      if (response.success) {
        showNotification("Password changed successfully", "success");
      } else {
        showNotification("Failed to change password", "error");
      }
    } catch (error) {
      console.error("❌ Failed to change password:", error);
      showNotification("Failed to change password", "error");
    }
  },
};

// Make module available globally
window.authModule = authModule;
} // End of conditional declaration
