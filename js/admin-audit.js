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

function renderAuditLogs(logs) {
  const auditList = document.getElementById("adminAuditList");

  if (!auditList) {
    return;
  }

  if (!logs.length) {
    auditList.innerHTML = `
      <div class="admin-empty-state">
        Belum ada aktivitas.
      </div>
    `;
    return;
  }

  auditList.innerHTML = logs
    .map((log) => {
      const actionClass = getAuditActionClass(log.action);
      const detailsText = createAuditDetailsText(log);

      return `
        <article class="admin-audit-card">
          <div class="admin-audit-main">
            <div>
              <h3>${escapeHtml(log.targetLabel || log.targetId || "Target tidak diketahui")}</h3>

              <div class="admin-audit-meta">
                <span class="admin-audit-action ${actionClass}">
                  ${escapeHtml(getAuditActionLabel(log.action))}
                </span>

                <span>
                  Oleh ${escapeHtml(log.actorUsername || "-")} (${escapeHtml(log.actorRole || "-")})
                </span>

                <span>
                  ${escapeHtml(formatAuditDate(log.createdAt))}
                </span>
              </div>
            </div>
          </div>

          ${
            detailsText
              ? `
                <p class="admin-audit-details">
                  ${escapeHtml(detailsText)}
                </p>
              `
              : ""
          }
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