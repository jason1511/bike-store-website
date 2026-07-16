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

  if (typeof loadAdminPartials === "function") {
    await loadAdminPartials();
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

  if (typeof setupAdminBrandManager === "function") {
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

  if (typeof setupAdminUserManagement === "function") {
    setupAdminUserManagement();
  }

  if (typeof setupAuditLogs === "function") {
    setupAuditLogs();
  }

  if (typeof setupReportsPage === "function") {
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

  if (typeof loadAdminUsersPage === "function") {
    await loadAdminUsersPage();
  } else if (typeof loadAdminUsers === "function") {
    await loadAdminUsers();
  }

  if (typeof loadAuditPage === "function") {
    await loadAuditPage();
  } else if (typeof loadAuditLogs === "function") {
    await loadAuditLogs();
  }

  if (typeof loadReportsPage === "function") {
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