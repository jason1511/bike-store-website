/* =========================
   ADMIN SERVICES
========================= */
function getServiceStatusLabel(status) {
  const labels = {
    received: "Diterima",
    in_progress: "Dikerjakan",
    completed: "Selesai",
    cancelled: "Dibatalkan"
  };

  return labels[status] || status || "-";
}

function getServiceStatusClass(status) {
  const classes = {
    received: "is-received",
    in_progress: "is-in-progress",
    completed: "is-completed",
    cancelled: "is-cancelled"
  };

  return classes[status] || "is-received";
}

function setServiceFormNote(message, type = "") {
  const note = document.getElementById("adminServiceFormNote");

  if (!note) {
    return;
  }

  note.textContent = message;
  note.classList.remove("is-error", "is-success");

  if (type) {
    note.classList.add(type);
  }
}

function resetServiceForm() {
  const form = document.getElementById("adminServiceForm");
  const saveButton = document.getElementById("saveServiceBtn");
  const serviceIdInput = document.getElementById("serviceIdInput");
  const statusInput = document.getElementById("serviceStatusInput");

  if (form) {
    form.reset();
  }

  if (serviceIdInput) {
    serviceIdInput.value = "";
  }

  if (statusInput) {
    statusInput.value = "received";
  }

  if (saveButton) {
    saveButton.textContent = "Simpan Service";
  }

  setServiceFormNote("Service tidak mengurangi stok. Stok sparepart bisa ditambahkan nanti.");
}

function getServiceFormData() {
  return {
    id: document.getElementById("serviceIdInput")?.value.trim() || "",
    customerName: document.getElementById("serviceCustomerNameInput")?.value.trim() || "",
    customerPhone: document.getElementById("serviceCustomerPhoneInput")?.value.trim() || "",
    customerAddress: document.getElementById("serviceCustomerAddressInput")?.value.trim() || "",
    bikeLabel: document.getElementById("serviceBikeLabelInput")?.value.trim() || "",
    serviceType: document.getElementById("serviceTypeInput")?.value || "",
    serviceStatus: document.getElementById("serviceStatusInput")?.value || "received",
    serviceCost: Number(document.getElementById("serviceCostInput")?.value || 0),
    notes: document.getElementById("serviceNotesInput")?.value.trim() || ""
  };
}

function validateServiceFormData(service) {
  const errors = [];

  if (!service.customerName) {
    errors.push("Nama customer wajib diisi.");
  }

  if (!service.bikeLabel) {
    errors.push("Data sepeda/unit wajib diisi.");
  }

  if (!service.serviceType) {
    errors.push("Jenis service wajib dipilih.");
  }

  if (service.serviceCost < 0) {
    errors.push("Biaya service tidak boleh negatif.");
  }

  return errors;
}

/* =========================
   SERVICE API
========================= */
async function fetchServices() {
  const data = await fetchAdminJson("/api/admin/services?limit=100&status=all", {
    method: "GET"
  });

  return data.services || [];
}

async function saveService(service) {
  const isEditing = Boolean(service.id);

  try {
    const data = await fetchAdminJson("/api/admin/services", {
      method: isEditing ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(service)
    });

    return data.service;
  } catch (error) {
    throw new Error(error.message || "Gagal menyimpan service.");
  }
}

/* =========================
   SERVICE FILTERS
========================= */
function getFilteredServices() {
  const searchInput = document.getElementById("serviceSearchInput");
  const statusFilter = document.getElementById("serviceStatusFilter");

  const searchTerm = normalizeSearchText(searchInput?.value || "");
  const statusValue = statusFilter?.value || "all";

  return adminServicesCache.filter((service) => {
    if (statusValue !== "all" && service.serviceStatus !== statusValue) {
      return false;
    }

    if (!searchTerm) {
      return true;
    }

    const searchableText = normalizeSearchText([
      service.serviceNumber,
      service.customerName,
      service.customerPhone,
      service.customerAddress,
      service.bikeLabel,
      service.serviceType,
      getServiceStatusLabel(service.serviceStatus),
      service.createdByUsername,
      service.createdByRole,
      service.notes
    ].join(" "));

    return searchableText.includes(searchTerm);
  });
}

function updateServiceResultCount(filteredCount, totalCount) {
  const resultCount = document.getElementById("adminServiceResultCount");

  if (!resultCount) {
    return;
  }

  if (!totalCount) {
    resultCount.textContent = "Belum ada service.";
    return;
  }

  if (filteredCount === totalCount) {
    resultCount.textContent = `Menampilkan semua ${totalCount} service.`;
    return;
  }

  resultCount.textContent = `Menampilkan ${filteredCount} dari ${totalCount} service.`;
}

function applyServiceFilters() {
  const filteredServices = getFilteredServices();

  renderServices(filteredServices);
  updateServiceResultCount(filteredServices.length, adminServicesCache.length);
}

/* =========================
   SERVICE LIST
========================= */
function renderServices(services) {
  const list = document.getElementById("adminServiceList");

  if (!list) {
    return;
  }

  if (!services.length) {
    list.innerHTML = `
      <div class="admin-empty-state">
        Belum ada service.
      </div>
    `;
    return;
  }

  list.innerHTML = services
    .map((service) => `
      <article class="admin-service-card">
        <div class="admin-service-card-main">
          <div>
            <p class="admin-service-number">
              ${escapeHtml(service.serviceNumber)}
            </p>

            <h3>
              ${escapeHtml(service.customerName)}
            </h3>
          </div>

          <strong class="admin-service-cost">
            ${formatRupiah(service.serviceCost)}
          </strong>
        </div>

        <div class="admin-service-meta">
          <span class="admin-service-status ${getServiceStatusClass(service.serviceStatus)}">
            ${escapeHtml(getServiceStatusLabel(service.serviceStatus))}
          </span>

          <span>
            <strong>Sepeda/unit:</strong>
            ${escapeHtml(service.bikeLabel)}
          </span>

          <span>
            <strong>Jenis service:</strong>
            ${escapeHtml(service.serviceType)}
          </span>

          <span>
            <strong>No. HP:</strong>
            ${escapeHtml(service.customerPhone || "-")}
          </span>

          <span>
            <strong>Dibuat oleh:</strong>
            ${escapeHtml(service.createdByUsername || "-")} (${escapeHtml(service.createdByRole || "-")})
          </span>

          <span>
            <strong>Tanggal masuk:</strong>
            ${escapeHtml(formatAuditDate(service.createdAt))}
          </span>

          ${
            service.completedAt
              ? `
                <span>
                  <strong>Selesai:</strong>
                  ${escapeHtml(formatAuditDate(service.completedAt))}
                </span>
              `
              : ""
          }

          ${
            service.notes
              ? `
                <span>
                  <strong>Catatan:</strong>
                  ${escapeHtml(service.notes)}
                </span>
              `
              : ""
          }
        </div>

        <div class="admin-card-actions">
          <button
            type="button"
            class="admin-action-btn"
            data-open-service="${escapeHtml(service.id)}"
          >
            Lihat / Print
          </button>

          <button
            type="button"
            class="admin-action-btn"
            data-edit-service="${escapeHtml(service.id)}"
          >
            Edit Service
          </button>
        </div>
      </article>
    `)
    .join("");
}

async function loadServices() {
  const list = document.getElementById("adminServiceList");

  if (list) {
    list.innerHTML = `
      <div class="admin-empty-state">
        Memuat service...
      </div>
    `;
  }

  try {
    const services = await fetchServices();

    adminServicesCache = services;
    applyServiceFilters();
  } catch (error) {
  if (handleAdminAuthError(error)) {
    return;
  }

  adminServicesCache = [];

  if (list) {
    list.innerHTML = `
      <div class="admin-empty-state is-error">
        ${escapeHtml(error.message)}
      </div>
    `;
  }

  updateServiceResultCount(0, 0);
}
}

function loadServicePage() {
  loadServices();
}

/* =========================
   SERVICE FORM
========================= */
function fillServiceForm(service) {
  const setValue = (id, value) => {
    const input = document.getElementById(id);

    if (input) {
      input.value = value ?? "";
    }
  };

  setValue("serviceIdInput", service.id);
  setValue("serviceCustomerNameInput", service.customerName);
  setValue("serviceCustomerPhoneInput", service.customerPhone);
  setValue("serviceCustomerAddressInput", service.customerAddress);
  setValue("serviceBikeLabelInput", service.bikeLabel);
  setValue("serviceTypeInput", service.serviceType);
  setValue("serviceStatusInput", service.serviceStatus);
  setValue("serviceCostInput", service.serviceCost);
  setValue("serviceNotesInput", service.notes);

  const saveButton = document.getElementById("saveServiceBtn");

  if (saveButton) {
    saveButton.textContent = "Update Service";
  }

  setServiceFormNote(`Mengedit ${service.serviceNumber}.`, "is-success");
}

function setupServiceForm() {
  const form = document.getElementById("adminServiceForm");
  const saveButton = document.getElementById("saveServiceBtn");
  const resetButton = document.getElementById("resetServiceFormBtn");
  const refreshButton = document.getElementById("refreshServicesBtn");
  const searchInput = document.getElementById("serviceSearchInput");
  const statusFilter = document.getElementById("serviceStatusFilter");
  const serviceList = document.getElementById("adminServiceList");

  if (resetButton) {
    resetButton.addEventListener("click", resetServiceForm);
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", loadServices);
  }

  if (searchInput) {
    searchInput.addEventListener("input", applyServiceFilters);
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", applyServiceFilters);
  }

  if (serviceList) {
    serviceList.addEventListener("click", (event) => {
      const openButton = event.target.closest("[data-open-service]");

      if (openButton) {
        const service = getServiceByIdFromCache(openButton.dataset.openService);

        if (!service) {
          window.alert("Data service tidak ditemukan. Coba refresh service.");
          return;
        }

        openServiceModal(service);
        return;
      }

      const editButton = event.target.closest("[data-edit-service]");

      if (!editButton) {
        return;
      }

      const service = getServiceByIdFromCache(editButton.dataset.editService);

      if (!service) {
        window.alert("Data service tidak ditemukan. Coba refresh service.");
        return;
      }

      fillServiceForm(service);
    });
  }

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const service = getServiceFormData();
    const errors = validateServiceFormData(service);

    if (errors.length) {
      setServiceFormNote(errors.join(" "), "is-error");
      return;
    }

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = service.id ? "Mengupdate..." : "Menyimpan...";
    }

    setServiceFormNote("Menyimpan data service...");

    try {
      await saveService(service);

      setServiceFormNote(
        service.id ? "Service berhasil diupdate." : "Service berhasil disimpan.",
        "is-success"
      );

      resetServiceForm();
      await loadServices();

      if (isCurrentUserAdmin() && typeof loadAuditLogs === "function") {
        loadAuditLogs();
      }
    } catch (error) {
  if (handleAdminAuthError(error)) {
    return;
  }

  setServiceFormNote(error.message, "is-error");
} finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = document.getElementById("serviceIdInput")?.value
          ? "Update Service"
          : "Simpan Service";
      }
    }
  });
}

/* =========================
   PRINTABLE SERVICE MODAL
========================= */
function getServiceByIdFromCache(serviceId) {
  return adminServicesCache.find((service) => service.id === serviceId) || null;
}

function setServicePrintText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value || "-";
  }
}

function openServiceModal(service) {
  const modal = document.getElementById("adminServiceModal");

  if (!modal || !service) {
    return;
  }

  setServicePrintText("printServiceNumber", service.serviceNumber);
  setServicePrintText("printServiceDate", formatAuditDate(service.createdAt));
  setServicePrintText("printServiceCreatedBy", service.createdByUsername || "-");
  setServicePrintText("printServiceStatus", getServiceStatusLabel(service.serviceStatus));

  setServicePrintText("printServiceCustomerName", service.customerName);
  setServicePrintText("printServiceCustomerPhone", service.customerPhone || "-");
  setServicePrintText("printServiceCustomerAddress", service.customerAddress || "-");

  setServicePrintText("printServiceBikeLabel", service.bikeLabel);
  setServicePrintText("printServiceType", service.serviceType);
  setServicePrintText("printServiceStatusTable", getServiceStatusLabel(service.serviceStatus));
  setServicePrintText("printServiceCostTable", formatRupiah(service.serviceCost));
  setServicePrintText("printServiceCost", formatRupiah(service.serviceCost));

  setServicePrintText("printServiceNotes", service.notes || "-");
  setServicePrintText("printServiceCustomerSignature", service.customerName || "-");
  setServicePrintText("printServiceStaffSignature", service.createdByUsername || "-");

  const notesSection = document.getElementById("printServiceNotesSection");

  if (notesSection) {
    notesSection.classList.toggle("is-hidden", !service.notes);
  }

  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeServiceModal() {
  const modal = document.getElementById("adminServiceModal");

  if (!modal) {
    return;
  }

  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
}

function printCurrentService() {
  const service =
    document.querySelector(
      "#adminServiceModal .printable-service"
    );

  if (!service) {
    return;
  }

  const printWindow =
    window.open("", "_blank");

  if (!printWindow) {
    window.alert(
      "Browser memblokir halaman cetak. Izinkan pop-up lalu coba lagi."
    );
    return;
  }

  const baseUrl =
    `${window.location.origin}/`;

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        >
        <base href="${baseUrl}">
        <title>Cetak Service</title>

        <link
          rel="stylesheet"
          href="css/global.css"
        >
        <link
          rel="stylesheet"
          href="css/admin-print-service.css"
        >

        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html,
          body {
            width: 100%;
            margin: 0;
            padding: 0;
            background: #ffffff;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .printable-service {
            box-sizing: border-box;
            width: 190mm;
            max-width: 190mm;
            margin: 0 auto;
            padding: 0;
            border-radius: 0;
            box-shadow: none;
          }

          @media screen {
            body {
              padding: 16px 0;
            }
          }

          @media print {
            html,
            body {
              width: auto !important;
              min-height: 0 !important;
            }

            .printable-service {
              display: block !important;
              width: 190mm !important;
              max-width: 190mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
            }

            .printable-service-header {
              gap: 16px !important;
              padding-bottom: 10px !important;
              break-inside: avoid;
            }

            .printable-service-brand {
              gap: 10px !important;
            }

            .printable-service-brand img {
              width: 46px !important;
              height: 46px !important;
              border-radius: 8px !important;
            }

            .printable-service-brand h1 {
              margin-bottom: 2px !important;
              font-size: 1rem !important;
            }

            .printable-service-brand p {
              margin: 1px 0 !important;
              font-size: 0.72rem !important;
            }

            .printable-service-title p {
              margin-bottom: 4px !important;
              font-size: 0.68rem !important;
            }

            .printable-service-title h2 {
              font-size: 1.05rem !important;
            }

            .printable-service-meta,
            .printable-service-customer {
              gap: 8px !important;
              break-inside: avoid;
            }

            .printable-service-meta {
              margin-top: 10px !important;
            }

            .printable-service-meta > div,
            .printable-service-customer > div {
              padding: 8px 10px !important;
              border-radius: 9px !important;
            }

            .printable-service-meta span,
            .printable-service-customer span {
              font-size: 0.62rem !important;
            }

            .printable-service-meta strong,
            .printable-service-customer strong {
              font-size: 0.72rem !important;
            }

            .printable-service-section {
              margin-top: 12px !important;
              break-inside: avoid;
            }

            .printable-service-section h3 {
              margin-bottom: 7px !important;
              font-size: 0.82rem !important;
            }

            .printable-service-table-wrap {
              overflow: visible !important;
            }

            .printable-service-table th,
            .printable-service-table td {
              padding: 7px 8px !important;
              font-size: 0.68rem !important;
            }

            .printable-service-total-box {
              width: min(260px, 100%) !important;
              margin-top: 10px !important;
              padding: 11px 14px !important;
              border-radius: 11px !important;
              break-inside: avoid;
            }

            .printable-service-total-box span {
              font-size: 0.62rem !important;
            }

            .printable-service-total-box strong {
              font-size: 1.15rem !important;
            }

            #printServiceNotes {
              padding: 8px 10px !important;
              border-radius: 9px !important;
              font-size: 0.72rem !important;
            }

            .printable-service-footer {
              gap: 24px !important;
              margin-top: 22px !important;
              break-inside: avoid;
            }

            .printable-service-footer p,
            .printable-service-footer strong {
              font-size: 0.72rem !important;
            }

            .printable-service-footer span {
              height: 34px !important;
            }
          }
        </style>
      </head>

      <body class="standalone-service-print">
        ${service.outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();

  printWindow.addEventListener(
    "load",
    () => {
      window.setTimeout(
        () => {
          printWindow.focus();
          printWindow.print();
        },
        500
      );
    },
    { once: true }
  );
}

function setupServiceModal() {
  const closeButton = document.getElementById("closeServiceModalBtn");
  const overlay = document.getElementById("adminServiceModalOverlay");
  const printButton = document.getElementById("printServiceBtn");

  if (closeButton) {
    closeButton.addEventListener("click", closeServiceModal);
  }

  if (overlay) {
    overlay.addEventListener("click", closeServiceModal);
  }

  if (printButton) {
    printButton.addEventListener("click", printCurrentService);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeServiceModal();
    }
  });
}