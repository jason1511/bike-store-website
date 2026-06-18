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

async function fetchServices() {
  const token = getStoredAdminToken();
  const statusFilter = document.getElementById("serviceStatusFilter")?.value || "all";

  const response = await fetch(
    `/api/admin/services?limit=50&status=${encodeURIComponent(statusFilter)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal memuat service.");
  }

  return data.services || [];
}

async function saveService(service) {
  const token = getStoredAdminToken();
  const isEditing = Boolean(service.id);

  const response = await fetch("/api/admin/services", {
    method: isEditing ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(service)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const apiErrors = Array.isArray(data?.errors)
      ? ` ${data.errors.join(" ")}`
      : "";

    throw new Error((data?.error || "Gagal menyimpan service.") + apiErrors);
  }

  return data.service;
}

function renderServices(services) {
  const list = document.getElementById("adminServiceList");

  if (!list) {
    return;
  }

  adminServicesCache = services;

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
    renderServices(services);
  } catch (error) {
    if (list) {
      list.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }
}

function loadServicePage() {
  loadServices();
}

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
  const statusFilter = document.getElementById("serviceStatusFilter");
  const serviceList = document.getElementById("adminServiceList");

  if (resetButton) {
    resetButton.addEventListener("click", resetServiceForm);
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", loadServices);
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", loadServices);
  }

  if (serviceList) {
    serviceList.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-edit-service]");

      if (!editButton) {
        return;
      }

      const service = adminServicesCache.find(
        (item) => item.id === editButton.dataset.editService
      );

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