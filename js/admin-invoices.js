/* =========================
   ADMIN INVOICES / SALES
========================= */
let pendingVoidInvoiceId = "";
let adminInvoicesCache = [];
let pendingInvoiceItems = [];
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
function createPendingInvoiceItem() {
  const selectedBike = getSelectedInvoiceBike();
  const selectedColor = getSelectedInvoiceColor();
  const quantityInput = document.getElementById("invoiceQuantityInput");
  const unitPriceInput = document.getElementById("invoiceUnitPriceInput");

  if (!selectedBike) {
    throw new Error("Sepeda wajib dipilih.");
  }

  if (!selectedColor) {
    throw new Error("Warna unit wajib dipilih.");
  }

  const quantity = Number(quantityInput?.value || 1);
  const unitPrice = Number(unitPriceInput?.value || 0);
  const stockQty = Number(selectedColor.stockQty || 0);

  if (quantity < 1) {
    throw new Error("Jumlah minimal 1.");
  }

  if (quantity > stockQty) {
    throw new Error(`Stok warna tidak cukup. Stok tersedia: ${stockQty}.`);
  }

  if (unitPrice < 0) {
    throw new Error("Harga jual tidak boleh negatif.");
  }

  const duplicateItem = pendingInvoiceItems.find((item) => {
    return (
      item.bikeId === selectedBike.id &&
      item.bikeColorName === selectedColor.name
    );
  });

  if (duplicateItem) {
    throw new Error(
      "Item ini sudah ada di invoice. Hapus item lama atau ubah jumlah sebelum menambahkan."
    );
  }

  return {
    id: `pending_${Date.now()}_${crypto.randomUUID()}`,
    bikeId: selectedBike.id,
    bikeBrand: selectedBike.brand,
    bikeName: selectedBike.name,
    bikeColorName: selectedColor.name,
    quantity,
    unitPrice,
    lineTotal: quantity * unitPrice
  };
}

function getPendingInvoiceTotal() {
  return pendingInvoiceItems.reduce((total, item) => {
    return total + Number(item.lineTotal || 0);
  }, 0);
}

function renderPendingInvoiceItems() {
  const list = document.getElementById("pendingInvoiceItemsList");

  if (!list) {
    return;
  }

  if (!pendingInvoiceItems.length) {
    list.innerHTML = `
      <div class="admin-empty-state">
        Belum ada item invoice. Klik Tambah Item untuk mulai.
      </div>
    `;
    return;
  }

  list.innerHTML = pendingInvoiceItems
    .map((item) => `
      <article class="pending-invoice-item">
        <div>
          <strong>
            ${escapeHtml(item.bikeBrand)} ${escapeHtml(item.bikeName)}
          </strong>
          <span>
            Warna ${escapeHtml(item.bikeColorName)} ·
            ${Number(item.quantity)} unit × ${formatRupiah(item.unitPrice)}
          </span>
        </div>

        <div>
          <strong>${formatRupiah(item.lineTotal)}</strong>

          <button
            type="button"
            class="admin-action-btn admin-action-btn-danger"
            data-remove-pending-invoice-item="${escapeHtml(item.id)}"
          >
            Hapus
          </button>
        </div>
      </article>
    `)
    .join("");
}

function resetPendingInvoiceItems() {
  pendingInvoiceItems = [];
  renderPendingInvoiceItems();
  updateInvoicePreview();
}
function resetInvoiceItemModalForm() {
  const bikeInput = document.getElementById("invoiceBikeInput");
  const colorInput = document.getElementById("invoiceBikeColorInput");
  const quantityInput = document.getElementById("invoiceQuantityInput");
  const unitPriceInput = document.getElementById("invoiceUnitPriceInput");

  if (bikeInput) {
    bikeInput.value = "";
  }

  if (colorInput) {
    colorInput.innerHTML = `<option value="">Pilih sepeda terlebih dahulu</option>`;
    colorInput.value = "";
  }

  if (quantityInput) {
    quantityInput.value = "1";
  }

  if (unitPriceInput) {
    unitPriceInput.value = "";
  }

  updateInvoiceColorStockNote();
  updateInvoiceQuantityLimit();
}

function openInvoiceItemModal() {
  const modal = document.getElementById("invoiceItemModal");

  if (!modal) {
    return;
  }

  resetInvoiceItemModalForm();
  populateInvoiceBikeOptions();

  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeInvoiceItemModal() {
  const modal = document.getElementById("invoiceItemModal");

  if (!modal) {
    return;
  }

  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
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
  const preview = document.getElementById("adminInvoicePreview");
  const total = getPendingInvoiceTotal();

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
    customerName: document.getElementById("invoiceCustomerNameInput")?.value.trim() || "",
    customerPhone: document.getElementById("invoiceCustomerPhoneInput")?.value.trim() || "",
    customerAddress: document.getElementById("invoiceCustomerAddressInput")?.value.trim() || "",

    paymentMethod: document.getElementById("invoicePaymentMethodInput")?.value || "",
    notes: document.getElementById("invoiceNotesInput")?.value.trim() || "",

    items: pendingInvoiceItems.map((item) => ({
      bikeId: item.bikeId,
      bikeColorName: item.bikeColorName,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    }))
  };
}
function validateInvoiceFormData(invoice) {
  const errors = [];

  if (!invoice.customerName) {
    errors.push("Nama customer wajib diisi.");
  }

  if (!Array.isArray(invoice.items) || !invoice.items.length) {
    errors.push("Tambahkan minimal 1 item ke invoice terlebih dahulu.");
  }

  invoice.items?.forEach((item, index) => {
    const itemNumber = index + 1;

    if (!item.bikeId) {
      errors.push(`Item ${itemNumber}: sepeda wajib dipilih.`);
    }

    if (!item.bikeColorName) {
      errors.push(`Item ${itemNumber}: warna wajib dipilih.`);
    }

    if (Number(item.quantity || 0) < 1) {
      errors.push(`Item ${itemNumber}: jumlah minimal 1.`);
    }

    if (Number(item.unitPrice || 0) < 0) {
      errors.push(`Item ${itemNumber}: harga tidak boleh negatif.`);
    }
  });

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
      const itemSummary = getInvoiceCardItemSummary(invoice);
const totalQuantity = getInvoiceTotalQuantity(invoice);

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
${escapeHtml(itemSummary)}

            <span>
              <strong>Jumlah:</strong>
              ${totalQuantity} unit total
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
  const colorInput = document.getElementById("invoiceBikeColorInput");
  const quantityInput = document.getElementById("invoiceQuantityInput");
  const unitPriceInput = document.getElementById("invoiceUnitPriceInput");

  const openItemModalButton = document.getElementById("openInvoiceItemModalBtn");
  const closeItemModalButton = document.getElementById("closeInvoiceItemModalBtn");
  const cancelItemModalButton = document.getElementById("cancelInvoiceItemModalBtn");
  const itemModalOverlay = document.getElementById("invoiceItemModalOverlay");
  const addItemButton = document.getElementById("addInvoiceItemBtn");
  const pendingItemsList = document.getElementById("pendingInvoiceItemsList");

  const refreshButton = document.getElementById("refreshInvoicesBtn");
  const createButton = document.getElementById("createInvoiceBtn");
  const searchInput = document.getElementById("invoiceSearchInput");
  const paymentFilter = document.getElementById("invoicePaymentFilter");

  if (openItemModalButton && !openItemModalButton.dataset.invoiceItemBound) {
    openItemModalButton.dataset.invoiceItemBound = "true";
    openItemModalButton.addEventListener("click", openInvoiceItemModal);
  }

  if (closeItemModalButton && !closeItemModalButton.dataset.invoiceItemBound) {
    closeItemModalButton.dataset.invoiceItemBound = "true";
    closeItemModalButton.addEventListener("click", closeInvoiceItemModal);
  }

  if (cancelItemModalButton && !cancelItemModalButton.dataset.invoiceItemBound) {
    cancelItemModalButton.dataset.invoiceItemBound = "true";
    cancelItemModalButton.addEventListener("click", closeInvoiceItemModal);
  }

  if (itemModalOverlay && !itemModalOverlay.dataset.invoiceItemBound) {
    itemModalOverlay.dataset.invoiceItemBound = "true";
    itemModalOverlay.addEventListener("click", closeInvoiceItemModal);
  }

  if (bikeInput && !bikeInput.dataset.invoiceItemBound) {
    bikeInput.dataset.invoiceItemBound = "true";

    bikeInput.addEventListener("change", () => {
      const selectedBike = getSelectedInvoiceBike();

      if (selectedBike && unitPriceInput) {
        unitPriceInput.value = Number(selectedBike.price || 0);
      }

      populateInvoiceColorOptions();
      updateInvoiceColorStockNote();
      updateInvoiceQuantityLimit();
    });
  }

  if (colorInput && !colorInput.dataset.invoiceItemBound) {
    colorInput.dataset.invoiceItemBound = "true";

    colorInput.addEventListener("change", () => {
      updateInvoiceColorStockNote();
      updateInvoiceQuantityLimit();
    });
  }

  if (quantityInput && !quantityInput.dataset.invoiceItemBound) {
    quantityInput.dataset.invoiceItemBound = "true";
    quantityInput.addEventListener("input", updateInvoiceQuantityLimit);
  }

  if (addItemButton && !addItemButton.dataset.invoiceItemBound) {
    addItemButton.dataset.invoiceItemBound = "true";

    addItemButton.addEventListener("click", () => {
      try {
        const item = createPendingInvoiceItem();

        pendingInvoiceItems.push(item);
        renderPendingInvoiceItems();
        updateInvoicePreview();
        closeInvoiceItemModal();

        setInvoiceFormNote(
          `${item.bikeBrand} ${item.bikeName} berhasil ditambahkan ke invoice.`,
          "is-success"
        );
      } catch (error) {
        setInvoiceFormNote(error.message, "is-error");
      }
    });
  }

  if (pendingItemsList && !pendingItemsList.dataset.invoiceItemBound) {
    pendingItemsList.dataset.invoiceItemBound = "true";

    pendingItemsList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-pending-invoice-item]");

      if (!removeButton) {
        return;
      }

      const itemId = removeButton.dataset.removePendingInvoiceItem;

      pendingInvoiceItems = pendingInvoiceItems.filter((item) => {
        return item.id !== itemId;
      });

      renderPendingInvoiceItems();
      updateInvoicePreview();
    });
  }

  if (refreshButton && !refreshButton.dataset.invoiceRefreshBound) {
    refreshButton.dataset.invoiceRefreshBound = "true";
    refreshButton.addEventListener("click", loadInvoices);
  }

  if (searchInput && !searchInput.dataset.invoiceFilterBound) {
    searchInput.dataset.invoiceFilterBound = "true";
    searchInput.addEventListener("input", applyInvoiceFilters);
  }

  if (paymentFilter && !paymentFilter.dataset.invoiceFilterBound) {
    paymentFilter.dataset.invoiceFilterBound = "true";
    paymentFilter.addEventListener("change", applyInvoiceFilters);
  }

  if (!form || form.dataset.invoiceSubmitBound) {
    return;
  }

  form.dataset.invoiceSubmitBound = "true";

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
      resetPendingInvoiceItems();
      resetInvoiceItemModalForm();

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
function getInvoiceItems(invoice) {
  const items = Array.isArray(invoice.items) ? invoice.items : [];

  const usableItems = items.filter((item) => {
    return (
      item &&
      (
        item.bikeBrand ||
        item.bikeName ||
        item.bikeColorName ||
        Number(item.quantity || 0) > 0 ||
        Number(item.lineTotal || 0) > 0
      )
    );
  });

  if (usableItems.length) {
    return usableItems.map((item) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unitPrice || 0);
      const lineTotal = Number(item.lineTotal || quantity * unitPrice);

      return {
        bikeBrand: item.bikeBrand || invoice.bikeBrand || "",
        bikeName: item.bikeName || invoice.bikeName || "",
        bikeColorName: item.bikeColorName || invoice.bikeColorName || "",
        quantity,
        unitPrice,
        lineTotal
      };
    });
  }

  const quantity = Number(invoice.quantity || 1);
  const unitPrice = Number(invoice.unitPrice || 0);
  const totalPrice = Number(invoice.totalPrice || quantity * unitPrice);

  return [
    {
      bikeBrand: invoice.bikeBrand || "",
      bikeName: invoice.bikeName || "",
      bikeColorName: invoice.bikeColorName || "",
      quantity,
      unitPrice,
      lineTotal: totalPrice
    }
  ];
}

function getInvoiceItemLabel(item) {
  return `${item.bikeBrand || ""} ${item.bikeName || ""}`.trim() || "-";
}

function getInvoiceSubtotal(invoice) {
  return getInvoiceItems(invoice).reduce((total, item) => {
    const quantity = Number(item.quantity || 1);
    const unitPrice = Number(item.unitPrice || 0);
    const lineTotal = Number(item.lineTotal || quantity * unitPrice);

    return total + lineTotal;
  }, 0);
}

function getInvoiceTotalQuantity(invoice) {
  return getInvoiceItems(invoice).reduce((total, item) => {
    return total + Number(item.quantity || 0);
  }, 0);
}

function getInvoiceCardItemSummary(invoice) {
  const items = getInvoiceItems(invoice);

  if (items.length === 1) {
    const item = items[0];

    return [
      `${item.bikeBrand || ""} ${item.bikeName || ""}`.trim(),
      item.bikeColorName ? `(${item.bikeColorName})` : ""
    ].filter(Boolean).join(" ");
  }

  return `${items.length} item invoice`;
}

function renderPrintableInvoiceItems(invoice) {
  const tableBody = document.getElementById("printInvoiceItems");

  if (!tableBody) {
    return;
  }

  const items = getInvoiceItems(invoice);

  if (!items.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">Data invoice belum tersedia.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = items
    .map((item) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unitPrice || 0);
      const lineTotal = Number(item.lineTotal || quantity * unitPrice);

      return `
        <tr>
          <td>${escapeHtml(getInvoiceItemLabel(item))}</td>
          <td>${escapeHtml(item.bikeColorName || "-")}</td>
          <td class="is-center">${quantity}</td>
          <td class="is-right">${formatRupiah(unitPrice)}</td>
          <td class="is-right">${formatRupiah(lineTotal)}</td>
        </tr>
      `;
    })
    .join("");
}
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

  const items = getInvoiceItems(invoice);
  const subtotal = getInvoiceSubtotal(invoice);
  const totalPrice = Number(invoice.totalPrice || subtotal);
  const totalQuantity = getInvoiceTotalQuantity(invoice);
  const isVoided = isInvoiceVoided(invoice);
  const printButton = document.getElementById("printInvoiceBtn");

  if (printButton) {
    printButton.classList.toggle("is-hidden", isVoided);
  }

  const firstItem = items[0] || {};
  const itemLabel = items.length === 1
    ? getInvoiceItemLabel(firstItem)
    : `${items.length} item invoice`;

  const itemText = [
    itemLabel,
    firstItem.bikeColorName && items.length === 1
      ? `Warna ${firstItem.bikeColorName}`
      : ""
  ].filter(Boolean).join(" - ");

  const notesText = isVoided
    ? `DIBATALKAN: ${invoice.voidReason || "Tidak ada alasan."}`
    : invoice.notes || "-";

  // Shared / old IDs
  setPrintText("printInvoiceNumber", invoice.invoiceNumber);
  setPrintText("printInvoiceDate", formatAuditDate(invoice.createdAt));
  setPrintText("printInvoiceCreatedBy", invoice.createdByUsername || "-");
  setPrintText("printInvoicePayment", invoice.paymentMethod || "-");

  setPrintText("printCustomerName", invoice.customerName);
  setPrintText("printCustomerPhone", invoice.customerPhone || "-");
  setPrintText("printCustomerAddress", invoice.customerAddress || "-");

  setPrintText("printInvoiceItem", itemText || "-");
  setPrintText("printInvoiceQuantity", `${totalQuantity || 0} unit`);
  setPrintText(
    "printInvoiceUnitPrice",
    items.length === 1
      ? formatRupiah(Number(firstItem.unitPrice || 0))
      : "-"
  );
  setPrintText("printInvoiceLineTotal", formatRupiah(totalPrice));
  setPrintText("printInvoiceTotal", formatRupiah(totalPrice));
  setPrintText("printInvoiceNotes", notesText);

  setPrintText("printInvoiceCustomerSignature", invoice.customerName || "-");
  setPrintText("printInvoiceStaffSignature", invoice.createdByUsername || "-");

  // Newer template IDs, if they exist
  setPrintText("printInvoiceCustomerName", invoice.customerName);
  setPrintText("printInvoiceCustomerPhone", invoice.customerPhone || "-");
  setPrintText("printInvoiceCustomerAddress", invoice.customerAddress || "-");

  setPrintText("printInvoicePaymentMethod", invoice.paymentMethod || "-");
  setPrintText("printInvoicePaymentStatus", isVoided ? "Dibatalkan" : "Lunas");
  setPrintText("printInvoiceSubtotal", formatRupiah(subtotal));
  setPrintText("printInvoiceGrandTotal", formatRupiah(totalPrice));

  renderPrintableInvoiceItems(invoice);

  const notesSection = document.getElementById("printInvoiceNotesSection");

  if (notesSection) {
    notesSection.classList.toggle("is-hidden", !notesText || notesText === "-");
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