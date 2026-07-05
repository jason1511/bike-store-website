/* =========================
   ADMIN INVOICES / SALES
========================= */

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
  document.body.classList.add("is-printing-invoice");
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
  window.addEventListener("afterprint", () => {
  document.body.classList.remove("is-printing-invoice");
  document.body.classList.remove("is-printing-service");
});
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInvoiceModal();
    }
  });
}