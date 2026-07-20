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

        <title>Cetak Invoice</title>

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
            size: A4 portrait;
            margin: 8mm;
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
            width: 194mm;
            max-width: 194mm;
            margin: 0 auto;
            border-radius: 0;
            box-shadow: none;
          }

          .printable-invoice-page {
            box-sizing: border-box;
            width: 194mm;
            max-width: 194mm;
            height: auto;
            min-height: 0;
            margin: 0;
            padding: 4mm 5mm;
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

            .printable-invoice {
              display: block !important;
              width: 194mm !important;
              max-width: 194mm !important;
              margin: 0 auto !important;
            }

            .printable-invoice-page {
              width: 194mm !important;
              max-width: 194mm !important;
              min-height: 0 !important;
              padding: 4mm 5mm !important;
            }
          }
        </style>
      </head>

      <body class="standalone-invoice-print">
  ${invoiceHtml}
</body>
    </html>
  `);

  printWindow.document.close();

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