/* =========================
   ADMIN CORE
   Shared state, helpers, auth, navigation
========================= */
const ADMIN_SESSION_STORAGE_KEY = "nbaAdminSessionToken";
const ADMIN_USER_STORAGE_KEY = "nbaAdminUser";

let adminBikesCache = [];
let adminServicesCache = [];

/* =========================
   SESSION STORAGE
========================= */
function getStoredAdminToken() {
  return sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || "";
}

function getStoredAdminUser() {
  try {
    return JSON.parse(sessionStorage.getItem(ADMIN_USER_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function setStoredAdminSession(token, user) {
  sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token);
  sessionStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(user));
}

function clearStoredAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  sessionStorage.removeItem(ADMIN_USER_STORAGE_KEY);
}

function isCurrentUserAdmin() {
  const user = getStoredAdminUser();
  return user?.role === "admin";
}

/* =========================
   GENERAL HELPERS
========================= */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createSlugFromName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().trim();
}

function formatRupiah(value) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function formatAdminDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* Backward-compatible name because invoice/audit code already uses this */
function formatAuditDate(value) {
  return formatAdminDate(value);
}

function parseBikeColors(colors) {
  if (Array.isArray(colors)) {
    return colors;
  }

  if (typeof colors === "string") {
    try {
      const parsedColors = JSON.parse(colors);
      return Array.isArray(parsedColors) ? parsedColors : [];
    } catch (error) {
      return [];
    }
  }

  return [];
}

/* =========================
   MESSAGE HELPERS
========================= */
function setAdminMessage(message, type = "") {
  const messageElement = document.getElementById("adminLoginMessage");

  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.classList.remove("is-error", "is-success");

  if (type) {
    messageElement.classList.add(type);
  }
}

function setAdminFormNote(message, type = "") {
  const note = document.getElementById("adminFormNote");

  if (!note) {
    return;
  }

  note.textContent = message;
  note.classList.remove("is-error", "is-success");

  if (type) {
    note.classList.add(type);
  }
}

function setUploadNote(noteElement, message, type = "") {
  if (!noteElement) {
    return;
  }

  noteElement.textContent = message;
  noteElement.classList.remove("is-error", "is-success");

  if (type) {
    noteElement.classList.add(type);
  }
}

/* =========================
   ADMIN AUTH
========================= */
async function loginAdmin(username, password) {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username,
      password
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Username atau password salah");
  }

  return data;
}

async function verifyAdminSession(token) {
  const response = await fetch("/api/admin/verify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Session admin tidak valid");
  }

  return data;
}

function setupAdminLogin() {
  const form = document.getElementById("adminLoginForm");
  const usernameInput = document.getElementById("adminUsernameInput");
  const passwordInput = document.getElementById("adminPasswordInput");

  if (!form || !usernameInput || !passwordInput) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      setAdminMessage("Masukkan username dan password terlebih dahulu.", "is-error");
      return;
    }

    setAdminMessage("Memeriksa akun admin...");

    try {
      const data = await loginAdmin(username, password);

      setStoredAdminSession(data.token, {
        username: data.username,
        role: data.role,
        permissions: data.permissions
      });

      passwordInput.value = "";
      setAdminMessage("Login berhasil.", "is-success");
      showAdminDashboard();

      if (typeof initializeAdminProtectedModules === "function") {
        await initializeAdminProtectedModules();
      }
    } catch (error) {
      clearStoredAdminSession();
      setAdminMessage(error.message, "is-error");
    }
  });
}

function setupAdminLogout() {
  const logoutButton = document.getElementById("adminLogoutBtn");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", () => {
    clearStoredAdminSession();

    adminBikesCache = [];
    adminServicesCache = [];

    if (typeof hideBikeEditor === "function") {
      hideBikeEditor();
    }

    showAdminLogin();
    setAdminMessage("Anda sudah keluar dari dashboard admin.");
  });
}

async function restoreAdminSession() {
  const token = getStoredAdminToken();

  if (!token) {
    showAdminLogin();
    return;
  }

  try {
    const data = await verifyAdminSession(token);

    setStoredAdminSession(data.token || token, {
      username: data.username,
      role: data.role,
      permissions: data.permissions
    });

    showAdminDashboard();

    if (typeof initializeAdminProtectedModules === "function") {
      await initializeAdminProtectedModules();
    }
  } catch (error) {
    console.error("Session restore failed:", error);
    clearStoredAdminSession();
    showAdminLogin();
  }
}

/* =========================
   DASHBOARD VIEW STATE
========================= */
function renderAdminCurrentUserLabel() {
  const label = document.getElementById("adminCurrentUserLabel");
  const user = getStoredAdminUser();

  if (!label || !user) {
    return;
  }

  const username = user.username || "User";
  const role = String(user.role || "").toUpperCase();

  label.innerHTML = `
    <span>${escapeHtml(username)}</span>
    <strong>${escapeHtml(role)}</strong>
  `;
}
function showAdminLogin() {
  const loginSection = document.getElementById("adminLoginSection");
  const dashboard = document.getElementById("adminDashboard");

  if (loginSection) {
    loginSection.classList.remove("is-hidden");
  }

  if (dashboard) {
    dashboard.classList.add("is-hidden");
  }
}
function showAdminDashboard() {
  const loginSection = document.getElementById("adminLoginSection");
  const dashboard = document.getElementById("adminDashboard");

  if (loginSection) {
    loginSection.classList.add("is-hidden");
  }

  if (dashboard) {
    dashboard.classList.remove("is-hidden");
  }

  renderAdminCurrentUserLabel();
}

/* =========================
   FAKE PAGE NAVIGATION
========================= */
function configureAdminNavigationForRole() {
  const isAdmin = isCurrentUserAdmin();
  const adminOnlyLinks = document.querySelectorAll("[data-admin-only]");
  const adminOnlyViews = document.querySelectorAll("[data-admin-only-view]");

  adminOnlyLinks.forEach((element) => {
    element.classList.toggle("is-hidden", !isAdmin);
  });

  adminOnlyViews.forEach((element) => {
    element.classList.toggle("is-hidden", !isAdmin);
  });
}

function showAdminView(viewId) {
  const isAdmin = isCurrentUserAdmin();
  const targetView = document.getElementById(viewId);

  if (!targetView) {
    return;
  }

  if (targetView.hasAttribute("data-admin-only-view") && !isAdmin) {
    showAdminView("adminCatalogueView");
    return;
  }

  document.querySelectorAll(".admin-view").forEach((view) => {
    view.classList.toggle("is-active", view.id === viewId);
  });

  document.querySelectorAll("[data-admin-view-target]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminViewTarget === viewId);
  });

  if (viewId === "adminCatalogueView" && typeof loadAdminBikes === "function") {
    loadAdminBikes();
  }

  if (viewId === "adminSalesView" && typeof loadInvoicePage === "function") {
    loadInvoicePage();
  }

  if (viewId === "adminServiceView" && typeof loadServicePage === "function") {
    loadServicePage();
  }

  if (viewId === "adminUsersView" && isAdmin && typeof loadAdminUsers === "function") {
    loadAdminUsers();
  }

  if (viewId === "adminAuditView" && isAdmin && typeof loadAuditLogs === "function") {
    loadAuditLogs();
  }
}

function setupAdminViewNavigation() {
  document.querySelectorAll("[data-admin-view-target]").forEach((button) => {
    button.addEventListener("click", () => {
      showAdminView(button.dataset.adminViewTarget);
    });
  });
}