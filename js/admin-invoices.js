/* =========================
   ADMIN INVOICES / SALES
========================= */
let pendingVoidInvoiceId = "";
let adminInvoicesCache = [];
function getBikeColorsForInvoice(bike) {
  return getBikeColors(bike);
}

function getSelectedInvoiceColor() {
  const colorInput = document.getElementById("invoiceBikeColorInput");
  const selectedBike = getSelectedInvoiceBike();
  const selectedColorName = colorInput?.value || "";

  if (!selectedBike || !selectedColorName) {
    return null;
  }

  return getBikeColorsForInvoice(selectedBike).find((color) => {
    return color.name === selectedColorName;
  }) || null;
}

function updateInvoiceColorStockNote() {
  const note = document.getElementById("invoiceColorStockNote");
  const selectedBike = getSelectedInvoiceBike();
  const selectedColor = getSelectedInvoiceColor();

  if (!note) {
    return;
  }

  note.classList.remove("is-error", "is-success");

  if (!selectedBike) {
    note.textContent = "Pilih sepeda terlebih dahulu untuk melihat stok warna.";
    return;
  }

  if (!selectedColor) {
    note.textContent = "Pilih warna unit untuk melihat stok warna.";
    return;
  }

  const stockQty = Number(selectedColor.stockQty || 0);

  note.textContent = `Stok warna ${selectedColor.name}: ${stockQty} unit.`;
  note.classList.add(stockQty > 0 ? "is-success" : "is-error");
}

function updateInvoiceQuantityLimit() {
  const quantityInput = document.getElementById("invoiceQuantityInput");
  const selectedColor = getSelectedInvoiceColor();

  if (!quantityInput) {
    return;
  }

  const stockQty = Number(selectedColor?.stockQty || 0);

  if (stockQty > 0) {
    quantityInput.max = String(stockQty);

    if (Number(quantityInput.value || 1) > stockQty) {
      quantityInput.value = String(stockQty);
    }

    if (Number(quantityInput.value || 0) < 1) {
      quantityInput.value = "1";
    }

    return;
  }

  quantityInput.max = "1";
  quantityInput.value = "1";
}

function populateInvoiceColorOptions() {
  const colorInput = document.getElementById("invoiceBikeColorInput");
  const selectedBike = getSelectedInvoiceBike();

  if (!colorInput) {
    return;
  }

  const currentValue = colorInput.value;
  const colors = getBikeColorsForInvoice(selectedBike);

  if (!selectedBike) {
    colorInput.innerHTML = `<option value="">Pilih sepeda terlebih dahulu</option>`;
    colorInput.value = "";
    updateInvoiceColorStockNote();
    updateInvoiceQuantityLimit();
    return;
  }

  if (!colors.length) {
    colorInput.innerHTML = `<option value="">Tidak ada warna tersedia</option>`;
    colorInput.value = "";
    updateInvoiceColorStockNote();
    updateInvoiceQuantityLimit();
    return;
  }

  colorInput.innerHTML = `
    <option value="">Pilih warna</option>
    ${colors
      .map((color) => {
        const stockQty = Number(color.stockQty || 0);
        const stockText = stockQty > 0 ? `Stok ${stockQty}` : "Stok habis";

        return `
          <option
            value="${escapeHtml(color.name)}"
            data-stock="${stockQty}"
            ${stockQty <= 0 ? "disabled" : ""}
          >
            ${escapeHtml(color.name)} — ${stockText}
          </option>
        `;
      })
      .join("")}
  `;

  const selectedStillAvailable = colors.some((color) => {
    return color.name === currentValue && Number(color.stockQty || 0) > 0;
  });

  if (selectedStillAvailable) {
    colorInput.value = currentValue;
  }

  updateInvoiceColorStockNote();
  updateInvoiceQuantityLimit();
}
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
  populateInvoiceColorOptions();
}

function updateInvoicePreview() {
  const quantityInput = document.getElementById("invoiceQuantityInput");
  const unitPriceInput = document.getElementById("invoiceUnitPriceInput");
  const preview = document.getElementById("adminInvoicePreview");
  const selectedBike = getSelectedInvoiceBike();
  const selectedColor = getSelectedInvoiceColor();

  if (selectedBike && unitPriceInput && !unitPriceInput.value) {
    unitPriceInput.value = Number(selectedBike.price || 0);
  }
updateInvoiceQuantityLimit();
updateInvoiceColorStockNote();
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
  populateInvoiceColorOptions();

  updateInvoicePreview();
}

function getInvoiceFormData() {
  return {
    bikeId: document.getElementById("invoiceBikeInput")?.value || "",
bikeColorName: document.getElementById("invoiceBikeColorInput")?.value || "",
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
  const selectedColor = getSelectedInvoiceColor();
const stockQty = Number(selectedColor?.stockQty || 0);

  if (!invoice.bikeId) {
    errors.push("Sepeda wajib dipilih.");
  }
  if (!invoice.bikeColorName) {
  errors.push("Warna unit wajib dipilih.");
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

 if (selectedBike && selectedColor && stockQty < invoice.quantity) {
  errors.push(`Stok warna tidak cukup. Stok tersedia: ${stockQty}.`);
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
  const data = await fetchAdminJson("/api/admin/invoices?limit=50", {
    method: "GET"
  });

  return data.invoices || [];
}

async function createInvoice(invoice) {
  try {
    const data = await fetchAdminJson("/api/admin/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(invoice)
    });

    return data.invoice;
  } catch (error) {
    throw new Error(error.message || "Gagal membuat invoice.");
  }
}
async function voidInvoice(invoiceId, reason) {
  const data = await fetchAdminJson("/api/admin/invoices", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: invoiceId,
      reason
    })
  });

  return data.invoice;
}

function isInvoiceVoided(invoice) {
  return invoice?.status === "voided";
}

function getInvoiceStatusLabel(invoice) {
  return isInvoiceVoided(invoice) ? "Dibatalkan" : "Aktif";
}

function getInvoiceStatusClass(invoice) {
  return isInvoiceVoided(invoice) ? "is-voided" : "is-active";
}
function getFilteredInvoices() {
  const searchInput = document.getElementById("invoiceSearchInput");
  const paymentFilter = document.getElementById("invoicePaymentFilter");

  const searchTerm = normalizeSearchText(searchInput?.value || "");
  const paymentValue = paymentFilter?.value ?? "all";

  return adminInvoicesCache.filter((invoice) => {
    if (paymentValue !== "all") {
      const invoicePayment = invoice.paymentMethod || "";

      if (invoicePayment !== paymentValue) {
        return false;
      }
    }

    if (!searchTerm) {
      return true;
    }

    const searchableText = normalizeSearchText([
      invoice.invoiceNumber,
      invoice.customerName,
      invoice.customerPhone,
      invoice.customerAddress,
      invoice.bikeBrand,
      invoice.bikeName,
      invoice.bikeColorName,
      invoice.paymentMethod,
      invoice.createdByUsername,
      invoice.createdByRole,
      invoice.notes
    ].join(" "));

    return searchableText.includes(searchTerm);
  });
}

function updateInvoiceResultCount(filteredCount, totalCount) {
  const resultCount = document.getElementById("adminInvoiceResultCount");

  if (!resultCount) {
    return;
  }

  if (!totalCount) {
    resultCount.textContent = "Belum ada invoice.";
    return;
  }

  if (filteredCount === totalCount) {
    resultCount.textContent = `Menampilkan semua ${totalCount} invoice.`;
    return;
  }

  resultCount.textContent = `Menampilkan ${filteredCount} dari ${totalCount} invoice.`;
}

function applyInvoiceFilters() {
  const filteredInvoices = getFilteredInvoices();

  renderInvoices(filteredInvoices);
  updateInvoiceResultCount(filteredInvoices.length, adminInvoicesCache.length);
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
    .map((invoice) => {
      const voided = isInvoiceVoided(invoice);

      return `
        <article class="admin-invoice-card ${voided ? "is-voided" : ""}">
          <div class="admin-invoice-card-main">
            <div>
              <p class="admin-invoice-number">
                ${escapeHtml(invoice.invoiceNumber)}
              </p>

              <h3>
                ${escapeHtml(invoice.customerName)}
              </h3>
            </div>

            <div class="admin-invoice-card-side">
              <span class="invoice-status-badge ${getInvoiceStatusClass(invoice)}">
                ${escapeHtml(getInvoiceStatusLabel(invoice))}
              </span>

              <strong class="admin-invoice-total">
                ${formatRupiah(invoice.totalPrice)}
              </strong>
            </div>
          </div>

          <div class="admin-invoice-meta">
            <strong>Sepeda:</strong>
            ${escapeHtml(invoice.bikeBrand)} ${escapeHtml(invoice.bikeName)}
            ${invoice.bikeColorName ? ` (${escapeHtml(invoice.bikeColorName)})` : ""}

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

          ${
            voided
              ? `
                <div class="invoice-void-note">
                  <strong>Invoice dibatalkan</strong>
                  <span>${escapeHtml(invoice.voidReason || "Tidak ada alasan.")}</span>
                  ${
                    invoice.voidedByUsername
                      ? `<small>Dibatalkan oleh ${escapeHtml(invoice.voidedByUsername)} pada ${escapeHtml(formatAuditDate(invoice.voidedAt))}</small>`
                      : ""
                  }
                </div>
              `
              : ""
          }

          <div class="admin-card-actions">
            <button
  type="button"
  class="admin-action-btn"
  data-open-invoice="${escapeHtml(invoice.id)}"
>
  ${voided ? "Lihat" : "Lihat / Print"}
</button>

            ${
              voided
                ? ""
                : `
                  <button
                    type="button"
                    class="admin-action-btn admin-action-btn-danger"
                    data-void-invoice="${escapeHtml(invoice.id)}"
                  >
                    Batalkan
                  </button>
                `
            }
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadInvoices() {
  const list = document.getElementById("adminInvoiceList");

  try {
    adminInvoicesCache = await fetchInvoices();
    applyInvoiceFilters();
  } catch (error) {
    if (handleAdminAuthError(error)) {
      return;
    }

    adminInvoicesCache = [];

    if (list) {
      list.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(error.message || "Gagal memuat invoice.")}
        </div>
      `;
    }

    updateInvoiceResultCount(0, 0);
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
const searchInput = document.getElementById("invoiceSearchInput");
const paymentFilter = document.getElementById("invoicePaymentFilter");
const colorInput = document.getElementById("invoiceBikeColorInput");
  if (bikeInput) {
    bikeInput.addEventListener("change", () => {
      const selectedBike = getSelectedInvoiceBike();

      if (selectedBike && unitPriceInput) {
        unitPriceInput.value = Number(selectedBike.price || 0);
      }
populateInvoiceColorOptions();
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
if (searchInput) {
  searchInput.addEventListener("input", applyInvoiceFilters);
}
if (colorInput) {
  colorInput.addEventListener("change", updateInvoicePreview);
}
if (paymentFilter) {
  paymentFilter.addEventListener("change", applyInvoiceFilters);
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
  if (handleAdminAuthError(error)) {
    return;
  }

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
  return adminInvoicesCache.find((invoice) => invoice.id === invoiceId) || null;
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
const printButton = document.getElementById("printInvoiceBtn");

if (printButton) {
  printButton.classList.toggle("is-hidden", isInvoiceVoided(invoice));
}
  const itemName = [
  `${invoice.bikeBrand || ""} ${invoice.bikeName || ""}`.trim(),
  invoice.bikeColorName ? `Warna ${invoice.bikeColorName}` : ""
].filter(Boolean).join(" - ");
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

  setPrintText(
  "printInvoiceNotes",
  isInvoiceVoided(invoice)
    ? `DIBATALKAN: ${invoice.voidReason || "Tidak ada alasan."}`
    : invoice.notes || "-"
);
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
  document.body.classList.add("is-printing-invoice");
  window.print();
}
function openVoidInvoiceModal(invoice) {
  const modal = document.getElementById("voidInvoiceModal");
  const title = document.getElementById("voidInvoiceModalTitle");
  const reasonInput = document.getElementById("voidInvoiceReasonInput");

  if (!modal || !invoice) {
    return;
  }

  pendingVoidInvoiceId = invoice.id;

  if (title) {
    title.textContent = `Batalkan ${invoice.invoiceNumber}`;
  }

  if (reasonInput) {
    reasonInput.value = "Salah input";
    reasonInput.focus();
  }

  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeVoidInvoiceModal() {
  const modal = document.getElementById("voidInvoiceModal");
  const reasonInput = document.getElementById("voidInvoiceReasonInput");

  pendingVoidInvoiceId = "";

  if (reasonInput) {
    reasonInput.value = "";
  }

  if (!modal) {
    return;
  }

  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
}

async function submitVoidInvoice() {
  const reasonInput = document.getElementById("voidInvoiceReasonInput");
  const submitButton = document.getElementById("confirmVoidInvoiceBtn");

  const invoice = getInvoiceByIdFromCache(pendingVoidInvoiceId);

  if (!invoice) {
    window.alert("Data invoice tidak ditemukan. Coba refresh invoice.");
    closeVoidInvoiceModal();
    return;
  }

  const reason = reasonInput?.value.trim() || "Dibatalkan oleh admin";

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Membatalkan...";
  }

  try {
    await voidInvoice(invoice.id, reason);

    closeVoidInvoiceModal();

    setInvoiceFormNote(
      `Invoice ${invoice.invoiceNumber} berhasil dibatalkan dan stok dikembalikan.`,
      "is-success"
    );

    if (typeof loadAdminBikes === "function") {
      await loadAdminBikes();
    }

    populateInvoiceBikeOptions();
    await loadInvoices();

    if (
      typeof isCurrentUserAdmin === "function" &&
      isCurrentUserAdmin() &&
      typeof loadAuditLogs === "function"
    ) {
      loadAuditLogs();
    }
  } catch (error) {
    if (handleAdminAuthError(error)) {
      return;
    }

    setInvoiceFormNote(error.message || "Gagal membatalkan invoice.", "is-error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Batalkan Invoice";
    }
  }
}
async function handleInvoiceListClick(event) {
  const openButton = event.target.closest("[data-open-invoice]");

  if (openButton) {
    const invoice = getInvoiceByIdFromCache(openButton.dataset.openInvoice);

    if (!invoice) {
      setInvoiceFormNote("Data invoice tidak ditemukan. Coba refresh invoice.", "is-error");
      return;
    }

    openInvoiceModal(invoice);
    return;
  }

  const voidButton = event.target.closest("[data-void-invoice]");

  if (!voidButton) {
    return;
  }

  const invoice = getInvoiceByIdFromCache(voidButton.dataset.voidInvoice);

  if (!invoice) {
    setInvoiceFormNote("Data invoice tidak ditemukan. Coba refresh invoice.", "is-error");
    return;
  }

  if (isInvoiceVoided(invoice)) {
    setInvoiceFormNote("Invoice ini sudah dibatalkan.", "is-error");
    return;
  }

  openVoidInvoiceModal(invoice);
}

function setupInvoiceModal() {
  const closeButton = document.getElementById("closeInvoiceModalBtn");
  const overlay = document.getElementById("adminInvoiceModalOverlay");
  const printButton = document.getElementById("printInvoiceBtn");
  const invoiceList = document.getElementById("adminInvoiceList");
const voidModalClose = document.getElementById("closeVoidInvoiceModalBtn");
const voidModalCancel = document.getElementById("cancelVoidInvoiceBtn");
const voidModalConfirm = document.getElementById("confirmVoidInvoiceBtn");
const voidModalOverlay = document.getElementById("voidInvoiceModalOverlay");

if (voidModalClose && !voidModalClose.dataset.voidModalBound) {
  voidModalClose.dataset.voidModalBound = "true";
  voidModalClose.addEventListener("click", closeVoidInvoiceModal);
}

if (voidModalCancel && !voidModalCancel.dataset.voidModalBound) {
  voidModalCancel.dataset.voidModalBound = "true";
  voidModalCancel.addEventListener("click", closeVoidInvoiceModal);
}

if (voidModalOverlay && !voidModalOverlay.dataset.voidModalBound) {
  voidModalOverlay.dataset.voidModalBound = "true";
  voidModalOverlay.addEventListener("click", closeVoidInvoiceModal);
}

if (voidModalConfirm && !voidModalConfirm.dataset.voidModalBound) {
  voidModalConfirm.dataset.voidModalBound = "true";
  voidModalConfirm.addEventListener("click", submitVoidInvoice);
}
  if (closeButton && !closeButton.dataset.invoiceModalBound) {
    closeButton.dataset.invoiceModalBound = "true";
    closeButton.addEventListener("click", closeInvoiceModal);
  }

  if (overlay && !overlay.dataset.invoiceModalBound) {
    overlay.dataset.invoiceModalBound = "true";
    overlay.addEventListener("click", closeInvoiceModal);
  }

  if (printButton && !printButton.dataset.invoiceModalBound) {
    printButton.dataset.invoiceModalBound = "true";
    printButton.addEventListener("click", printCurrentInvoice);
  }

  if (!document.body.dataset.invoiceActionsBound) {
  document.body.dataset.invoiceActionsBound = "true";

  document.addEventListener("click", async (event) => {
    const isInvoiceAction =
      event.target.closest("[data-open-invoice]") ||
      event.target.closest("[data-void-invoice]");

    if (!isInvoiceAction) {
      return;
    }

    await handleInvoiceListClick(event);
  });
}

  if (!document.body.dataset.invoiceAfterprintBound) {
    document.body.dataset.invoiceAfterprintBound = "true";

    window.addEventListener("afterprint", () => {
      document.body.classList.remove("is-printing-invoice");
      document.body.classList.remove("is-printing-service");
    });
  }

  if (!document.body.dataset.invoiceEscapeBound) {
    document.body.dataset.invoiceEscapeBound = "true";

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeInvoiceModal();
      }
    });
  }
}