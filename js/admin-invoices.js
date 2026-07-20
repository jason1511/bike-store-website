/* =========================
   ADMIN INVOICES / SALES
========================= */
let adminInvoicesCache = [];
let canMaintainInvoices = false;
let pendingDeleteInvoiceId = "";
let pendingEditInvoiceId = "";
let editingInvoiceItemIndex = -1;
let pendingEditInvoiceItems = [];

async function fetchInvoices() {
  const data = await fetchAdminJson(
    "/api/admin/invoices?limit=50",
    {
      method: "GET"
    }
  );

  canMaintainInvoices =
    data.permissions
      ?.canMaintainInvoices === true;

  return data.invoices || [];
}
async function updateInvoice(
  invoice
) {
  const data =
    await fetchAdminJson(
      "/api/admin/invoices",
      {
        method: "PUT",
        headers: {
          "Content-Type":
            "application/json"
        },
        body:
          JSON.stringify(invoice)
      }
    );

  return data.invoice;
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

function getInvoicePaymentLabel(invoice) {
  const method = invoice?.paymentMethod || "-";

  if (method === "Bank Transfer" && invoice?.paymentBank) {
    return `${method} — ${invoice.paymentBank}`;
  }

  return method;
}
function getFilteredInvoices() {
  const searchInput = document.getElementById("invoiceSearchInput");
  const paymentFilter = document.getElementById("invoicePaymentFilter");

  const searchTerm = normalizeSearchText(searchInput?.value || "");
  const paymentValue = paymentFilter?.value ?? "all";

  return adminInvoicesCache.filter((invoice) => {
    if (paymentValue !== "all") {
      const invoicePayment = invoice.paymentMethod || "";

      const matchesLegacyTransfer =
        paymentValue === "Bank Transfer" && invoicePayment === "Transfer";

      if (invoicePayment !== paymentValue && !matchesLegacyTransfer) {
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
      invoice.paymentBank,
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
              ${escapeHtml(getInvoicePaymentLabel(invoice))}
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
  canMaintainInvoices
    ? `
        <button
          type="button"
          class="admin-action-btn"
          data-edit-invoice="${escapeHtml(
            invoice.id
          )}"
        >
          Edit
        </button>
      `
    : ""
}
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
            ${
  canMaintainInvoices
    ? `
        <button
          type="button"
          class="admin-action-btn admin-action-btn-danger"
          data-delete-invoice="${escapeHtml(
            invoice.id
          )}"
        >
          Hapus
        </button>
      `
    : ""
}
          </div>
        </article>
      `;
    })
    .join("");
}
async function deleteLegacyInvoice(
  invoiceId,
  reason
) {
  return fetchAdminJson(
    "/api/admin/invoices",
    {
      method: "DELETE",
      headers: {
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify({
        id: invoiceId,
        reason
      })
    }
  );
}

function getPendingDeleteInvoice() {
  return adminInvoicesCache.find(
    (invoice) =>
      invoice.id ===
      pendingDeleteInvoiceId
  ) || null;
}

function updateDeleteInvoiceConfirmation() {
  const reasonInput =
    document.getElementById(
      "deleteInvoiceReasonInput"
    );

  const confirmInput =
    document.getElementById(
      "deleteInvoiceConfirmInput"
    );

  const confirmButton =
    document.getElementById(
      "confirmDeleteInvoiceBtn"
    );

  if (!confirmButton) {
    return;
  }

  const hasValidReason =
    String(reasonInput?.value || "")
      .trim()
      .length >= 5;

  const hasConfirmation =
    String(confirmInput?.value || "")
      .trim()
      .toUpperCase() === "HAPUS";

  confirmButton.disabled =
    !hasValidReason ||
    !hasConfirmation;
}

function openDeleteInvoiceModal(
  invoiceId
) {
  const invoice =
    adminInvoicesCache.find(
      (entry) => entry.id === invoiceId
    );

  const modal =
    document.getElementById(
      "deleteInvoiceModal"
    );

  if (
    !invoice ||
    !modal ||
    !canMaintainInvoices
  ) {
    return;
  }

  pendingDeleteInvoiceId =
    invoice.id;

  const number =
    document.getElementById(
      "deleteInvoiceNumber"
    );

  const reasonInput =
    document.getElementById(
      "deleteInvoiceReasonInput"
    );

  const confirmInput =
    document.getElementById(
      "deleteInvoiceConfirmInput"
    );

  const note =
    document.getElementById(
      "deleteInvoiceNote"
    );

  if (number) {
    number.textContent =
      invoice.invoiceNumber || "-";
  }

  if (reasonInput) {
    reasonInput.value = "";
  }

  if (confirmInput) {
    confirmInput.value = "";
  }

  if (note) {
    note.textContent =
      "Penghapusan hanya tersedia untuk invoice legacy tanpa transaksi nyata.";

    note.classList.remove(
      "is-error"
    );
  }

  updateDeleteInvoiceConfirmation();

  modal.classList.remove("is-hidden");

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  reasonInput?.focus();
}

function closeDeleteInvoiceModal() {
  const modal =
    document.getElementById(
      "deleteInvoiceModal"
    );

  modal?.classList.add("is-hidden");

  modal?.setAttribute(
    "aria-hidden",
    "true"
  );

  pendingDeleteInvoiceId = "";
}

async function confirmDeleteLegacyInvoice() {
  const invoice =
    getPendingDeleteInvoice();

  const reasonInput =
    document.getElementById(
      "deleteInvoiceReasonInput"
    );

  const confirmButton =
    document.getElementById(
      "confirmDeleteInvoiceBtn"
    );

  const note =
    document.getElementById(
      "deleteInvoiceNote"
    );

  const reason =
    String(reasonInput?.value || "")
      .trim();

  if (
    !invoice ||
    !canMaintainInvoices
  ) {
    return;
  }

  if (reason.length < 5) {
    if (note) {
      note.textContent =
        "Alasan penghapusan minimal 5 karakter.";

      note.classList.add("is-error");
    }

    return;
  }

  if (confirmButton) {
    confirmButton.disabled = true;
    confirmButton.textContent =
      "Menghapus...";
  }

  try {
    await deleteLegacyInvoice(
      invoice.id,
      reason
    );

    closeDeleteInvoiceModal();
    await loadInvoices();
  } catch (error) {
    if (handleAdminAuthError(error)) {
      return;
    }

    if (note) {
      note.textContent =
        error.message ||
        "Gagal menghapus invoice.";

      note.classList.add("is-error");
    }
  } finally {
    if (confirmButton) {
      confirmButton.textContent =
        "Hapus Permanen";
    }

    updateDeleteInvoiceConfirmation();
  }
}
function getPendingEditInvoice() {
  return adminInvoicesCache.find(
    (invoice) =>
      invoice.id ===
      pendingEditInvoiceId
  ) || null;
}

function updateEditInvoicePaymentBank() {
  const methodInput =
    document.getElementById(
      "editInvoicePaymentMethodInput"
    );

  const bankGroup =
    document.getElementById(
      "editInvoicePaymentBankGroup"
    );

  const bankInput =
    document.getElementById(
      "editInvoicePaymentBankInput"
    );

  const isTransfer =
    methodInput?.value ===
    "Bank Transfer";

  bankGroup?.classList.toggle(
    "is-hidden",
    !isTransfer
  );

  if (
    !isTransfer &&
    bankInput
  ) {
    bankInput.value = "";
  }
}

function getPendingEditInvoiceTotal() {
  return pendingEditInvoiceItems.reduce(
    (total, item) => {
      return (
        total +
        Number(item.quantity || 0) *
        Number(item.unitPrice || 0)
      );
    },
    0
  );
}

function renderPendingEditInvoiceItems() {
  const list =
    document.getElementById(
      "editInvoiceItemsList"
    );

  const total =
    document.getElementById(
      "editInvoiceTotal"
    );

  if (total) {
    total.textContent =
      formatRupiah(
        getPendingEditInvoiceTotal()
      );
  }

  if (!list) {
    return;
  }

  if (
    !pendingEditInvoiceItems.length
  ) {
    list.innerHTML = `
      <div class="admin-empty-state">
        Invoice ini belum memiliki item.
        Ini mungkin merupakan data legacy.
      </div>
    `;

    return;
  }

  list.innerHTML =
    pendingEditInvoiceItems
      .map((item, index) => {
        const lineTotal =
          Number(item.quantity || 0) *
          Number(item.unitPrice || 0);

        return `
          <article
            class="pending-invoice-item"
          >
            <div>
              <strong>
                ${escapeHtml(
                  `${item.bikeBrand || ""} ${item.bikeName || ""}`.trim() ||
                  "Sepeda"
                )}
              </strong>

              <span>
                ${escapeHtml(
                  item.bikeColorName || "-"
                )}
                ·
                ${Number(
                  item.quantity || 0
                )}
                unit
                ·
                ${escapeHtml(
                  formatRupiah(
                    Number(
                      item.unitPrice || 0
                    )
                  )
                )}
              </span>
            </div>

            <strong>
              ${escapeHtml(
                formatRupiah(lineTotal)
              )}
            </strong>

            <div
              class="admin-card-actions"
            >
              <button
                type="button"
                class="admin-action-btn"
                data-edit-invoice-item="${index}"
              >
                Edit Item
              </button>

              <button
                type="button"
                class="admin-action-btn admin-action-btn-danger"
                data-remove-edit-invoice-item="${index}"
              >
                Hapus Item
              </button>
            </div>
          </article>
        `;
      })
      .join("");
}

function openEditInvoiceModal(
  invoiceId
) {
  const invoice =
    adminInvoicesCache.find(
      (entry) =>
        entry.id === invoiceId
    );

  const modal =
    document.getElementById(
      "editInvoiceModal"
    );

  if (
    !invoice ||
    !modal ||
    !canMaintainInvoices
  ) {
    return;
  }

  pendingEditInvoiceId =
    invoice.id;

  editingInvoiceItemIndex = -1;

  pendingEditInvoiceItems =
    Array.isArray(invoice.items)
      ? invoice.items.map(
          (item) => ({ ...item })
        )
      : [];

  document.getElementById(
    "editInvoiceNumber"
  ).textContent =
    invoice.invoiceNumber || "-";

  document.getElementById(
    "editInvoiceCustomerNameInput"
  ).value =
    invoice.customerName || "";

  document.getElementById(
    "editInvoiceCustomerPhoneInput"
  ).value =
    invoice.customerPhone || "";

  document.getElementById(
    "editInvoiceCustomerAddressInput"
  ).value =
    invoice.customerAddress || "";

  document.getElementById(
    "editInvoicePaymentMethodInput"
  ).value =
    invoice.paymentMethod ===
      "Transfer"
      ? "Bank Transfer"
      : invoice.paymentMethod ||
        "Cash";

  document.getElementById(
    "editInvoicePaymentBankInput"
  ).value =
    invoice.paymentBank || "";

  document.getElementById(
    "editInvoiceNotesInput"
  ).value =
    invoice.notes || "";

  document.getElementById(
    "editInvoiceReasonInput"
  ).value = "";

  const note =
    document.getElementById(
      "editInvoiceNote"
    );

  if (note) {
    note.textContent =
      "Semua perubahan akan dicatat dalam audit log.";

    note.classList.remove(
      "is-error"
    );
  }

  updateEditInvoicePaymentBank();
  renderPendingEditInvoiceItems();

  modal.classList.remove(
    "is-hidden"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.getElementById(
    "editInvoiceCustomerNameInput"
  )?.focus();
}

function closeEditInvoiceModal() {
  const modal =
    document.getElementById(
      "editInvoiceModal"
    );

  modal?.classList.add(
    "is-hidden"
  );

  modal?.setAttribute(
    "aria-hidden",
    "true"
  );

  pendingEditInvoiceId = "";
  editingInvoiceItemIndex = -1;
  pendingEditInvoiceItems = [];
}
async function loadInvoices() {
  const list = document.getElementById("adminInvoiceList");

  try {
    adminInvoicesCache = await fetchInvoices();
    applyInvoiceFilters();
    await loadInvoiceAnalytics();
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
function removePendingEditInvoiceItem(
  index
) {
  const item =
    pendingEditInvoiceItems[index];

  if (!item) {
    return;
  }

  const bikeLabel =
    `${item.bikeBrand || ""} ${item.bikeName || ""}`
      .trim() ||
    "item ini";

  const confirmed =
    window.confirm(
      `Hapus ${bikeLabel} dari invoice?`
    );

  if (!confirmed) {
    return;
  }

  pendingEditInvoiceItems.splice(
    index,
    1
  );

  renderPendingEditInvoiceItems();
}
function setEditInvoiceItemNote(
  message,
  type = ""
) {
  const note =
    document.getElementById(
      "editInvoiceItemNote"
    );

  if (!note) {
    return;
  }

  note.textContent = message;

  note.classList.remove(
    "is-error",
    "is-success"
  );

  if (type) {
    note.classList.add(type);
  }
}

function openEditInvoiceItemModal(
  index = -1
) {
  const modal =
    document.getElementById(
      "editInvoiceItemModal"
    );

  const title =
    document.getElementById(
      "editInvoiceItemModalTitle"
    );

  const bikeInput =
    document.getElementById(
      "editInvoiceBikeInput"
    );

  const quantityInput =
    document.getElementById(
      "editInvoiceQuantityInput"
    );

  const unitPriceInput =
    document.getElementById(
      "editInvoiceUnitPriceInput"
    );

  const saveButton =
    document.getElementById(
      "saveEditInvoiceItemBtn"
    );

  if (!modal || !bikeInput) {
    return;
  }

  editingInvoiceItemIndex =
    Number.isInteger(index)
      ? index
      : -1;

  const item =
    editingInvoiceItemIndex >= 0
      ? pendingEditInvoiceItems[
          editingInvoiceItemIndex
        ]
      : null;

  populateEditInvoiceBikeOptions();

  bikeInput.value =
    item?.bikeId || "";

  populateEditInvoiceColorOptions(
    item?.bikeColorName || ""
  );

  if (quantityInput) {
    quantityInput.value =
      String(item?.quantity || 1);
  }

  if (unitPriceInput) {
    unitPriceInput.value =
      item
        ? String(
            item.unitPrice || 0
          )
        : "";
  }

  if (title) {
    title.textContent =
      item
        ? "Edit Item Invoice"
        : "Tambah Item Invoice";
  }

  if (saveButton) {
    saveButton.textContent =
      item
        ? "Simpan Item"
        : "Tambahkan Item";
  }

  setEditInvoiceItemNote(
    "Stok akhir akan diperiksa kembali ketika invoice disimpan."
  );

  updateEditInvoiceStockNote();

  modal.classList.remove(
    "is-hidden"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  bikeInput.focus();
}

function closeEditInvoiceItemModal() {
  const modal =
    document.getElementById(
      "editInvoiceItemModal"
    );

  modal?.classList.add(
    "is-hidden"
  );

  modal?.setAttribute(
    "aria-hidden",
    "true"
  );

  editingInvoiceItemIndex = -1;
}

function savePendingEditInvoiceItem() {
  const bike =
    getSelectedEditInvoiceBike();

  const colorName =
    document.getElementById(
      "editInvoiceBikeColorInput"
    )?.value || "";

  const quantity =
    Number(
      document.getElementById(
        "editInvoiceQuantityInput"
      )?.value || 0
    );

  const unitPrice =
    Number(
      document.getElementById(
        "editInvoiceUnitPriceInput"
      )?.value || 0
    );

  if (!bike) {
    setEditInvoiceItemNote(
      "Sepeda wajib dipilih.",
      "is-error"
    );

    return;
  }

  const color =
    getBikeColors(bike).find(
      (entry) =>
        entry.name === colorName
    );

  if (!color) {
    setEditInvoiceItemNote(
      "Warna unit wajib dipilih.",
      "is-error"
    );

    return;
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    setEditInvoiceItemNote(
      "Jumlah unit minimal 1.",
      "is-error"
    );

    return;
  }

  if (
    !Number.isFinite(unitPrice) ||
    unitPrice < 0
  ) {
    setEditInvoiceItemNote(
      "Harga jual tidak boleh negatif.",
      "is-error"
    );

    return;
  }

  const available =
    getEditInvoiceAvailableStock(
      bike,
      color,
      editingInvoiceItemIndex
    );

  if (quantity > available) {
    setEditInvoiceItemNote(
      `Stok tidak cukup. Tersedia ${available} unit setelah rekonsiliasi.`,
      "is-error"
    );

    return;
  }

  const duplicateIndex =
    pendingEditInvoiceItems
      .findIndex(
        (item, index) => {
          return (
            index !==
              editingInvoiceItemIndex &&
            item.bikeId === bike.id &&
            item.bikeColorName ===
              color.name
          );
        }
      );

  if (duplicateIndex >= 0) {
    setEditInvoiceItemNote(
      "Sepeda dan warna ini sudah ada dalam invoice.",
      "is-error"
    );

    return;
  }

  const existingItem =
    editingInvoiceItemIndex >= 0
      ? pendingEditInvoiceItems[
          editingInvoiceItemIndex
        ]
      : null;

  const nextItem = {
    id:
      existingItem?.id ||
      `pending_edit_${Date.now()}_${crypto.randomUUID()}`,

    bikeId:
      bike.id,

    bikeBrand:
      bike.brand,

    bikeName:
      bike.name,

    bikeColorName:
      color.name,

    quantity,

    unitPrice,

    lineTotal:
      quantity * unitPrice
  };

  if (
    editingInvoiceItemIndex >= 0
  ) {
    pendingEditInvoiceItems[
      editingInvoiceItemIndex
    ] = nextItem;
  } else {
    pendingEditInvoiceItems.push(
      nextItem
    );
  }

  renderPendingEditInvoiceItems();
  closeEditInvoiceItemModal();
}
function getSelectedEditInvoiceBike() {
  const bikeId =
    document.getElementById(
      "editInvoiceBikeInput"
    )?.value || "";

  return adminBikesCache.find(
    (bike) => bike.id === bikeId
  ) || null;
}

function getEditInvoiceOriginalQuantity(
  bikeId,
  colorName
) {
  const invoice =
    getPendingEditInvoice();

  if (
    !invoice ||
    invoice.status === "voided"
  ) {
    return 0;
  }

  return (
    Array.isArray(invoice.items)
      ? invoice.items
      : []
  ).reduce((total, item) => {
    const matches =
      item.bikeId === bikeId &&
      item.bikeColorName === colorName;

    return matches
      ? total +
          Number(item.quantity || 0)
      : total;
  }, 0);
}

function getEditInvoiceAssignedQuantity(
  bikeId,
  colorName,
  excludedIndex = -1
) {
  return pendingEditInvoiceItems.reduce(
    (total, item, index) => {
      if (index === excludedIndex) {
        return total;
      }

      const matches =
        item.bikeId === bikeId &&
        item.bikeColorName === colorName;

      return matches
        ? total +
            Number(item.quantity || 0)
        : total;
    },
    0
  );
}

function getEditInvoiceAvailableStock(
  bike,
  color,
  excludedIndex = -1
) {
  const liveStock =
    Number(color?.stockQty || 0);

  const restoredOriginalQuantity =
    getEditInvoiceOriginalQuantity(
      bike.id,
      color.name
    );

  const alreadyAssignedQuantity =
    getEditInvoiceAssignedQuantity(
      bike.id,
      color.name,
      excludedIndex
    );

  return Math.max(
    0,
    liveStock +
      restoredOriginalQuantity -
      alreadyAssignedQuantity
  );
}

function populateEditInvoiceBikeOptions() {
  const select =
    document.getElementById(
      "editInvoiceBikeInput"
    );

  if (!select) {
    return;
  }

  const currentValue =
    select.value;

  const currentItem =
    pendingEditInvoiceItems[
      editingInvoiceItemIndex
    ];

  const bikes =
    adminBikesCache
      .filter((bike) => {
        return (
          Boolean(bike.inStock) ||
          bike.id ===
            currentItem?.bikeId
        );
      })
      .sort((a, b) => {
        const brandResult =
          String(a.brand || "")
            .localeCompare(
              String(b.brand || "")
            );

        return (
          brandResult ||
          String(a.name || "")
            .localeCompare(
              String(b.name || "")
            )
        );
      });

  select.innerHTML = `
    <option value="">
      Pilih sepeda
    </option>

    ${bikes
      .map((bike) => {
        return `
          <option
            value="${escapeHtml(bike.id)}"
          >
            ${escapeHtml(
              `${bike.brand || ""} ${bike.name || ""}`.trim()
            )}
          </option>
        `;
      })
      .join("")}
  `;

  if (
    bikes.some(
      (bike) =>
        bike.id === currentValue
    )
  ) {
    select.value =
      currentValue;
  }
}

function populateEditInvoiceColorOptions(
  preferredColor = ""
) {
  const select =
    document.getElementById(
      "editInvoiceBikeColorInput"
    );

  const bike =
    getSelectedEditInvoiceBike();

  if (!select) {
    return;
  }

  if (!bike) {
    select.innerHTML = `
      <option value="">
        Pilih sepeda terlebih dahulu
      </option>
    `;

    updateEditInvoiceStockNote();
    return;
  }

  const colors =
    getBikeColors(bike);

  select.innerHTML = `
    <option value="">
      Pilih warna
    </option>

    ${colors
      .map((color) => {
        const available =
          getEditInvoiceAvailableStock(
            bike,
            color,
            editingInvoiceItemIndex
          );

        return `
          <option
            value="${escapeHtml(
              color.name
            )}"
            ${
              available <= 0 &&
              color.name !== preferredColor
                ? "disabled"
                : ""
            }
          >
            ${escapeHtml(color.name)}
            — Tersedia ${available}
          </option>
        `;
      })
      .join("")}
  `;

  if (
    colors.some(
      (color) =>
        color.name ===
        preferredColor
    )
  ) {
    select.value =
      preferredColor;
  }

  updateEditInvoiceStockNote();
}

function updateEditInvoiceStockNote() {
  const note =
    document.getElementById(
      "editInvoiceColorStockNote"
    );

  const quantityInput =
    document.getElementById(
      "editInvoiceQuantityInput"
    );

  const colorName =
    document.getElementById(
      "editInvoiceBikeColorInput"
    )?.value || "";

  const bike =
    getSelectedEditInvoiceBike();

  const color =
    bike
      ? getBikeColors(bike).find(
          (entry) =>
            entry.name === colorName
        )
      : null;

  if (!note || !quantityInput) {
    return;
  }

  note.classList.remove(
    "is-error",
    "is-success"
  );

  if (!bike || !color) {
    note.textContent =
      "Pilih sepeda dan warna untuk melihat stok.";

    quantityInput.removeAttribute(
      "max"
    );

    return;
  }

  const available =
    getEditInvoiceAvailableStock(
      bike,
      color,
      editingInvoiceItemIndex
    );

  quantityInput.max =
    String(Math.max(1, available));

  note.textContent =
    `Stok tersedia setelah rekonsiliasi: ${available} unit.`;

  note.classList.add(
    available > 0
      ? "is-success"
      : "is-error"
  );
}
function getEditInvoiceFormData() {
  return {
    id:
      pendingEditInvoiceId,

    customerName:
      document.getElementById(
        "editInvoiceCustomerNameInput"
      )?.value.trim() || "",

    customerPhone:
      document.getElementById(
        "editInvoiceCustomerPhoneInput"
      )?.value.trim() || "",

    customerAddress:
      document.getElementById(
        "editInvoiceCustomerAddressInput"
      )?.value.trim() || "",

    paymentMethod:
      document.getElementById(
        "editInvoicePaymentMethodInput"
      )?.value || "",

    paymentBank:
      document.getElementById(
        "editInvoicePaymentBankInput"
      )?.value || "",

    notes:
      document.getElementById(
        "editInvoiceNotesInput"
      )?.value.trim() || "",

    reason:
      document.getElementById(
        "editInvoiceReasonInput"
      )?.value.trim() || "",

    items:
      pendingEditInvoiceItems.map(
        (item) => ({
          bikeId:
            item.bikeId,

          bikeColorName:
            item.bikeColorName,

          quantity:
            Number(item.quantity || 0),

          unitPrice:
            Number(item.unitPrice || 0)
        })
      )
  };
}

function validateEditInvoiceForm(
  invoice
) {
  const errors = [];

  const originalInvoice =
    getPendingEditInvoice();

  if (!invoice.customerName) {
    errors.push(
      "Nama customer wajib diisi."
    );
  }

  if (
    invoice.paymentMethod ===
      "Bank Transfer" &&
    !invoice.paymentBank
  ) {
    errors.push(
      "Bank tujuan wajib dipilih."
    );
  }

  if (invoice.reason.length < 5) {
    errors.push(
      "Alasan perubahan minimal 5 karakter."
    );
  }

  const originalItems =
    Array.isArray(
      originalInvoice?.items
    )
      ? originalInvoice.items
      : [];

  if (
    originalItems.length > 0 &&
    invoice.items.length === 0
  ) {
    errors.push(
      "Invoice modern harus memiliki minimal satu item. Gunakan Hapus untuk menghapus invoice sepenuhnya."
    );
  }

  invoice.items.forEach(
    (item, index) => {
      const number = index + 1;

      if (!item.bikeId) {
        errors.push(
          `Item ${number}: sepeda wajib dipilih.`
        );
      }

      if (!item.bikeColorName) {
        errors.push(
          `Item ${number}: warna wajib dipilih.`
        );
      }

      if (
        !Number.isInteger(
          item.quantity
        ) ||
        item.quantity < 1
      ) {
        errors.push(
          `Item ${number}: jumlah minimal 1.`
        );
      }

      if (
        !Number.isFinite(
          item.unitPrice
        ) ||
        item.unitPrice < 0
      ) {
        errors.push(
          `Item ${number}: harga tidak valid.`
        );
      }
    }
  );

  return errors;
}

async function saveEditedInvoice() {
  const saveButton =
    document.getElementById(
      "saveEditInvoiceBtn"
    );

  const note =
    document.getElementById(
      "editInvoiceNote"
    );

  if (
    !pendingEditInvoiceId ||
    !canMaintainInvoices
  ) {
    return;
  }

  const invoice =
    getEditInvoiceFormData();

  const errors =
    validateEditInvoiceForm(
      invoice
    );

  if (errors.length) {
    if (note) {
      note.textContent =
        errors.join(" ");

      note.classList.add(
        "is-error"
      );

      note.classList.remove(
        "is-success"
      );
    }

    return;
  }

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent =
      "Menyimpan...";
  }

  if (note) {
    note.textContent =
      "Menyimpan perubahan dan menyesuaikan stok...";

    note.classList.remove(
      "is-error",
      "is-success"
    );
  }

  try {
    await updateInvoice(invoice);

    if (note) {
      note.textContent =
        "Invoice berhasil diperbarui.";

      note.classList.add(
        "is-success"
      );
    }

    closeEditInvoiceModal();

    if (
      typeof loadAdminBikes ===
      "function"
    ) {
      await loadAdminBikes();
    }

    populateInvoiceBikeOptions();
    await loadInvoices();

    if (
      typeof loadAuditLogs ===
      "function"
    ) {
      loadAuditLogs();
    }
  } catch (error) {
    if (handleAdminAuthError(error)) {
      return;
    }

    if (note) {
      note.textContent =
        error.message ||
        "Gagal mengubah invoice.";

      note.classList.add(
        "is-error"
      );

      note.classList.remove(
        "is-success"
      );
    }
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent =
        "Simpan Perubahan";
    }
  }
}
function setupInvoiceEditControls() {
  const invoiceList =
    document.getElementById(
      "adminInvoiceList"
    );

  const editItemsList =
    document.getElementById(
      "editInvoiceItemsList"
    );

  const modal =
    document.getElementById(
      "editInvoiceModal"
    );

  const overlay =
    document.getElementById(
      "editInvoiceModalOverlay"
    );

  const closeButton =
    document.getElementById(
      "closeEditInvoiceModalBtn"
    );

  const cancelButton =
    document.getElementById(
      "cancelEditInvoiceBtn"
    );

  const paymentMethodInput =
    document.getElementById(
      "editInvoicePaymentMethodInput"
    );
  const openItemButton =
  document.getElementById(
    "openEditInvoiceItemModalBtn"
  );

const itemModal =
  document.getElementById(
    "editInvoiceItemModal"
  );

const itemModalOverlay =
  document.getElementById(
    "editInvoiceItemModalOverlay"
  );

const closeItemButton =
  document.getElementById(
    "closeEditInvoiceItemModalBtn"
  );

const cancelItemButton =
  document.getElementById(
    "cancelEditInvoiceItemBtn"
  );

const saveItemButton =
  document.getElementById(
    "saveEditInvoiceItemBtn"
  );

const bikeInput =
  document.getElementById(
    "editInvoiceBikeInput"
  );

const colorInput =
  document.getElementById(
    "editInvoiceBikeColorInput"
  );

const quantityInput =
  document.getElementById(
    "editInvoiceQuantityInput"
  );

const unitPriceInput =
  document.getElementById(
    "editInvoiceUnitPriceInput"
  );
  if (
    invoiceList &&
    !invoiceList.dataset
      .invoiceEditBound
  ) {
    invoiceList.dataset
      .invoiceEditBound = "true";

    invoiceList.addEventListener(
      "click",
      (event) => {
        const button =
          event.target.closest(
            "[data-edit-invoice]"
          );

        if (
          !button ||
          !invoiceList.contains(button)
        ) {
          return;
        }

        openEditInvoiceModal(
          button.dataset.editInvoice
        );
      }
    );
  }

  if (
    editItemsList &&
    !editItemsList.dataset
      .invoiceEditItemsBound
  ) {
    editItemsList.dataset
      .invoiceEditItemsBound =
      "true";

    editItemsList.addEventListener(
      "click",
      (event) => {
        const removeButton =
          event.target.closest(
            "[data-remove-edit-invoice-item]"
          );

        if (
          removeButton &&
          editItemsList.contains(
            removeButton
          )
        ) {
          const index =
            Number(
              removeButton.dataset
                .removeEditInvoiceItem
            );

          removePendingEditInvoiceItem(
            index
          );

          return;
        }

        const editButton =
          event.target.closest(
            "[data-edit-invoice-item]"
          );

        if (
          editButton &&
          editItemsList.contains(
            editButton
          )
        ) {
          const index =
            Number(
              editButton.dataset
                .editInvoiceItem
            );

          openEditInvoiceItemModal(
            index
          );
        }
      }
    );
  }

  [
    closeButton,
    cancelButton,
    overlay
  ].forEach((element) => {
    if (
      !element ||
      element.dataset
        .invoiceEditCloseBound
    ) {
      return;
    }

    element.dataset
      .invoiceEditCloseBound =
      "true";

    element.addEventListener(
      "click",
      closeEditInvoiceModal
    );
  });

  if (
    paymentMethodInput &&
    !paymentMethodInput.dataset
      .invoiceEditPaymentBound
  ) {
    paymentMethodInput.dataset
      .invoiceEditPaymentBound =
      "true";

    paymentMethodInput.addEventListener(
      "change",
      updateEditInvoicePaymentBank
    );
  }
if (
  openItemButton &&
  !openItemButton.dataset
    .invoiceEditItemBound
) {
  openItemButton.dataset
    .invoiceEditItemBound = "true";

  openItemButton.addEventListener(
    "click",
    () => {
      openEditInvoiceItemModal(-1);
    }
  );
}

[
  closeItemButton,
  cancelItemButton,
  itemModalOverlay
].forEach((element) => {
  if (
    !element ||
    element.dataset
      .invoiceEditItemCloseBound
  ) {
    return;
  }

  element.dataset
    .invoiceEditItemCloseBound =
    "true";

  element.addEventListener(
    "click",
    closeEditInvoiceItemModal
  );
});

if (
  bikeInput &&
  !bikeInput.dataset
    .invoiceEditItemBikeBound
) {
  bikeInput.dataset
    .invoiceEditItemBikeBound =
    "true";

  bikeInput.addEventListener(
    "change",
    () => {
      const bike =
        getSelectedEditInvoiceBike();

      if (
        bike &&
        unitPriceInput
      ) {
        unitPriceInput.value =
          String(
            Number(bike.price || 0)
          );
      }

      populateEditInvoiceColorOptions();
    }
  );
}

if (
  colorInput &&
  !colorInput.dataset
    .invoiceEditItemColorBound
) {
  colorInput.dataset
    .invoiceEditItemColorBound =
    "true";

  colorInput.addEventListener(
    "change",
    updateEditInvoiceStockNote
  );
}

if (
  quantityInput &&
  !quantityInput.dataset
    .invoiceEditItemQuantityBound
) {
  quantityInput.dataset
    .invoiceEditItemQuantityBound =
    "true";

  quantityInput.addEventListener(
    "input",
    updateEditInvoiceStockNote
  );
}

if (
  saveItemButton &&
  !saveItemButton.dataset
    .invoiceEditItemSaveBound
) {
  saveItemButton.dataset
    .invoiceEditItemSaveBound =
    "true";

  saveItemButton.addEventListener(
    "click",
    savePendingEditInvoiceItem
  );
}
  if (
    modal &&
    !modal.dataset
      .invoiceEditKeyboardBound
  ) {
    modal.dataset
      .invoiceEditKeyboardBound =
      "true";

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          !modal.classList.contains(
            "is-hidden"
          )
        ) {
          closeEditInvoiceModal();
        }
      }
    );
  }
}
function setupInvoiceDeleteControls() {
  const invoiceList =
    document.getElementById(
      "adminInvoiceList"
    );

  const modal =
    document.getElementById(
      "deleteInvoiceModal"
    );

  const overlay =
    document.getElementById(
      "deleteInvoiceModalOverlay"
    );

  const closeButton =
    document.getElementById(
      "closeDeleteInvoiceModalBtn"
    );

  const cancelButton =
    document.getElementById(
      "cancelDeleteInvoiceBtn"
    );

  const confirmButton =
    document.getElementById(
      "confirmDeleteInvoiceBtn"
    );

  const reasonInput =
    document.getElementById(
      "deleteInvoiceReasonInput"
    );

  const confirmationInput =
    document.getElementById(
      "deleteInvoiceConfirmInput"
    );

  if (
    invoiceList &&
    !invoiceList.dataset
      .invoiceDeleteBound
  ) {
    invoiceList.dataset
      .invoiceDeleteBound = "true";

    invoiceList.addEventListener(
      "click",
      (event) => {
        const button =
          event.target.closest(
            "[data-delete-invoice]"
          );

        if (
          !button ||
          !invoiceList.contains(button)
        ) {
          return;
        }

        openDeleteInvoiceModal(
          button.dataset.deleteInvoice
        );
      }
    );
  }

  if (
    closeButton &&
    !closeButton.dataset
      .invoiceDeleteCloseBound
  ) {
    closeButton.dataset
      .invoiceDeleteCloseBound = "true";

    closeButton.addEventListener(
      "click",
      closeDeleteInvoiceModal
    );
  }

  if (
    cancelButton &&
    !cancelButton.dataset
      .invoiceDeleteCancelBound
  ) {
    cancelButton.dataset
      .invoiceDeleteCancelBound = "true";

    cancelButton.addEventListener(
      "click",
      closeDeleteInvoiceModal
    );
  }

  if (
    overlay &&
    !overlay.dataset
      .invoiceDeleteOverlayBound
  ) {
    overlay.dataset
      .invoiceDeleteOverlayBound = "true";

    overlay.addEventListener(
      "click",
      closeDeleteInvoiceModal
    );
  }

  [
    reasonInput,
    confirmationInput
  ].forEach((input) => {
    if (
      !input ||
      input.dataset
        .invoiceDeleteValidationBound
    ) {
      return;
    }

    input.dataset
      .invoiceDeleteValidationBound =
      "true";

    input.addEventListener(
      "input",
      updateDeleteInvoiceConfirmation
    );
  });

  if (
    confirmButton &&
    !confirmButton.dataset
      .invoiceDeleteConfirmBound
  ) {
    confirmButton.dataset
      .invoiceDeleteConfirmBound =
      "true";

    confirmButton.addEventListener(
      "click",
      confirmDeleteLegacyInvoice
    );
  }

  if (
    modal &&
    !modal.dataset
      .invoiceDeleteKeyboardBound
  ) {
    modal.dataset
      .invoiceDeleteKeyboardBound =
      "true";

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          !modal.classList.contains(
            "is-hidden"
          )
        ) {
          closeDeleteInvoiceModal();
        }
      }
    );
  }
}
async function loadInvoicePage() {
  setupInvoiceEditControls();
  setupInvoiceDeleteControls();
  const saveButton =
  document.getElementById(
    "saveEditInvoiceBtn"
  );
  if (
  saveButton &&
  !saveButton.dataset
    .invoiceEditSaveBound
) {
  saveButton.dataset
    .invoiceEditSaveBound =
    "true";

  saveButton.addEventListener(
    "click",
    saveEditedInvoice
  );
}
  if (
    typeof loadAdminBikes === "function"
  ) {
    await loadAdminBikes();
  }

  populateInvoiceBikeOptions();
  updateInvoicePreview();

  await loadInvoices();
}