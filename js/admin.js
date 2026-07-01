/* =========================
   ADMIN INIT
========================= */
async function initializeAdmin() {
  setupAdminLogin();
  setupAdminLogout();
  setupAdminViewNavigation();

  await restoreAdminSession();

  try {
    if (typeof loadAdminBrands === "function") {
      await loadAdminBrands();
    }
  } catch (error) {
    console.error("Failed to load admin brands:", error);
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
}

initializeAdmin();