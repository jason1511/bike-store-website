/* =========================
   ADMIN INVOICES / SALES
========================= */
let adminInvoicesCache = [];

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

async function loadInvoicePage() {
  if (typeof loadAdminBikes === "function") {
    await loadAdminBikes();
  }

  populateInvoiceBikeOptions();
  updateInvoicePreview();
  loadInvoices();
}