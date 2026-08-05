/* =========================
   ADMIN INVOICE DETAILS
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
        bikeId: item.bikeId || "",
        bikeBrand: item.bikeBrand || invoice.bikeBrand || "",
        bikeName: item.bikeName || invoice.bikeName || "",
        bikeColorName: item.bikeColorName || invoice.bikeColorName || "",
        frameNumbers:
          normalizeInvoiceFrameNumbers(
            item.frameNumbers
          ),
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
      bikeId: invoice.bikeId || "",
      bikeBrand: invoice.bikeBrand || "",
      bikeName: invoice.bikeName || "",
      bikeColorName: invoice.bikeColorName || "",
      frameNumbers: [],
      quantity,
      unitPrice,
      lineTotal: totalPrice
    }
  ];
}

function getInvoiceItemLabel(item) {
  return `${item.bikeBrand || ""} ${item.bikeName || ""}`.trim() || "-";
}

function groupInvoiceItemsByProduct(items) {
  const groups = new Map();

  items.forEach((item) => {
    const label = getInvoiceItemLabel(item);
    const key = item.bikeId
      ? `bike:${item.bikeId}`
      : `label:${label.toLocaleLowerCase("id-ID")}`;

    if (!groups.has(key)) {
      groups.set(key, {
        label,
        items: []
      });
    }

    groups.get(key).items.push(item);
  });

  return Array.from(groups.values());
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

  const productGroups =
    groupInvoiceItemsByProduct(items);

  const rows = productGroups.map((group) => {
    const quantity = group.items.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    );

    const lineTotal = group.items.reduce(
      (total, item) => {
        const itemQuantity =
          Number(item.quantity || 1);

        return (
          total +
          Number(
            item.lineTotal ||
            itemQuantity *
              Number(item.unitPrice || 0)
          )
        );
      },
      0
    );

    const variantDetails = group.items
      .map((item) => {
        const color =
          item.bikeColorName || "-";

        const itemQuantity =
          Number(item.quantity || 1);

        return `${color} (${itemQuantity} unit)`;
      })
      .join(" · ");

    const frameNumbers = group.items
      .flatMap((item) =>
        normalizeInvoiceFrameNumbers(
          item.frameNumbers
        )
      );

    const unitPrices = Array.from(
      new Set(
        group.items.map((item) =>
          Number(item.unitPrice || 0)
        )
      )
    );

    const unitPriceLabel =
      unitPrices.length === 1
        ? formatRupiah(unitPrices[0])
        : unitPrices
            .map((price) =>
              formatRupiah(price)
            )
            .join(" / ");

    return `
      <tr>
        <td class="is-center">
          ${quantity}
          <small>unit</small>
        </td>

        <td class="printable-invoice-product-cell">
          <strong>${escapeHtml(group.label)}</strong>
          <small>${escapeHtml(variantDetails)}</small>
        </td>

        <td class="printable-invoice-frame-numbers">
          ${escapeHtml(
            frameNumbers.length
              ? frameNumbers.join(", ")
              : "-"
          )}
        </td>

        <td class="is-right">
          ${escapeHtml(unitPriceLabel)}
        </td>

        <td class="is-right">
          ${escapeHtml(formatRupiah(lineTotal))}
        </td>
      </tr>
    `;
  });

  const emptyRowCount =
    Math.max(0, 5 - rows.length);

  for (
    let index = 0;
    index < emptyRowCount;
    index += 1
  ) {
    rows.push(`
      <tr class="is-empty-row" aria-hidden="true">
        <td>&nbsp;</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    `);
  }

  tableBody.innerHTML = rows.join("");
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

  setPrintText("printInvoiceStaffSignature", invoice.createdByUsername || "-");
  setPrintText(
    "printInvoiceTechnicianSignature",
    invoice.technicianName ||
      invoice.technician ||
      "-"
  );

  // Newer template IDs, if they exist
  setPrintText("printInvoiceCustomerName", invoice.customerName);
  setPrintText("printInvoiceCustomerPhone", invoice.customerPhone || "-");
  setPrintText("printInvoiceCustomerAddress", invoice.customerAddress || "-");

  setPrintText("printInvoicePaymentMethod", invoice.paymentMethod || "-");
  setPrintText("printInvoicePaymentBank", invoice.paymentBank || "-");
  setPrintText("printInvoicePaymentStatus", isVoided ? "Dibatalkan" : "Lunas");
  setPrintText("printInvoiceSubtotal", formatRupiah(subtotal));
  setPrintText("printInvoiceGrandTotal", formatRupiah(totalPrice));

  const paymentBankRow = document.getElementById("printInvoicePaymentBankRow");

  if (paymentBankRow) {
    paymentBankRow.classList.toggle(
      "is-hidden",
      invoice.paymentMethod !== "Bank Transfer" || !invoice.paymentBank
    );
  }

  renderPrintableInvoiceItems(invoice);

  const notesSection = document.getElementById("printInvoiceNotesSection");

  if (notesSection) {
    notesSection.classList.toggle("is-hidden", !notesText || notesText === "-");
  }

  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
}
function closeInvoiceModal() {
  const modal =
    document.getElementById(
      "adminInvoiceModal"
    );

  document.body.classList.remove(
    "is-printing-invoice"
  );

  if (!modal) {
    return;
  }

  modal.classList.add("is-hidden");

  modal.setAttribute(
    "aria-hidden",
    "true"
  );
}

function printCurrentInvoice() {
  const invoice =
    document.querySelector(
      "#adminInvoiceModal .printable-invoice"
    );

  if (!invoice) {
    return;
  }

  /*
   * Open immediately from the button
   * click so mobile browsers do not
   * block it as a popup.
   */
  const printWindow =
    window.open(
      "",
      "_blank"
    );

  if (!printWindow) {
    window.alert(
      "Browser memblokir halaman cetak. Izinkan pop-up lalu coba lagi."
    );

    return;
  }

  const baseUrl =
    `${window.location.origin}/`;

  const invoiceHtml =
    invoice.outerHTML;

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

        <title>Cetak Faktur Penjualan</title>

        <link
          rel="stylesheet"
          href="css/global.css"
        >

        <link
          rel="stylesheet"
          href="css/admin-print-invoice.css"
        >

        <style>
          @page {
            size: 210mm 148mm;
            margin: 5mm;
          }

          html,
          body {
            width: 100%;
            margin: 0;
            padding: 0;
            background: #ffffff;
          }

          body {
            -webkit-print-color-adjust:
              exact;
            print-color-adjust: exact;
          }

          .printable-invoice {
            width: 200mm;
            max-width: 200mm;
            margin: 0 auto;
            border-radius: 0;
            box-shadow: none;
            overflow: hidden;
          }

          .printable-invoice-page {
            box-sizing: border-box;
            width: 200mm;
            max-width: 200mm;
            height: 136mm;
            min-height: 136mm;
            max-height: 136mm;
            margin: 0;
            padding: 4mm 5mm 3mm;
            overflow: hidden;
          }

          .standalone-print-actions {
            position: sticky;
            top: 0;
            z-index: 20;
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 16px;
            padding: 12px;
            border-bottom: 1px solid #d7e0de;
            background: rgba(255, 255, 255, 0.96);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          }

          .standalone-print-actions button {
            min-width: 120px;
            padding: 10px 16px;
            border: 1px solid #159b79;
            border-radius: 999px;
            font: inherit;
            font-weight: 800;
            cursor: pointer;
          }

          .standalone-print-actions
            .standalone-print-again {
            color: #ffffff;
            background: #159b79;
          }

          .standalone-print-actions
            .standalone-print-close {
            color: #182322;
            border-color: #aebfbc;
            background: #ffffff;
          }

          @media screen {
            body {
              padding: 0 0 16px;
            }
          }

          @media print {
            .standalone-print-actions {
              display: none !important;
            }

            html,
            body {
              width: auto !important;
              min-height: 0 !important;
            }

            .printable-invoice {
              display: block !important;
              width: 200mm !important;
              max-width: 200mm !important;
              margin: 0 auto !important;
              overflow: hidden !important;
              break-after: avoid !important;
              page-break-after: avoid !important;
            }

            .printable-invoice-page {
              width: 200mm !important;
              max-width: 200mm !important;
              height: 136mm !important;
              min-height: 136mm !important;
              max-height: 136mm !important;
              padding: 4mm 5mm 3mm !important;
              overflow: hidden !important;
            }
          }
        </style>
      </head>

      <body class="standalone-invoice-print">
        <div
          class="standalone-print-actions"
          role="toolbar"
          aria-label="Kontrol cetak invoice"
        >
          <button
            id="standaloneInvoicePrintAgain"
            class="standalone-print-again"
            type="button"
          >
            Cetak Lagi
          </button>

          <button
            id="standaloneInvoiceClose"
            class="standalone-print-close"
            type="button"
          >
            Tutup Tab
          </button>
        </div>

        ${invoiceHtml}
      </body>
    </html>
  `);

  printWindow.document.close();

  printWindow.document
    .getElementById(
      "standaloneInvoicePrintAgain"
    )
    ?.addEventListener(
      "click",
      () => {
        printWindow.focus();
        printWindow.print();
      }
    );

  printWindow.document
    .getElementById(
      "standaloneInvoiceClose"
    )
    ?.addEventListener(
      "click",
      () => {
        printWindow.close();
      }
    );

  printWindow.addEventListener(
    "load",
    () => {
      /*
       * Give the stylesheet and logo time
       * to finish rendering on mobile.
       */
      window.setTimeout(
        () => {
          printWindow.focus();
          printWindow.print();
        },
        500
      );
    },
    {
      once: true
    }
  );
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

  if (!document.body.dataset.invoiceEscapeBound) {
    document.body.dataset.invoiceEscapeBound = "true";

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeInvoiceModal();
      }
    });
  }
}