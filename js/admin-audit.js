/* =========================
   ADMIN AUDIT LOGS
========================= */
function getAuditActionLabel(action) {
  const labels = {
    bike_create: "Tambah Sepeda",
    bike_update: "Edit Sepeda",
    bike_deactivate: "Nonaktifkan Sepeda",
    bike_reactivate: "Aktifkan Sepeda",
    bike_hard_delete: "Hapus Permanen",

    invoice_create: "Buat Invoice",

    service_create: "Tambah Service",
    service_update: "Update Service",

    user_create: "Tambah User",
    user_update: "Edit User"
  };

  return labels[action] || action || "Aktivitas";
}

function getAuditActionClass(action) {
  const actionText = String(action || "");

  if (actionText.includes("create") || actionText.includes("reactivate")) {
    return "is-create";
  }

  if (actionText.includes("delete") || actionText.includes("deactivate") || actionText.includes("cancel")) {
    return "is-delete";
  }

  if (actionText.includes("update")) {
    return "is-update";
  }

  return "";
}

function createAuditDetailsText(log) {
  const details = log.details || {};

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

async function fetchAuditLogs() {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/audit-logs?limit=50", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal memuat audit log.");
  }

  return data.logs || [];
}
function formatAuditActionLabel(action) {
  const labels = {
    bike_create: "Tambah Sepeda",
    bike_update: "Edit Sepeda",
    bike_toggle: "Aktif / Nonaktif Sepeda",

    brand_create: "Tambah Brand",
    brand_update: "Edit Brand",
    brand_activate: "Aktifkan Brand",
    brand_deactivate: "Nonaktifkan Brand",

    invoice_create: "Buat Invoice",

    service_create: "Buat Service",
    service_update: "Update Service",

    user_create: "Tambah User",
    user_toggle: "Aktif / Nonaktif User"
  };

  return labels[action] || String(action || "-").replaceAll("_", " ");
}
function renderAuditLogs(logs) {
  const auditList = document.getElementById("adminAuditList");
  const resultCount = document.getElementById("adminAuditResultCount");

  if (!auditList) {
    return;
  }

  if (resultCount) {
    resultCount.textContent = logs.length
      ? `Menampilkan ${logs.length} aktivitas.`
      : "Belum ada log aktivitas.";
  }

  if (!logs.length) {
    auditList.innerHTML = `
      <div class="admin-empty-state">
        Belum ada log aktivitas.
      </div>
    `;
    return;
  }

  auditList.innerHTML = logs
    .map((log) => {
      const action = log.action || "-";
      const targetLabel = log.targetLabel || log.target_label || "-";
      const username = log.username || log.createdByUsername || log.created_by_username || "admin";
      const role = log.role || log.createdByRole || log.created_by_role || "admin";
      const createdAt = log.createdAt || log.created_at || "-";

      return `
        <article class="admin-audit-card">
          <div class="admin-audit-card-main">
            <div>
              <p class="admin-audit-action">
                ${escapeHtml(formatAuditActionLabel(action))}
              </p>

              <h3>${escapeHtml(targetLabel)}</h3>
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
    const logs = await fetchAuditLogs();
    renderAuditLogs(logs);
  } catch (error) {
    if (auditList) {
      auditList.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }
}

function setupAuditLogs() {
  const refreshButton = document.getElementById("refreshAuditLogsBtn");

  if (refreshButton) {
    refreshButton.addEventListener("click", loadAuditLogs);
  }
}