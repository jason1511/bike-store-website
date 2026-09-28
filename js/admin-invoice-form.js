/* =========================
   ADMIN INVOICE FORM
========================= */
let pendingVoidInvoiceId = "";
let pendingInvoiceItems = [];
let pendingReviewedInvoice = null;

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
  const frameNumbersInput = document.getElementById("invoiceFrameNumbersInput");

  if (!selectedBike) {
    throw new Error("Sepeda wajib dipilih.");
  }

  if (!selectedColor) {
    throw new Error("Warna unit wajib dipilih.");
  }

  const quantity = Number(quantityInput?.value || 1);
  const unitPrice = Number(unitPriceInput?.value || 0);
  const stockQty = Number(selectedColor.stockQty || 0);
  const frameNumbers =
    normalizeInvoiceFrameNumbers(
      frameNumbersInput?.value || ""
    );

  if (quantity < 1) {
    throw new Error("Jumlah minimal 1.");
  }

  if (quantity > stockQty) {
    throw new Error(`Stok warna tidak cukup. Stok tersedia: ${stockQty}.`);
  }

  if (unitPrice < 0) {
    throw new Error("Harga jual tidak boleh negatif.");
  }

  if (
    frameNumbers.length > 0 &&
    frameNumbers.length !== quantity
  ) {
    throw new Error(
      `Isi ${quantity} nomor rangka, satu untuk setiap unit.`
    );
  }

  if (
    new Set(
      frameNumbers.map((value) =>
        value.toLocaleLowerCase("id-ID")
      )
    ).size !== frameNumbers.length
  ) {
    throw new Error(
      "Nomor rangka tidak boleh sama."
    );
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
    frameNumbers,
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
          <span>
            Nomor rangka:
            ${escapeHtml(
              getInvoiceFrameNumbersLabel(
                item.frameNumbers
              )
            )}
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
  const frameNumbersInput = document.getElementById("invoiceFrameNumbersInput");

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

  if (frameNumbersInput) {
    frameNumbersInput.value = "";
  }

  updateInvoiceColorStockNote();
  updateInvoiceQuantityLimit();
  updateInvoiceItemSubtotal();
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

function updateInvoiceItemSubtotal() {
  const quantityInput = document.getElementById("invoiceQuantityInput");
  const unitPriceInput = document.getElementById("invoiceUnitPriceInput");
  const subtotalOutput = document.getElementById("invoiceItemSubtotalOutput");

  if (!subtotalOutput) {
    return;
  }

  const quantity = Math.max(0, Number(quantityInput?.value || 0));
  const unitPrice = Math.max(0, Number(unitPriceInput?.value || 0));
  const subtotal = quantity * unitPrice;

  subtotalOutput.textContent = formatRupiah(
    Number.isFinite(subtotal) ? subtotal : 0
  );
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

function updateInvoicePaymentBankVisibility() {
  const methodInput = document.getElementById("invoicePaymentMethodInput");
  const bankGroup = document.getElementById("invoicePaymentBankGroup");
  const bankInput = document.getElementById("invoicePaymentBankInput");
  const isBankTransfer = methodInput?.value === "Bank Transfer";

  bankGroup?.classList.toggle("is-hidden", !isBankTransfer);

  if (bankInput) {
    bankInput.required = isBankTransfer;

    if (!isBankTransfer) {
      bankInput.value = "";
    }
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
  updateInvoicePaymentBankVisibility();

  updateInvoicePreview();
}
function getInvoiceFormData() {
  return {
    invoiceType: document.querySelector(
      'input[name="invoiceType"]:checked'
    )?.value === "grosir" ? "grosir" : "normal",
    customerName: document.getElementById("invoiceCustomerNameInput")?.value.trim() || "",
    customerPhone: document.getElementById("invoiceCustomerPhoneInput")?.value.trim() || "",
    customerAddress: document.getElementById("invoiceCustomerAddressInput")?.value.trim() || "",

    paymentMethod: document.getElementById("invoicePaymentMethodInput")?.value || "",
    paymentBank: document.getElementById("invoicePaymentBankInput")?.value || "",
    notes: document.getElementById("invoiceNotesInput")?.value.trim() || "",

    items: pendingInvoiceItems.map((item) => ({
      bikeId: item.bikeId,
      bikeColorName: item.bikeColorName,
      frameNumbers:
        normalizeInvoiceFrameNumbers(
          item.frameNumbers
        ),
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

  if (invoice.paymentMethod === "Bank Transfer" && !invoice.paymentBank) {
    errors.push("Bank tujuan wajib dipilih untuk pembayaran bank transfer.");
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

    if (
      item.frameNumbers.length > 0 &&
      item.frameNumbers.length !==
      Number(item.quantity || 0)
    ) {
      errors.push(
        `Item ${itemNumber}: jumlah nomor rangka harus sama dengan jumlah unit.`
      );
    }
  });

  return errors;
}

function closeReviewInvoiceModal() {
  const modal = document.getElementById("reviewInvoiceModal");

  modal?.classList.add("is-hidden");
  modal?.setAttribute("aria-hidden", "true");
}

function renderInvoiceReview(invoice) {
  const content = document.getElementById("reviewInvoiceContent");

  if (!content) {
    return;
  }

  const reviewItems = pendingInvoiceItems.map((item) => `
    <tr>
      <td>
        <strong>${escapeHtml(item.bikeBrand)} ${escapeHtml(item.bikeName)}</strong>
        <small>Warna ${escapeHtml(item.bikeColorName)}</small>
      </td>
      <td>${Number(item.quantity).toLocaleString("id-ID")}</td>
      <td>${escapeHtml(getInvoiceFrameNumbersLabel(item.frameNumbers))}</td>
      <td class="is-right">${formatRupiah(item.unitPrice)}</td>
      <td class="is-right"><strong>${formatRupiah(item.lineTotal)}</strong></td>
    </tr>
  `).join("");

  const paymentLabel = invoice.paymentMethod === "Bank Transfer" && invoice.paymentBank
    ? `${invoice.paymentMethod} — ${invoice.paymentBank}`
    : invoice.paymentMethod;

  content.innerHTML = `
    <div class="invoice-review-mode ${invoice.invoiceType === "grosir" ? "is-grosir" : ""}">
      ${invoice.invoiceType === "grosir" ? "Penjualan Grosir" : "Penjualan Biasa"}
    </div>
    <div class="invoice-review-facts">
      <div><span>Customer</span><strong>${escapeHtml(invoice.customerName)}</strong></div>
      <div><span>WhatsApp</span><strong>${escapeHtml(invoice.customerPhone || "-")}</strong></div>
      <div><span>Pembayaran</span><strong>${escapeHtml(paymentLabel || "-")}</strong></div>
      <div class="is-wide"><span>Alamat</span><strong>${escapeHtml(invoice.customerAddress || "-")}</strong></div>
    </div>
    <div class="invoice-review-table-wrap">
      <table class="invoice-review-table">
        <thead>
          <tr>
            <th>Sepeda</th>
            <th>Jumlah</th>
            <th>Nomor Rangka</th>
            <th class="is-right">Harga</th>
            <th class="is-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>${reviewItems}</tbody>
      </table>
    </div>
    ${invoice.notes ? `
      <div class="invoice-review-notes">
        <span>Catatan</span>
        <p>${escapeHtml(invoice.notes)}</p>
      </div>
    ` : ""}
    <div class="invoice-review-total">
      <span>Total Invoice</span>
      <strong>${formatRupiah(getPendingInvoiceTotal())}</strong>
    </div>
  `;
}

function openReviewInvoiceModal(invoice) {
  const modal = document.getElementById("reviewInvoiceModal");

  if (!modal) {
    return;
  }

  pendingReviewedInvoice = invoice;
  renderInvoiceReview(invoice);
  setInvoiceFormNote("Invoice siap ditinjau. Stok belum dikurangi.");

  const note = document.getElementById("reviewInvoiceNote");
  if (note) {
    note.textContent = "Invoice belum dibuat dan stok belum berubah.";
    note.classList.remove("is-error", "is-success");
  }

  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
}

async function confirmReviewedInvoice() {
  const confirmButton = document.getElementById("confirmCreateInvoiceBtn");
  const note = document.getElementById("reviewInvoiceNote");

  if (!pendingReviewedInvoice || confirmButton?.disabled) {
    return;
  }

  if (confirmButton) {
    confirmButton.disabled = true;
    confirmButton.textContent = "Membuat Invoice...";
  }

  if (note) {
    note.textContent = "Memeriksa stok terbaru dan membuat invoice...";
    note.classList.remove("is-error", "is-success");
  }

  try {
    const createdInvoice = await createInvoice(pendingReviewedInvoice);

    closeReviewInvoiceModal();
    pendingReviewedInvoice = null;
    resetInvoiceForm();
    resetPendingInvoiceItems();
    resetInvoiceItemModalForm();

    if (typeof loadAdminBikes === "function") {
      await loadAdminBikes();
    }

    populateInvoiceBikeOptions();
    await loadInvoices({ resetPage: true });

    if (typeof isCurrentUserAdmin === "function" && isCurrentUserAdmin() && typeof loadAuditLogs === "function") {
      loadAuditLogs();
    }

    setInvoiceFormNote(
      `Invoice ${createdInvoice.invoiceNumber} berhasil dibuat dan stok sudah dikurangi.`,
      "is-success"
    );

    if (typeof openInvoiceModal === "function") {
      openInvoiceModal(createdInvoice, { newlyCreated: true });
    }
  } catch (error) {
    if (handleAdminAuthError(error)) {
      return;
    }

    if (note) {
      note.textContent = error.message;
      note.classList.add("is-error");
    }
  } finally {
    if (confirmButton) {
      confirmButton.disabled = false;
      confirmButton.textContent = "Konfirmasi & Buat Invoice";
    }
  }
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

  const reviewModalOverlay = document.getElementById("reviewInvoiceModalOverlay");
  const closeReviewButton = document.getElementById("closeReviewInvoiceModalBtn");
  const backToEditButton = document.getElementById("backToEditInvoiceBtn");
  const confirmCreateButton = document.getElementById("confirmCreateInvoiceBtn");
  const paymentMethodInput = document.getElementById("invoicePaymentMethodInput");

  if (openItemModalButton && !openItemModalButton.dataset.invoiceItemBound) {
    openItemModalButton.dataset.invoiceItemBound = "true";
    openItemModalButton.addEventListener("click", openInvoiceItemModal);
  }

  [reviewModalOverlay, closeReviewButton, backToEditButton].forEach((element) => {
    if (element && !element.dataset.invoiceReviewBound) {
      element.dataset.invoiceReviewBound = "true";
      element.addEventListener("click", closeReviewInvoiceModal);
    }
  });

  if (confirmCreateButton && !confirmCreateButton.dataset.invoiceReviewBound) {
    confirmCreateButton.dataset.invoiceReviewBound = "true";
    confirmCreateButton.addEventListener("click", confirmReviewedInvoice);
  }

  if (paymentMethodInput && !paymentMethodInput.dataset.paymentBankBound) {
    paymentMethodInput.dataset.paymentBankBound = "true";
    paymentMethodInput.addEventListener("change", updateInvoicePaymentBankVisibility);
    updateInvoicePaymentBankVisibility();
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

      if (unitPriceInput) {
        unitPriceInput.value = selectedBike
          ? Number(selectedBike.price || 0)
          : "";
      }

      populateInvoiceColorOptions();
      updateInvoiceColorStockNote();
      updateInvoiceQuantityLimit();
      updateInvoiceItemSubtotal();
    });
  }

  if (colorInput && !colorInput.dataset.invoiceItemBound) {
    colorInput.dataset.invoiceItemBound = "true";

    colorInput.addEventListener("change", () => {
      updateInvoiceColorStockNote();
      updateInvoiceQuantityLimit();
      updateInvoiceItemSubtotal();
    });
  }

  if (quantityInput && !quantityInput.dataset.invoiceItemBound) {
    quantityInput.dataset.invoiceItemBound = "true";
    quantityInput.addEventListener("change", updateInvoiceQuantityLimit);
    quantityInput.addEventListener("input", updateInvoiceItemSubtotal);
    quantityInput.addEventListener("change", updateInvoiceItemSubtotal);
  }

  if (unitPriceInput && !unitPriceInput.dataset.invoiceSubtotalBound) {
    unitPriceInput.dataset.invoiceSubtotalBound = "true";
    unitPriceInput.addEventListener("input", updateInvoiceItemSubtotal);
    unitPriceInput.addEventListener("change", updateInvoiceItemSubtotal);
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

    openReviewInvoiceModal(invoice);
  });
}
