/* =========================
   ADMIN INVOICES / SALES
========================= */
function getSelectedInvoiceBike() {
  const select = document.getElementById("invoiceBikeInput");
  const bikeId = select?.value || "";

  return adminBikesCache.find((bike) => bike.id === bikeId) || null;
}

function populateInvoiceBikeOptions() {
  const select = document.getElementById("invoiceBikeInput");

  if (!select) {
    return;
  }

  const currentValue = select.value;

  const activeBikes = adminBikesCache
    .filter((bike) => Boolean(bike.inStock))
    .sort((a, b) => {
      const brandCompare = String(a.brand || "").localeCompare(String(b.brand || ""));
      return brandCompare || String(a.name || "").localeCompare(String(b.name || ""));
    });

  select.innerHTML = `
    <option value="">Pilih sepeda</option>
    ${activeBikes
      .map((bike) => {
        const stockQty = Number(bike.stockQty || 0);
        const stockText = stockQty > 0 ? `Stok ${stockQty}` : "Stok habis";

        return `
          <option
            value="${escapeHtml(bike.id)}"
            data-price="${Number(bike.price || 0)}"
            data-stock="${stockQty}"
            ${stockQty <= 0 ? "disabled" : ""}
          >
            ${escapeHtml(bike.brand)} ${escapeHtml(bike.name)} — ${stockText}
          </option>
        `;
      })
      .join("")}
  `;

  const selectedStillAvailable = activeBikes.some((bike) => {
    return bike.id === currentValue && Number(bike.stockQty || 0) > 0;
  });

  if (selectedStillAvailable) {
    select.value = currentValue;
  }
}

function updateInvoicePreview() {
  const quantityInput = document.getElementById("invoiceQuantityInput");
  const unitPriceInput = document.getElementById("invoiceUnitPriceInput");
  const preview = document.getElementById("adminInvoicePreview");
  const selectedBike = getSelectedInvoiceBike();

  if (selectedBike && unitPriceInput && !unitPriceInput.value) {
    unitPriceInput.value = Number(selectedBike.price || 0);
  }

  const quantity = Math.max(Number(quantityInput?.value || 1), 1);
  const unitPrice = Number(unitPriceInput?.value || 0);
  const total = quantity * unitPrice;

  if (preview) {
    preview.innerHTML = `
      <strong>Total Invoice</strong>
      <span>${formatRupiah(total)}</span>
    `;
  }
}

function resetInvoiceForm() {
  const form = document.getElementById("adminInvoiceForm");
  const quantityInput = document.getElementById("invoiceQuantityInput");

  if (form) {
    form.reset();
  }

  if (quantityInput) {
    quantityInput.value = "1";
  }

  updateInvoicePreview();
}

function getInvoiceFormData() {
  return {
    bikeId: document.getElementById("invoiceBikeInput")?.value || "",
    quantity: Number(document.getElementById("invoiceQuantityInput")?.value || 1),
    unitPrice: Number(document.getElementById("invoiceUnitPriceInput")?.value || 0),

    customerName: document.getElementById("invoiceCustomerNameInput")?.value.trim() || "",
    customerPhone: document.getElementById("invoiceCustomerPhoneInput")?.value.trim() || "",
    customerAddress: document.getElementById("invoiceCustomerAddressInput")?.value.trim() || "",

    paymentMethod: document.getElementById("invoicePaymentMethodInput")?.value || "",
    notes: document.getElementById("invoiceNotesInput")?.value.trim() || ""
  };
}

function validateInvoiceFormData(invoice) {
  const errors = [];
  const selectedBike = getSelectedInvoiceBike();
  const stockQty = Number(selectedBike?.stockQty || 0);

  if (!invoice.bikeId) {
    errors.push("Sepeda wajib dipilih.");
  }

  if (!invoice.customerName) {
    errors.push("Nama customer wajib diisi.");
  }

  if (invoice.quantity < 1) {
    errors.push("Jumlah minimal 1.");
  }

  if (invoice.unitPrice < 0) {
    errors.push("Harga jual tidak boleh negatif.");
  }

  if (selectedBike && stockQty < invoice.quantity) {
    errors.push(`Stok tidak cukup. Stok tersedia: ${stockQty}.`);
  }

  return errors;
}

function setInvoiceFormNote(message, type = "") {
  const note = document.getElementById("adminInvoiceFormNote");

  if (!note) {
    return;
  }

  note.textContent = message;
  note.classList.remove("is-error", "is-success");

  if (type) {
    note.classList.add(type);
  }
}

async function fetchInvoices() {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/invoices?limit=50", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal memuat invoice.");
  }

  return data.invoices || [];
}

async function createInvoice(invoice) {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(invoice)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const apiErrors = Array.isArray(data?.errors)
      ? ` ${data.errors.join(" ")}`
      : "";

    throw new Error((data?.error || "Gagal membuat invoice.") + apiErrors);
  }

  return data.invoice;
}

function renderInvoices(invoices) {
  const list = document.getElementById("adminInvoiceList");

  if (!list) {
    return;
  }

  window.adminInvoicesCache = invoices;

  if (!invoices.length) {
    list.innerHTML = `
      <div class="admin-empty-state">
        Belum ada invoice.
      </div>
    `;
    return;
  }

  list.innerHTML = invoices
    .map((invoice) => `
      <article class="admin-invoice-card">
        <div class="admin-invoice-card-main">
          <div>
            <p class="admin-invoice-number">
              ${escapeHtml(invoice.invoiceNumber)}
            </p>

            <h3>
              ${escapeHtml(invoice.customerName)}
            </h3>
          </div>

          <strong class="admin-invoice-total">
            ${formatRupiah(invoice.totalPrice)}
          </strong>
        </div>

        <div class="admin-invoice-meta">
          <span>
            <strong>Sepeda:</strong>
            ${escapeHtml(invoice.bikeBrand)} ${escapeHtml(invoice.bikeName)}
          </span>

          <span>
            <strong>Jumlah:</strong>
            ${Number(invoice.quantity || 1)} unit × ${formatRupiah(invoice.unitPrice)}
          </span>

          <span>
            <strong>Pembayaran:</strong>
            ${escapeHtml(invoice.paymentMethod || "-")}
          </span>

          <span>
            <strong>Dibuat oleh:</strong>
            ${escapeHtml(invoice.createdByUsername || "-")} (${escapeHtml(invoice.createdByRole || "-")})
          </span>

          <span>
            <strong>Tanggal:</strong>
            ${escapeHtml(formatAuditDate(invoice.createdAt))}
          </span>
        </div>

        <div class="admin-card-actions">
          <button
            type="button"
            class="admin-action-btn"
            data-open-invoice="${escapeHtml(invoice.id)}"
          >
            Lihat / Print
          </button>
        </div>
      </article>
    `)
    .join("");
}

async function loadInvoices() {
  const list = document.getElementById("adminInvoiceList");

  if (list) {
    list.innerHTML = `
      <div class="admin-empty-state">
        Memuat invoice...
      </div>
    `;
  }

  try {
    const invoices = await fetchInvoices();
    renderInvoices(invoices);
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

async function loadInvoicePage() {
  if (typeof loadAdminBikes === "function") {
    await loadAdminBikes();
  }

  populateInvoiceBikeOptions();
  updateInvoicePreview();
  loadInvoices();
}

function setupInvoiceForm() {
  const form = document.getElementById("adminInvoiceForm");
  const bikeInput = document.getElementById("invoiceBikeInput");
  const quantityInput = document.getElementById("invoiceQuantityInput");
  const unitPriceInput = document.getElementById("invoiceUnitPriceInput");
  const refreshButton = document.getElementById("refreshInvoicesBtn");
  const createButton = document.getElementById("createInvoiceBtn");

  if (bikeInput) {
    bikeInput.addEventListener("change", () => {
      const selectedBike = getSelectedInvoiceBike();

      if (selectedBike && unitPriceInput) {
        unitPriceInput.value = Number(selectedBike.price || 0);
      }

      updateInvoicePreview();
    });
  }

  if (quantityInput) {
    quantityInput.addEventListener("input", updateInvoicePreview);
  }

  if (unitPriceInput) {
    unitPriceInput.addEventListener("input", updateInvoicePreview);
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", loadInvoices);
  }

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const invoice = getInvoiceFormData();
    const errors = validateInvoiceFormData(invoice);

    if (errors.length) {
      setInvoiceFormNote(errors.join(" "), "is-error");
      return;
    }

    if (createButton) {
      createButton.disabled = true;
      createButton.textContent = "Membuat...";
    }

    setInvoiceFormNote("Membuat invoice dan mengurangi stok...");

    try {
      await createInvoice(invoice);

      setInvoiceFormNote("Invoice berhasil dibuat dan stok sudah dikurangi.", "is-success");
      resetInvoiceForm();

      if (typeof loadAdminBikes === "function") {
        await loadAdminBikes();
      }

      populateInvoiceBikeOptions();
      await loadInvoices();

      if (isCurrentUserAdmin() && typeof loadAuditLogs === "function") {
        loadAuditLogs();
      }
    } catch (error) {
      setInvoiceFormNote(error.message, "is-error");
    } finally {
      if (createButton) {
        createButton.disabled = false;
        createButton.textContent = "Buat Invoice";
      }
    }
  });
}

/* =========================
   PRINTABLE INVOICE MODAL
========================= */
function getInvoiceByIdFromCache(invoiceId) {
  return window.adminInvoicesCache?.find((invoice) => invoice.id === invoiceId) || null;
}

function setPrintText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value || "-";
  }
}

function openInvoiceModal(invoice) {
  const modal = document.getElementById("adminInvoiceModal");

  if (!modal || !invoice) {
    return;
  }

  const itemName = `${invoice.bikeBrand || ""} ${invoice.bikeName || ""}`.trim();
  const quantity = Number(invoice.quantity || 1);
  const unitPrice = Number(invoice.unitPrice || 0);
  const totalPrice = Number(invoice.totalPrice || 0);

  setPrintText("printInvoiceNumber", invoice.invoiceNumber);
  setPrintText("printInvoiceDate", formatAuditDate(invoice.createdAt));
  setPrintText("printInvoiceCreatedBy", invoice.createdByUsername || "-");
  setPrintText("printInvoicePayment", invoice.paymentMethod || "-");

  setPrintText("printCustomerName", invoice.customerName);
  setPrintText("printCustomerPhone", invoice.customerPhone || "-");
  setPrintText("printCustomerAddress", invoice.customerAddress || "-");

  setPrintText("printInvoiceItem", itemName);
  setPrintText("printInvoiceQuantity", `${quantity} unit`);
  setPrintText("printInvoiceUnitPrice", formatRupiah(unitPrice));
  setPrintText("printInvoiceLineTotal", formatRupiah(totalPrice));
  setPrintText("printInvoiceTotal", formatRupiah(totalPrice));

  setPrintText("printInvoiceNotes", invoice.notes || "-");
  setPrintText("printInvoiceCustomerSignature", invoice.customerName || "-");
  setPrintText("printInvoiceStaffSignature", invoice.createdByUsername || "-");

  const notesSection = document.getElementById("printInvoiceNotesSection");

  if (notesSection) {
    notesSection.classList.toggle("is-hidden", !invoice.notes);
  }

  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeInvoiceModal() {
  const modal = document.getElementById("adminInvoiceModal");

  if (!modal) {
    return;
  }

  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
}

function printCurrentInvoice() {
  window.print();
}

function setupInvoiceModal() {
  const closeButton = document.getElementById("closeInvoiceModalBtn");
  const overlay = document.getElementById("adminInvoiceModalOverlay");
  const printButton = document.getElementById("printInvoiceBtn");
  const invoiceList = document.getElementById("adminInvoiceList");

  if (closeButton) {
    closeButton.addEventListener("click", closeInvoiceModal);
  }

  if (overlay) {
    overlay.addEventListener("click", closeInvoiceModal);
  }

  if (printButton) {
    printButton.addEventListener("click", printCurrentInvoice);
  }

  if (invoiceList) {
    invoiceList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-open-invoice]");

      if (!button) {
        return;
      }

      const invoice = getInvoiceByIdFromCache(button.dataset.openInvoice);

      if (!invoice) {
        window.alert("Data invoice tidak ditemukan. Coba refresh invoice.");
        return;
      }

      openInvoiceModal(invoice);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInvoiceModal();
    }
  });
}