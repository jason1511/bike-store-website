/* =========================
   ADMIN AUDIT LOGS
========================= */
let adminAuditLogsCache = [];

const AUDIT_ACTION_LABELS = {
  bike_create: "Tambah Sepeda",
  bike_update: "Edit Sepeda",
  bike_reactivate: "Aktifkan Sepeda",
  bike_deactivate: "Nonaktifkan Sepeda",
  bike_toggle: "Aktif / Nonaktif Sepeda",

  brand_create: "Tambah Brand",
  brand_update: "Edit Brand",
  brand_activate: "Aktifkan Brand",
  brand_deactivate: "Nonaktifkan Brand",

  invoice_create: "Buat Invoice",
  invoice_void: "Batalkan Invoice",

  service_create: "Buat Service",
  service_update: "Update Service",

  user_create: "Tambah User",
  user_toggle: "Aktif / Nonaktif User"
};

function normalizeAuditAction(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function getAuditActionClass(action) {
  const actionText = normalizeAuditAction(action);

  if (
    actionText.includes("create") ||
    actionText.includes("activate") ||
    actionText.includes("reactivate")
  ) {
    return "is-create";
  }

  if (
    actionText.includes("delete") ||
    actionText.includes("deactivate") ||
    actionText.includes("cancel") ||
    actionText.includes("void")
  ) {
    return "is-delete";
  }

  if (actionText.includes("update") || actionText.includes("toggle")) {
    return "is-update";
  }

  return "";
}

function formatAuditActionLabel(action) {
  const normalizedAction = normalizeAuditAction(action);

  return AUDIT_ACTION_LABELS[normalizedAction] ||
    String(action || "-").replaceAll("_", " ");
}

function createAuditDetailsText(log) {
  const details = log.details || {};

  if (typeof details === "string") {
    return details;
  }

  if (Array.isArray(details.changedFields) && details.changedFields.length) {
    return `Field berubah: ${details.changedFields.join(", ")}`;
  }

  if (details.customerName && details.bikeName) {
    return `${details.customerName} membeli ${details.bikeName}. Total: ${formatRupiah(details.totalPrice)}.`;
  }

  if (details.serviceType && details.bikeLabel) {
    return `${details.customerName || "Customer"} - ${details.bikeLabel}. Status: ${
      typeof getServiceStatusLabel === "function"
        ? getServiceStatusLabel(details.serviceStatus || details.previousStatus)
        : details.serviceStatus || details.previousStatus || "-"
    }.`;
  }

  if (details.username && details.role) {
    return `User ${details.username} dibuat sebagai ${details.role}.`;
  }

  if (details.brand && details.name) {
    return `${details.brand} ${details.name}`;
  }

  if (details.previousInStock !== undefined || details.newInStock !== undefined) {
    return "Status katalog berubah.";
  }

  return "";
}

function getAuditSearchText(log) {
  return [
    log.action,
    formatAuditActionLabel(log.action),
    log.targetLabel,
    log.target_label,
    log.targetType,
    log.target_type,
    log.targetId,
    log.target_id,
    log.username,
    log.createdByUsername,
    log.created_by_username,
    log.role,
    log.createdByRole,
    log.created_by_role,
    createAuditDetailsText(log)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getFilteredAuditLogs() {
  const searchInput = document.getElementById("auditSearchInput");
  const actionFilter = document.getElementById("auditActionFilter");

  const searchTerm = normalizeSearchText(searchInput?.value || "");
  const selectedAction = normalizeAuditAction(actionFilter?.value || "all");

  return adminAuditLogsCache.filter((log) => {
    const logAction = normalizeAuditAction(log.action);
    const actionMatches =
      selectedAction === "all" ||
      selectedAction === "" ||
      logAction === selectedAction;

    if (!actionMatches) {
      return false;
    }

    if (!searchTerm) {
      return true;
    }

    return getAuditSearchText(log).includes(searchTerm);
  });
}

function updateAuditResultCount(filteredCount, totalCount) {
  const resultCount = document.getElementById("adminAuditResultCount");

  if (!resultCount) {
    return;
  }

  if (!totalCount) {
    resultCount.textContent = "Belum ada log aktivitas.";
    return;
  }

  if (filteredCount === totalCount) {
    resultCount.textContent = `Menampilkan ${totalCount} aktivitas.`;
    return;
  }

  resultCount.textContent = `Menampilkan ${filteredCount} dari ${totalCount} aktivitas.`;
}

async function fetchAuditLogs() {
  const data = await fetchAdminJson("/api/admin/audit-logs?limit=50", {
    method: "GET"
  });

  return data.logs || [];
}

function renderAuditLogs(logs) {
  const auditList = document.getElementById("adminAuditList");

  if (!auditList) {
    return;
  }

  if (!logs.length) {
    auditList.innerHTML = `
      <div class="admin-empty-state">
        Tidak ada aktivitas yang cocok dengan filter.
      </div>
    `;
    return;
  }

  auditList.innerHTML = logs
    .map((log) => {
      const action = log.action || "-";
      const actionClass = getAuditActionClass(action);
      const targetLabel = log.targetLabel || log.target_label || "-";
      const username = log.username || log.createdByUsername || log.created_by_username || "admin";
      const role = log.role || log.createdByRole || log.created_by_role || "admin";
      const createdAt = log.createdAt || log.created_at || "-";
      const detailsText = createAuditDetailsText(log);

      return `
        <article class="admin-audit-card">
          <div class="admin-audit-card-main">
            <div>
              <p class="admin-audit-action ${escapeHtml(actionClass)}">
                ${escapeHtml(formatAuditActionLabel(action))}
              </p>

              <h3>${escapeHtml(targetLabel)}</h3>

              ${
                detailsText
                  ? `<p class="admin-audit-details-text">${escapeHtml(detailsText)}</p>`
                  : ""
              }
            </div>

            <span class="admin-audit-time">
              ${escapeHtml(formatAuditDate(createdAt))}
            </span>
          </div>

          <div class="admin-audit-meta">
            <span>
              Oleh
              <strong class="admin-audit-user">
                ${escapeHtml(username)}
              </strong>
              (${escapeHtml(role)})
            </span>
          </div>
        </article>
      `;
    })
    .join("");
}

function applyAuditFilters() {
  const filteredLogs = getFilteredAuditLogs();

  renderAuditLogs(filteredLogs);
  updateAuditResultCount(filteredLogs.length, adminAuditLogsCache.length);
}

async function loadAuditLogs() {
  const auditList = document.getElementById("adminAuditList");

  if (!isCurrentUserAdmin()) {
    return;
  }

  if (auditList) {
    auditList.innerHTML = `
      <div class="admin-empty-state">
        Memuat aktivitas...
      </div>
    `;
  }

  try {
    adminAuditLogsCache = await fetchAuditLogs();
    applyAuditFilters();
  } catch (error) {
    if (handleAdminAuthError(error)) {
      return;
    }

    adminAuditLogsCache = [];

    if (auditList) {
      auditList.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(error.message)}
        </div>
      `;
    }

    updateAuditResultCount(0, 0);
  }
}

function setupAuditLogs() {
  const refreshButton = document.getElementById("refreshAuditLogsBtn");
  const searchInput = document.getElementById("auditSearchInput");
  const actionFilter = document.getElementById("auditActionFilter");

  if (refreshButton && !refreshButton.dataset.auditRefreshBound) {
    refreshButton.dataset.auditRefreshBound = "true";
    refreshButton.addEventListener("click", loadAuditLogs);
  }

  if (searchInput && !searchInput.dataset.auditSearchBound) {
    searchInput.dataset.auditSearchBound = "true";
    searchInput.addEventListener("input", applyAuditFilters);
  }

  if (actionFilter && !actionFilter.dataset.auditActionBound) {
    actionFilter.dataset.auditActionBound = "true";
    actionFilter.addEventListener("change", applyAuditFilters);
  }
}