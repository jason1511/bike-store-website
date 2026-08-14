/* =========================
   ADMIN AUDIT LOGS
========================= */
const AUDIT_PAGE_SIZE = 25;

let adminAuditLogsCache = [];
let adminAuditState = {
  page: 1,
  total: 0,
  totalPages: 1,
  searchTimer: null,
  requestId: 0
};

const AUDIT_ACTION_LABELS = {
  bike_create: "Tambah Sepeda",
  bike_update: "Edit Sepeda",
  bike_reactivate: "Aktifkan Sepeda",
  bike_deactivate: "Nonaktifkan Sepeda",
  bike_toggle: "Ubah Status Sepeda",
  bike_hard_delete: "Hapus Permanen Sepeda",
  brand_create: "Tambah Brand",
  brand_update: "Edit Brand",
  brand_activate: "Aktifkan Brand",
  brand_deactivate: "Nonaktifkan Brand",
  invoice_create: "Buat Invoice",
  invoice_void: "Batalkan Invoice",
  invoice_edit: "Edit Invoice",
  invoice_delete_authorized:
    "Otorisasi Hapus Invoice",
  invoice_delete: "Hapus Invoice",
  service_create: "Buat Service",
  service_update: "Update Service",
  user_create: "Tambah User",
  user_update: "Edit User",
  user_toggle: "Ubah Status User",
  login_success: "Login Berhasil",
  login_failed: "Login Gagal",
  login_locked: "Login Dikunci"
};

const AUDIT_FIELD_LABELS = {
  brand: "brand",
  name: "nama model",
  price: "harga",
  inStock: "status katalog",
  stockQty: "total stok",
  colors: "warna dan stok",
  customerName: "nama customer",
  customerPhone: "nomor WhatsApp",
  customerAddress: "alamat",
  paymentMethod: "metode pembayaran",
  paymentBank: "bank pembayaran",
  notes: "catatan",
  items: "item invoice",
  role: "role",
  status: "status user",
  password: "password",
  isActive: "status aktif"
};

function normalizeAuditAction(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function formatAuditActionLabel(action) {
  const normalizedAction = normalizeAuditAction(action);

  return AUDIT_ACTION_LABELS[normalizedAction] ||
    String(action || "-")
      .replaceAll("_", " ");
}

function getAuditStockChanges(log) {
  const stockChanges = log?.details?.stockChanges;

  return Array.isArray(stockChanges)
    ? stockChanges
    : [];
}

function getAuditSeverity(log) {
  const action = normalizeAuditAction(log.action);
  const details = log.details || {};
  const changedFields = Array.isArray(
    details.changedFields
  )
    ? details.changedFields
    : [];

  if (
    action.includes("delete") ||
    action.includes("void") ||
    action.includes("deactivate") ||
    action === "login_locked" ||
    (
      action === "user_update" &&
      (
        details.passwordChanged ||
        details.roleChanged ||
        details.deactivated ||
        changedFields.includes("role")
      )
    )
  ) {
    return "critical";
  }

  if (
    action === "login_failed" ||
    action === "service_update" ||
    (
      action === "bike_update" &&
      getAuditStockChanges(log).length > 0
    )
  ) {
    return "warning";
  }

  return "normal";
}

function getAuditActionClass(log) {
  const severity = getAuditSeverity(log);
  const action = normalizeAuditAction(log.action);

  if (severity === "critical") {
    return "is-critical";
  }

  if (severity === "warning") {
    return "is-warning";
  }

  if (
    action.includes("create") ||
    action.includes("activate") ||
    action.includes("reactivate") ||
    action === "login_success"
  ) {
    return "is-create";
  }

  return "is-update";
}

function getAuditSeverityLabel(severity) {
  return severity === "critical"
    ? "Kritis"
    : severity === "warning"
      ? "Peringatan"
      : "Normal";
}

function getAuditModule(log) {
  const targetType = String(
    log.targetType || log.target_type || ""
  ).toLowerCase();

  if (targetType === "bike" && getAuditStockChanges(log).length) {
    return { key: "stock", label: "Stok" };
  }

  const modules = {
    bike: { key: "catalog", label: "Katalog" },
    brand: { key: "catalog", label: "Brand" },
    invoice: { key: "sales", label: "Penjualan" },
    service: { key: "service", label: "Service" },
    user: { key: "user", label: "User" },
    auth: { key: "security", label: "Keamanan" }
  };

  return modules[targetType] || {
    key: "other",
    label: "Lainnya"
  };
}

function formatAuditSignedQuantity(value) {
  const number = Number(value || 0);

  return number > 0
    ? `+${number.toLocaleString("id-ID")}`
    : number.toLocaleString("id-ID");
}

function formatAuditFieldLabel(field) {
  return AUDIT_FIELD_LABELS[field] ||
    String(field || "-").replaceAll("_", " ");
}

function createAuditDetailsText(log) {
  const details = log.details || {};
  const action = normalizeAuditAction(log.action);
  const stockChanges = getAuditStockChanges(log);

  if (action === "login_success") {
    return "Login admin berhasil.";
  }

  if (action === "login_failed") {
    return details.reason === "missing_credentials"
      ? "Login gagal karena data login tidak lengkap."
      : "Login gagal karena kredensial tidak cocok.";
  }

  if (action === "login_locked") {
    return `Login ditolak setelah ${Number(
      details.failedAttempts || 5
    )} percobaan gagal.`;
  }

  if (stockChanges.length) {
    const preview = stockChanges.slice(0, 2)
      .map((change) => {
        return `${change.colorName || "Warna belum dicatat"}: ` +
          `${Number(change.quantityBefore || 0)} → ` +
          `${Number(change.quantityAfter || 0)} ` +
          `(${formatAuditSignedQuantity(
            change.quantityChange
          )})`;
      });
    const remaining = stockChanges.length - preview.length;

    return `${preview.join(" · ")}${
      remaining > 0
        ? ` · +${remaining} warna lainnya`
        : ""
    }`;
  }

  if (action === "invoice_create") {
    const units = Array.isArray(details.items)
      ? details.items.reduce((total, item) => {
          return total + Number(item.quantity || 0);
        }, 0)
      : Number(details.itemCount || 0);

    return `${details.customerName || "Customer"} · ` +
      `${units} unit · ${formatRupiah(
        details.totalPrice || 0
      )}`;
  }

  if (action === "invoice_edit") {
    const before = details.before || {};
    const after = details.after || {};
    const changedFields = [];

    [
      "customerName",
      "customerPhone",
      "customerAddress",
      "paymentMethod",
      "paymentBank",
      "notes"
    ].forEach((field) => {
      if (before[field] !== after[field]) {
        changedFields.push(formatAuditFieldLabel(field));
      }
    });

    if (
      JSON.stringify(before.items || []) !==
      JSON.stringify(after.items || [])
    ) {
      changedFields.push("item invoice");
    }

    return [
      details.reason
        ? `Alasan: ${details.reason}.`
        : "",
      changedFields.length
        ? `Diubah: ${changedFields.join(", ")}.`
        : "Tidak ada perubahan nilai terdeteksi."
    ].filter(Boolean).join(" ");
  }

  if (
    action === "invoice_void" ||
    action.includes("invoice_delete")
  ) {
    return [
      details.customerName
        ? `Customer: ${details.customerName}.`
        : "",
      details.reason
        ? `Alasan: ${details.reason}.`
        : "",
      details.stockRestored === true
        ? "Stok dikembalikan."
        : details.stockRestorationRequired === true
          ? "Pengembalian stok diperlukan."
          : ""
    ].filter(Boolean).join(" ");
  }

  if (action === "service_create" || action === "service_update") {
    const status = details.serviceStatus ||
      details.previousStatus || "-";

    return `${details.customerName || "Customer"} · ` +
      `${details.bikeLabel || "Sepeda"} · Status ${status}.`;
  }

  if (action === "user_create") {
    return `User dibuat sebagai ${details.role || "-"}.`;
  }

  if (action === "user_update") {
    const changedFields = Array.isArray(details.changedFields)
      ? details.changedFields.map(formatAuditFieldLabel)
      : [];

    return changedFields.length
      ? `Diubah: ${changedFields.join(", ")}.`
      : "Data user diperbarui.";
  }

  if (action === "brand_create") {
    return details.slug
      ? `Brand ditambahkan dengan slug ${details.slug}.`
      : "Brand baru ditambahkan.";
  }

  if (action === "brand_update") {
    return details.previousName && details.name &&
      details.previousName !== details.name
      ? `Nama diubah dari ${details.previousName} menjadi ${details.name}.`
      : "Data brand diperbarui.";
  }

  if (
    action === "brand_activate" ||
    action === "brand_deactivate"
  ) {
    return action === "brand_activate"
      ? "Brand diaktifkan kembali."
      : "Brand dinonaktifkan.";
  }

  if (
    Array.isArray(details.changedFields) &&
    details.changedFields.length
  ) {
    return `Diubah: ${details.changedFields
      .map(formatAuditFieldLabel)
      .join(", ")}.`;
  }

  if (details.brand && details.name) {
    return `${details.brand} ${details.name}`;
  }

  if (
    details.previousInStock !== undefined ||
    details.newInStock !== undefined
  ) {
    return "Status katalog berubah.";
  }

  return "";
}

function renderAuditStockChanges(stockChanges) {
  if (!stockChanges.length) {
    return "";
  }

  return `
    <div class="admin-audit-change-section">
      <h4>Perubahan stok per warna</h4>
      <div class="admin-audit-stock-changes">
        ${stockChanges.map((change) => `
          <div>
            <span>${escapeHtml(
              change.colorName || "Warna belum dicatat"
            )}</span>
            <strong>
              ${Number(change.quantityBefore || 0).toLocaleString("id-ID")}
              →
              ${Number(change.quantityAfter || 0).toLocaleString("id-ID")}
            </strong>
            <em>${escapeHtml(
              formatAuditSignedQuantity(change.quantityChange)
            )}</em>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderAuditChangedFields(details = {}) {
  const fields = Array.isArray(details.changedFields)
    ? details.changedFields
    : [];

  if (!fields.length) {
    return "";
  }

  return `
    <div class="admin-audit-change-section">
      <h4>Field yang berubah</h4>
      <div class="admin-audit-field-chips">
        ${fields.map((field) => `
          <span>${escapeHtml(
            formatAuditFieldLabel(field)
          )}</span>
        `).join("")}
      </div>
    </div>
  `;
}

function renderAuditInvoiceItems(details = {}) {
  const items = Array.isArray(details.items)
    ? details.items
    : [];

  if (!items.length) {
    return "";
  }

  return `
    <div class="admin-audit-change-section">
      <h4>Item terkait</h4>
      <div class="admin-audit-item-list">
        ${items.map((item) => `
          <div>
            <span>
              ${escapeHtml(item.bikeName || "Sepeda")}
              ${item.bikeColorName
                ? ` · ${escapeHtml(item.bikeColorName)}`
                : ""}
            </span>
            <strong>
              ${Number(item.quantity || 0).toLocaleString("id-ID")} unit
            </strong>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function createAuditExpandedDetails(log) {
  const details = log.details || {};
  const targetId = log.targetId || log.target_id || "-";
  const rows = [
    ["ID Record", targetId],
    details.reason
      ? ["Alasan", details.reason]
      : null,
    details.ipHint
      ? ["Sumber jaringan", details.ipHint]
      : null,
    details.previousStatus || details.serviceStatus
      ? [
          "Status",
          `${details.previousStatus || "-"} → ${
            details.serviceStatus || "-"
          }`
        ]
      : null,
    details.stockRestored === true
      ? ["Dampak stok", "Stok dikembalikan"]
      : null
  ].filter(Boolean);

  return `
    <div class="admin-audit-detail-grid">
      ${rows.map(([label, value]) => `
        <div>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join("")}
    </div>
    ${renderAuditChangedFields(details)}
    ${renderAuditStockChanges(getAuditStockChanges(log))}
    ${renderAuditInvoiceItems(details)}
  `;
}

function renderAuditSummary(summary = {}) {
  const values = {
    auditSummaryToday: summary.activityToday,
    auditSummaryStock: summary.stockChangesToday,
    auditSummaryCritical: summary.criticalToday,
    auditSummaryLogin: summary.failedLoginsToday
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = Number(
        value || 0
      ).toLocaleString("id-ID");
    }
  });
}

function populateAuditSelect(
  id,
  values,
  defaultLabel,
  labelFormatter = (value) => value
) {
  const select = document.getElementById(id);

  if (!select) {
    return;
  }

  const currentValue = select.value || "all";

  select.innerHTML = `
    <option value="all">${escapeHtml(defaultLabel)}</option>
    ${values.map((value) => `
      <option value="${escapeHtml(value)}">
        ${escapeHtml(labelFormatter(value))}
      </option>
    `).join("")}
  `;

  select.value = values.includes(currentValue)
    ? currentValue
    : "all";
}

function getAuditRequestParameters() {
  const getValue = (id, fallback = "") => {
    return document.getElementById(id)?.value || fallback;
  };
  const parameters = new URLSearchParams({
    page: String(adminAuditState.page),
    limit: String(AUDIT_PAGE_SIZE),
    search: getValue("auditSearchInput"),
    module: getValue("auditModuleFilter", "all"),
    action: getValue("auditActionFilter", "all"),
    actor: getValue("auditActorFilter", "all"),
    period: getValue("auditPeriodFilter", "30"),
    severity: getValue("auditSeverityFilter", "all")
  });

  if (parameters.get("period") === "custom") {
    parameters.set(
      "from",
      getValue("auditFromDateInput")
    );
    parameters.set(
      "to",
      getValue("auditToDateInput")
    );
  }

  return parameters;
}

async function fetchAuditLogs() {
  const parameters = getAuditRequestParameters();

  return fetchAdminJson(
    `/api/admin/audit-logs?${parameters.toString()}`,
    { method: "GET" }
  );
}

function renderAuditLogs(logs) {
  const auditList = document.getElementById(
    "adminAuditList"
  );

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

  auditList.innerHTML = logs.map((log) => {
    const action = log.action || "-";
    const actionClass = getAuditActionClass(log);
    const severity = getAuditSeverity(log);
    const moduleInfo = getAuditModule(log);
    const targetLabel = log.targetLabel ||
      log.target_label || "-";
    const username = log.actorUsername ||
      log.username ||
      log.createdByUsername ||
      log.created_by_username ||
      "unknown";
    const role = log.actorRole ||
      log.role ||
      log.createdByRole ||
      log.created_by_role ||
      "unknown";
    const createdAt = log.createdAt ||
      log.created_at || "-";
    const detailsText = createAuditDetailsText(log);

    return `
      <article class="admin-audit-card ${actionClass}">
        <div class="admin-audit-card-main">
          <div class="admin-audit-card-content">
            <div class="admin-audit-badges">
              <span class="admin-audit-module is-${escapeHtml(
                moduleInfo.key
              )}">
                ${escapeHtml(moduleInfo.label)}
              </span>
              <span class="admin-audit-severity is-${severity}">
                ${escapeHtml(
                  getAuditSeverityLabel(severity)
                )}
              </span>
            </div>

            <p class="admin-audit-action">
              ${escapeHtml(formatAuditActionLabel(action))}
            </p>
            <h3>${escapeHtml(targetLabel)}</h3>
            ${detailsText
              ? `<p class="admin-audit-details-text">${escapeHtml(detailsText)}</p>`
              : ""}
          </div>

          <time
            class="admin-audit-time"
            datetime="${escapeHtml(createdAt)}"
          >
            ${escapeHtml(formatAuditDate(createdAt))}
          </time>
        </div>

        <div class="admin-audit-meta">
          <span>Oleh</span>
          <strong class="admin-audit-user">
            ${escapeHtml(username)}
          </strong>
          <span>(${escapeHtml(role)})</span>
        </div>

        <details class="admin-audit-details">
          <summary>Lihat Detail</summary>
          ${createAuditExpandedDetails(log)}
        </details>
      </article>
    `;
  }).join("");
}

function updateAuditResultCount(pagination = {}) {
  const resultCount = document.getElementById(
    "adminAuditResultCount"
  );

  if (!resultCount) {
    return;
  }

  const total = Number(pagination.total || 0);
  const page = Number(pagination.page || 1);
  const limit = Number(
    pagination.limit || AUDIT_PAGE_SIZE
  );

  if (!total) {
    resultCount.textContent = "Tidak ada aktivitas pada filter ini.";
    return;
  }

  const start = (page - 1) * limit + 1;
  const end = Math.min(start + limit - 1, total);

  resultCount.textContent =
    `Menampilkan ${start}–${end} dari ${total} aktivitas.`;
}

function renderAuditPagination(pagination = {}) {
  const container = document.getElementById(
    "adminAuditPagination"
  );

  if (!container) {
    return;
  }

  const page = Number(pagination.page || 1);
  const totalPages = Number(
    pagination.totalPages || 1
  );

  if (totalPages <= 1) {
    container.classList.add("is-hidden");
    container.innerHTML = "";
    return;
  }

  container.classList.remove("is-hidden");
  container.innerHTML = `
    <button
      type="button"
      class="btn-secondary"
      data-audit-page="previous"
      ${page <= 1 ? "disabled" : ""}
    >
      Sebelumnya
    </button>
    <span>Halaman ${page} dari ${totalPages}</span>
    <button
      type="button"
      class="btn-secondary"
      data-audit-page="next"
      ${page >= totalPages ? "disabled" : ""}
    >
      Berikutnya
    </button>
  `;
}

function updateAuditCustomRangeVisibility() {
  const period = document.getElementById(
    "auditPeriodFilter"
  )?.value;
  const range = document.getElementById(
    "auditCustomDateRange"
  );

  range?.classList.toggle(
    "is-hidden",
    period !== "custom"
  );
}

function setDefaultAuditCustomRange() {
  const fromInput = document.getElementById(
    "auditFromDateInput"
  );
  const toInput = document.getElementById(
    "auditToDateInput"
  );
  const jakartaDate = new Date(
    Date.now() + 7 * 60 * 60 * 1000
  ).toISOString().slice(0, 10);

  if (fromInput && !fromInput.value) {
    fromInput.value = jakartaDate;
  }

  if (toInput && !toInput.value) {
    toInput.value = jakartaDate;
  }
}

async function loadAuditLogs(options = {}) {
  const auditList = document.getElementById(
    "adminAuditList"
  );

  if (!isCurrentUserAdmin()) {
    return;
  }

  if (options.resetPage) {
    adminAuditState.page = 1;
  }

  const requestId = ++adminAuditState.requestId;

  if (auditList) {
    auditList.innerHTML = `
      <div class="admin-empty-state">
        Memuat aktivitas...
      </div>
    `;
  }

  try {
    const data = await fetchAuditLogs();

    if (requestId !== adminAuditState.requestId) {
      return;
    }

    adminAuditLogsCache = data.logs || [];
    adminAuditState.page = Number(
      data.pagination?.page || 1
    );
    adminAuditState.total = Number(
      data.pagination?.total || 0
    );
    adminAuditState.totalPages = Number(
      data.pagination?.totalPages || 1
    );

    renderAuditSummary(data.summary || {});
    populateAuditSelect(
      "auditActorFilter",
      data.actors || [],
      "Semua User"
    );
    populateAuditSelect(
      "auditActionFilter",
      data.actions || [],
      "Semua Aksi",
      formatAuditActionLabel
    );
    renderAuditLogs(adminAuditLogsCache);
    updateAuditResultCount(data.pagination || {});
    renderAuditPagination(data.pagination || {});
  } catch (error) {
    if (requestId !== adminAuditState.requestId) {
      return;
    }

    if (handleAdminAuthError(error)) {
      return;
    }

    adminAuditLogsCache = [];

    updateAuditResultCount({ total: 0 });
    renderAuditPagination({ totalPages: 1 });

    if (auditList) {
      auditList.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }
}

function resetAuditFilters() {
  const defaults = {
    auditSearchInput: "",
    auditModuleFilter: "all",
    auditActionFilter: "all",
    auditActorFilter: "all",
    auditPeriodFilter: "30",
    auditSeverityFilter: "all",
    auditFromDateInput: "",
    auditToDateInput: ""
  };

  Object.entries(defaults).forEach(([id, value]) => {
    const input = document.getElementById(id);

    if (input) {
      input.value = value;
    }
  });

  updateAuditCustomRangeVisibility();
  loadAuditLogs({ resetPage: true });
}

function setupAuditLogs() {
  const refreshButton = document.getElementById(
    "refreshAuditLogsBtn"
  );
  const resetButton = document.getElementById(
    "resetAuditFiltersBtn"
  );
  const searchInput = document.getElementById(
    "auditSearchInput"
  );
  const pagination = document.getElementById(
    "adminAuditPagination"
  );
  const filterIds = [
    "auditModuleFilter",
    "auditActionFilter",
    "auditActorFilter",
    "auditSeverityFilter",
    "auditFromDateInput",
    "auditToDateInput"
  ];

  if (
    refreshButton &&
    !refreshButton.dataset.auditRefreshBound
  ) {
    refreshButton.dataset.auditRefreshBound = "true";
    refreshButton.addEventListener(
      "click",
      () => loadAuditLogs()
    );
  }

  if (
    resetButton &&
    !resetButton.dataset.auditResetBound
  ) {
    resetButton.dataset.auditResetBound = "true";
    resetButton.addEventListener(
      "click",
      resetAuditFilters
    );
  }

  if (
    searchInput &&
    !searchInput.dataset.auditSearchBound
  ) {
    searchInput.dataset.auditSearchBound = "true";
    searchInput.addEventListener("input", () => {
      window.clearTimeout(
        adminAuditState.searchTimer
      );
      adminAuditState.searchTimer = window.setTimeout(
        () => loadAuditLogs({ resetPage: true }),
        250
      );
    });
  }

  filterIds.forEach((id) => {
    const input = document.getElementById(id);

    if (!input || input.dataset.auditFilterBound) {
      return;
    }

    input.dataset.auditFilterBound = "true";
    input.addEventListener(
      "change",
      () => loadAuditLogs({ resetPage: true })
    );
  });

  const periodFilter = document.getElementById(
    "auditPeriodFilter"
  );

  if (
    periodFilter &&
    !periodFilter.dataset.auditPeriodBound
  ) {
    periodFilter.dataset.auditPeriodBound = "true";
    periodFilter.addEventListener("change", () => {
      if (periodFilter.value === "custom") {
        setDefaultAuditCustomRange();
      }

      updateAuditCustomRangeVisibility();
      loadAuditLogs({ resetPage: true });
    });
  }

  if (
    pagination &&
    !pagination.dataset.auditPaginationBound
  ) {
    pagination.dataset.auditPaginationBound = "true";
    pagination.addEventListener("click", (event) => {
      const button = event.target.closest(
        "[data-audit-page]"
      );

      if (!button || button.disabled) {
        return;
      }

      adminAuditState.page +=
        button.dataset.auditPage === "next"
          ? 1
          : -1;
      loadAuditLogs();
      document.getElementById(
        "adminAuditResultCount"
      )?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    });
  }

  updateAuditCustomRangeVisibility();
}
