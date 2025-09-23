// Main JavaScript for The Cliff News CMS
// Core functionality and module management

// Global variables
let currentUser = null;
let authToken = null;
let currentEditingArticle = null;
const API_BASE = "/api";

// Module registry for lazy loading
const modules = {
  auth: null,
  dashboard: null,
  articles: null,
  categories: null,
  epapers: null,
  highlights: null,
  nit: null,
  notifications: null,
  users: null,
};

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Initializing The Cliff News CMS...");

  // Check authentication
  checkAuth();

  // Setup event listeners
  setupEventListeners();

  // Initialize modules
  initializeModules();
});

// Check authentication status
function checkAuth() {
  const token = localStorage.getItem("authToken");
  if (token) {
    authToken = token;
    verifyToken();
  } else {
    showLogin();
  }
}

// Verify token with server
async function verifyToken() {
  try {
    const response = await fetch(`${API_BASE}/auth/verify`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      showApp();
    } else {
      localStorage.removeItem("authToken");
      showLogin();
    }
  } catch (error) {
    console.error("Auth verification failed:", error);
    showLogin();
  }
}

// Show login modal
function showLogin() {
  document.getElementById("login-modal").style.display = "flex";
  document.getElementById("app").style.display = "none";
}

// Show main application
function showApp() {
  document.getElementById("login-modal").style.display = "none";
  document.getElementById("app").style.display = "flex";

  // Update user info
  document.getElementById("user-name").textContent = currentUser.name;
  document.getElementById("user-role").textContent = currentUser.role;

  // Show admin-only sections
  if (currentUser.role === "ADMIN") {
    document.querySelectorAll(".admin-only").forEach((el) => {
      el.style.display = "block";
    });
  }

  // Load dashboard
  loadModule("dashboard");
}

// Setup event listeners
function setupEventListeners() {
  // Login form
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Navigation links
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const section = this.getAttribute("href").substring(1);
      if (section) {
        showSection(section);
      }
    });
  });

  // Global keyboard shortcuts
  document.addEventListener("keydown", handleKeyboardShortcuts);
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
  // Ctrl/Cmd + K for search
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    focusSearch();
  }

  // Escape to close modals
  if (e.key === "Escape") {
    closeAllModals();
  }
}

// Focus search input
function focusSearch() {
  const searchInput = document.querySelector(
    'input[type="search"], input[placeholder*="Search"]'
  );
  if (searchInput) {
    searchInput.focus();
  }
}

// Close all modals
function closeAllModals() {
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.style.display = "none";
  });
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorDiv = document.getElementById("login-error");

  try {
    showLoading("Logging in...");

    const response = await fetch(`${API_BASE}/auth/login`, {
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
}

// Logout function
function logout() {
  localStorage.removeItem("authToken");
  authToken = null;
  currentUser = null;
  showLogin();
  showNotification("Logged out successfully", "info");
}

// Show section
function showSection(section) {
  console.log(`🎯 Showing section: ${section}`);

  // Stop auto-save if leaving articles section
  if (window.articlesModule && window.articlesModule.stopAutoSave) {
    window.articlesModule.stopAutoSave();
  }

  // Hide all sections
  document.querySelectorAll(".content-section").forEach((el) => {
    el.classList.remove("active");
  });

  // Update navigation
  document.querySelectorAll(".nav-link").forEach((el) => {
    el.classList.remove("active");
  });

  // Show selected section
  const targetSection = document.getElementById(`${section}-content`);
  console.log(`📄 Target section element:`, !!targetSection);
  console.log(`🔍 Looking for element with ID: ${section}-content`);
  console.log(
    `🔍 All content sections:`,
    document.querySelectorAll(".content-section").length
  );
  if (targetSection) {
    targetSection.classList.add("active");
    // Only update navigation if there's a corresponding nav link
    const navLink = document.querySelector(`[href="#${section}"]`);
    if (navLink) {
      navLink.classList.add("active");
    }
    console.log(`✅ Section ${section} displayed successfully`);
  } else {
    console.error(`❌ Section ${section} not found`);
    console.log(
      `🔍 Available sections:`,
      Array.from(document.querySelectorAll(".content-section")).map(
        (el) => el.id
      )
    );
  }

  // Update page title
  const titles = {
    dashboard: "Dashboard",
    articles: "Articles",
    categories: "Categories",
    epapers: "E-Papers",
    highlights: "Highlights",
    nit: "NIT",
    notifications: "Notifications",
    users: "Users",
  };

  const pageTitle = document.getElementById("page-title");
  if (pageTitle) {
    pageTitle.textContent = titles[section] || section;
  }

  // Load section data
  loadModule(section);
}

// Load module dynamically
async function loadModule(moduleName) {
  try {
    console.log(`🔄 Loading module: ${moduleName}`);
    if (!modules[moduleName]) {
      // Load module script
      const script = document.createElement("script");
      script.src = `/cms/assets/js/${moduleName}.js`;
      script.onload = () => {
        console.log(`✅ Module ${moduleName} loaded successfully`);
        modules[moduleName] = window[`${moduleName}Module`];
        console.log(
          `📦 Module ${moduleName} available:`,
          !!modules[moduleName]
        );
        if (modules[moduleName] && modules[moduleName].init) {
          console.log(`🚀 Initializing module ${moduleName}...`);
          modules[moduleName].init();
        }
      };
      script.onerror = () => {
        console.error(`❌ Failed to load module script: ${moduleName}`);
      };
      document.head.appendChild(script);
    } else if (modules[moduleName] && modules[moduleName].init) {
      console.log(`🔄 Re-initializing module ${moduleName}...`);
      modules[moduleName].init();
    }
  } catch (error) {
    console.error(`Failed to load module ${moduleName}:`, error);
  }
}

// Initialize modules
function initializeModules() {
  // Load core modules
  loadModule("auth");
  loadModule("dashboard");
}

// API call helper
async function apiCall(endpoint, method = "GET", data = null) {
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  };

  if (data && method !== "GET") {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
}

// Show loading state
function showLoading(message = "Loading...") {
  const loadingDiv =
    document.getElementById("loading-overlay") || createLoadingOverlay();
  loadingDiv.querySelector(".loading-message").textContent = message;
  loadingDiv.style.display = "flex";
}

// Hide loading state
function hideLoading() {
  const loadingDiv = document.getElementById("loading-overlay");
  if (loadingDiv) {
    loadingDiv.style.display = "none";
  }
}

// Create loading overlay
function createLoadingOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "loading-overlay";
  overlay.className = "modal";
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="flex items-center justify-center p-6">
        <div class="spinner"></div>
        <span class="loading-message ml-3">Loading...</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

// Show notification
function showNotification(message, type = "info", duration = 3000) {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="flex items-center justify-between">
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto remove after duration
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, duration);
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Get status color class
function getStatusColor(status) {
  switch (status) {
    case "PUBLISHED":
      return "badge-success";
    case "DRAFT":
      return "badge-warning";
    case "ARCHIVED":
      return "badge-gray";
    case "SENT":
      return "badge-success";
    case "SCHEDULED":
      return "badge-warning";
    case "FAILED":
      return "badge-error";
    default:
      return "badge-gray";
  }
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function
function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate URL
function isValidURL(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Copy to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showNotification("Copied to clipboard!", "success");
  } catch (err) {
    console.error("Failed to copy: ", err);
    showNotification("Failed to copy to clipboard", "error");
  }
}

// Download file
function downloadFile(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Confirm dialog
function confirmDialog(message, callback) {
  if (confirm(message)) {
    callback();
  }
}

// Export functions for global use
window.CMS = {
  showSection,
  loadModule,
  apiCall,
  showNotification,
  showLoading,
  hideLoading,
  formatDate,
  formatFileSize,
  getStatusColor,
  debounce,
  throttle,
  isValidEmail,
  isValidURL,
  generateSlug,
  copyToClipboard,
  downloadFile,
  confirmDialog,
  logout,
};
