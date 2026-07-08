/* =========================
   ADMIN INIT
========================= */
let adminProtectedModulesReady = false;

async function initializeAdminProtectedModules() {
  const token = typeof getStoredAdminToken === "function"
    ? getStoredAdminToken()
    : "";

  if (!token) {
    return;
  }

  try {
    if (typeof loadAdminPartials === "function") {
      await loadAdminPartials();
    }
  } catch (error) {
    console.error("Failed to load admin partials:", error);
    return;
  }

  try {
    if (typeof loadAdminBrands === "function") {
      await loadAdminBrands();
    }
  } catch (error) {
    console.error("Failed to load admin brands:", error);
  }

  setupAdminViewNavigation();

  if (typeof setupAdminBrandManager === "function") {
    await setupAdminBrandManager();
  }

  setupBikeRefresh();
  setupImagePreviewInputs();
  setupColorVariantEditor();
  setupBikeEditor();
  setupBikeFormSave();
  setupAdminBikeFilters();

  setupInvoiceForm();
  setupInvoiceModal();

  setupServiceForm();
  setupServiceModal();

  setupAdminUserManagement();
  setupAuditLogs();
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
  adminProtectedModulesReady = true;
}

async function initializeAdmin() {
  setupAdminLogin();
  setupAdminLogout();

  await restoreAdminSession();
}

initializeAdmin();