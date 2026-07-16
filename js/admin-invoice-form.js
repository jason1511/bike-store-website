/* =========================
   ADMIN INVOICE FORM
========================= */
let pendingVoidInvoiceId = "";
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
function setupInvoiceForm() {
  const form = document.getElementById("adminInvoiceForm");
  const refreshInvoiceAnalyticsButton = document.getElementById("refreshInvoiceAnalyticsBtn");
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
  if (refreshInvoiceAnalyticsButton && !refreshInvoiceAnalyticsButton.dataset.invoiceAnalyticsBound) {
  refreshInvoiceAnalyticsButton.dataset.invoiceAnalyticsBound = "true";
  refreshInvoiceAnalyticsButton.addEventListener("click", loadInvoiceAnalytics);
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