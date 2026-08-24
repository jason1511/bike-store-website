/* =========================
   ADMIN MODULE STATE
========================= */
let adminProtectedModulesReady = false;
let adminProtectedModulesPromise = null;

function resetAdminProtectedModules() {
  adminProtectedModulesReady = false;
  adminProtectedModulesPromise = null;
}

/* =========================
   ADMIN MODULE SETUP
========================= */
async function setupAdminProtectedModules() {
  const token = typeof getStoredAdminToken === "function"
    ? getStoredAdminToken()
    : "";

  if (!token) {
    return;
  }

  const isAdmin = typeof isCurrentUserAdmin === "function" && isCurrentUserAdmin();

  if (typeof loadAdminPartials === "function") {
    await loadAdminPartials();
  }

  if (typeof configureAdminNavigationForRole === "function") {
    configureAdminNavigationForRole();
  }

  try {
    if (typeof loadAdminBrands === "function") {
      await loadAdminBrands();
    }
  } catch (error) {
    console.error(
      "Failed to load admin brands:",
      error
    );
  }

  if (typeof setupAdminViewNavigation === "function") {
    setupAdminViewNavigation();
  }

  if (isAdmin && typeof setupAdminBrandManager === "function") {
    await setupAdminBrandManager();
  }

  if (typeof setupBikeRefresh === "function") {
    setupBikeRefresh();
  }

  if (typeof setupImagePreviewInputs === "function") {
    setupImagePreviewInputs();
  }

  if (typeof setupColorVariantEditor === "function") {
    setupColorVariantEditor();
  }

  if (typeof setupBikeEditor === "function") {
    setupBikeEditor();
  }

  if (typeof setupBikeFormSave === "function") {
    setupBikeFormSave();
  }

  if (typeof setupAdminBikeFilters === "function") {
    setupAdminBikeFilters();
  }

  if (typeof setupInvoiceForm === "function") {
    setupInvoiceForm();
  }

  if (typeof setupInvoiceModal === "function") {
    setupInvoiceModal();
  }

  if (typeof setupServiceForm === "function") {
    setupServiceForm();
  }

  if (typeof setupServiceModal === "function") {
    setupServiceModal();
  }

  if (isAdmin && typeof setupAdminUserManagement === "function") {
    setupAdminUserManagement();
  }

  if (isAdmin && typeof setupAuditLogs === "function") {
    setupAuditLogs();
  }

  if (isAdmin && typeof setupReportsPage === "function") {
    setupReportsPage();
  }

  if (typeof loadAdminBikes === "function") {
    await loadAdminBikes();
  }

  if (typeof loadInvoicePage === "function") {
    await loadInvoicePage();
  }

  if (typeof loadServicePage === "function") {
    await loadServicePage();
  }

  if (isAdmin && typeof loadAdminUsersPage === "function") {
    await loadAdminUsersPage();
  } else if (isAdmin && typeof loadAdminUsers === "function") {
    await loadAdminUsers();
  }

  if (isAdmin && typeof loadAuditPage === "function") {
    await loadAuditPage();
  } else if (isAdmin && typeof loadAuditLogs === "function") {
    await loadAuditLogs();
  }

  if (isAdmin && typeof loadReportsPage === "function") {
    await loadReportsPage();
  }
}

/* =========================
   PROTECTED INITIALIZATION
========================= */
async function initializeAdminProtectedModules() {
  if (adminProtectedModulesReady) {
    return;
  }

  if (adminProtectedModulesPromise) {
    return adminProtectedModulesPromise;
  }

  adminProtectedModulesPromise = (
    async () => {
      try {
        await setupAdminProtectedModules();
        adminProtectedModulesReady = true;
      } catch (error) {
        console.error(
          "Failed to initialize protected admin modules:",
          error
        );

        throw error;
      } finally {
        adminProtectedModulesPromise = null;
      }
    }
  )();

  return adminProtectedModulesPromise;
}

/* =========================
   PASSWORD VISIBILITY
========================= */
const PASSWORD_VISIBLE_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
    <circle cx="12" cy="12" r="2.75"></circle>
  </svg>
`;

const PASSWORD_HIDDEN_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m3 3 18 18"></path>
    <path d="M10.6 6.15A10.6 10.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16.7 16.7 0 0 1-2.05 2.75"></path>
    <path d="M6.6 6.6C3.95 8.3 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3.4-.6"></path>
    <path d="M9.9 9.9a2.75 2.75 0 0 0 3.9 3.9"></path>
  </svg>
`;

function setPasswordVisibility(input, button, isVisible) {
  input.type = isVisible ? "text" : "password";
  button.setAttribute("aria-label", isVisible ? "Sembunyikan password" : "Tampilkan password");
  button.setAttribute("title", isVisible ? "Sembunyikan password" : "Tampilkan password");
  button.setAttribute("aria-pressed", String(isVisible));
  button.innerHTML = isVisible ? PASSWORD_HIDDEN_ICON : PASSWORD_VISIBLE_ICON;
}

function enhancePasswordInput(input) {
  if (!(input instanceof HTMLInputElement) || input.dataset.passwordToggleReady) {
    return;
  }

  input.dataset.passwordToggleReady = "true";

  const wrapper = document.createElement("div");
  wrapper.className = "admin-password-field";
  input.parentNode.insertBefore(wrapper, input);
  wrapper.append(input);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "admin-password-toggle";
  setPasswordVisibility(input, button, false);

  button.addEventListener("click", () => {
    const isVisible = input.type !== "password";
    setPasswordVisibility(input, button, !isVisible);
    input.focus({ preventScroll: true });
  });

  wrapper.append(button);
}

function enhancePasswordInputs(root = document) {
  if (root instanceof HTMLInputElement && root.matches('input[type="password"]')) {
    enhancePasswordInput(root);
  }

  if (typeof root.querySelectorAll === "function") {
    root.querySelectorAll('input[type="password"]').forEach(enhancePasswordInput);
  }
}

function setupPasswordVisibilityToggles() {
  if (document.body.dataset.passwordVisibilityBound) return;
  document.body.dataset.passwordVisibilityBound = "true";

  enhancePasswordInputs();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) enhancePasswordInputs(node);
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener("reset", (event) => {
    window.setTimeout(() => {
      event.target
        .querySelectorAll("[data-password-toggle-ready]")
        .forEach((input) => {
          const button = input.parentElement?.querySelector(".admin-password-toggle");
          if (button) setPasswordVisibility(input, button, false);
        });
    }, 0);
  });
}

setupPasswordVisibilityToggles();

/* =========================
   ADMIN STARTUP
========================= */
async function initializeAdmin() {
  if (typeof setupAdminLogin === "function") {
    setupAdminLogin();
  }

  if (typeof setupAdminLogout === "function") {
    setupAdminLogout();
  }

  if (typeof restoreAdminSession === "function") {
    await restoreAdminSession();
  }
}

initializeAdmin().catch((error) => {
  console.error(
    "Failed to initialize admin dashboard:",
    error
  );
});
