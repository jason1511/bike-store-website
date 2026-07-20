/* =========================
   ADMIN REPORTS
========================= */
function renderReportStockAnalyticsSummary(
  summary = {}
) {
  renderAdminStockSummary(
    summary,
    {
      totalStock:
        "reportStockAnalyticsTotalStock",

      activeBikes:
        "reportStockAnalyticsActiveBikes",

      lowStock:
        "reportStockAnalyticsLowStock",

      outOfStock:
        "reportStockAnalyticsOutOfStock"
    }
  );
}

function renderReportStockMovementList(
  movements = []
) {
  renderAdminStockMovementList(
    movements,
    "reportStockAnalyticsMovementList"
  );
}

function renderReportStockMovementChart(
  movements = []
) {
  renderAdminStockMovementChart(
    movements,
    {
      targetId:
        "reportStockAnalyticsMovementChart",
      width: 760,
      height: 260,
      paddingLeft: 54,
      paddingRight: 24,
      paddingTop: 52,
      paddingBottom: 38,
      labelCount: 7,
      subtitle:
        "Positif berarti stok naik, negatif berarti stok berkurang"
    }
  );
}

async function loadReportStockAnalytics() {
  const chart = document.getElementById("reportStockAnalyticsMovementChart");
  const list = document.getElementById("reportStockAnalyticsMovementList");

  if (chart) {
    chart.innerHTML = `
      <div class="admin-empty-state">
        Memuat grafik stok...
      </div>
    `;
  }

  if (list) {
    list.innerHTML = `
      <div class="admin-empty-state">
        Memuat statistik stok...
      </div>
    `;
  }

  try {
    const data = await fetchStockAnalytics();

    renderReportStockAnalyticsSummary(data.summary || {});
    renderReportStockMovementChart(data.dailyMovements || []);
    renderReportStockMovementList(data.dailyMovements || []);
  } catch (error) {
    if (handleAdminAuthError(error)) {
      return;
    }

    console.error("Failed to load report stock analytics:", error);

    if (chart) {
      chart.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(error.message || "Gagal memuat grafik stok.")}
        </div>
      `;
    }

    if (list) {
      list.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(error.message || "Gagal memuat statistik stok.")}
        </div>
      `;
    }
  }
}
async function loadPrintableReport() {
  const existingReport =
    document.getElementById(
      "printableReport"
    );

  if (existingReport) {
    return;
  }

  const host =
    document.getElementById(
      "printableReportHost"
    );

  if (!host) {
    throw new Error(
      "Tempat laporan cetak tidak ditemukan."
    );
  }

  const response = await fetch(
    "admin-partials/printable-report.html",
    {
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(
      "Gagal memuat format laporan cetak."
    );
  }

  host.innerHTML =
    await response.text();

  const printableReport =
    document.getElementById(
      "printableReport"
    );

  if (!printableReport) {
    throw new Error(
      "Format laporan cetak tidak valid."
    );
  }

  /*
   * Move the report outside the dashboard.
   * Otherwise, the hidden dashboard still
   * occupies several printed pages.
   */
  document.body.append(
    printableReport
  );
}
async function loadReportsPage() {
  const tasks = [];

  if (typeof loadInvoiceAnalytics === "function") {
    tasks.push(loadInvoiceAnalytics());
  }

  tasks.push(loadReportStockAnalytics());

  await Promise.allSettled(tasks);
}

let generatedReport = null;

function invalidateGeneratedReport() {
  generatedReport = null;
  const printButton =
  document.getElementById(
    "printReportButton"
  );
  const preview = document.getElementById("reportPreview");

  if (printButton) printButton.disabled = true;
  preview?.classList.add("is-hidden");
}

function toReportDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseReportDate(value) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
}

function formatReportDisplayDate(date) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  ).format(date);
}

async function populateReportMonthOptions() {
  const select =
    document.getElementById(
      "reportMonthlyInput"
    );

  const type =
    document.getElementById(
      "reportTypeInput"
    )?.value || "sales";

  const note =
    document.getElementById(
      "reportGenerationNote"
    );

  if (!select) {
    return;
  }

  select.disabled = true;

  select.innerHTML = `
    <option value="">
      Memuat bulan...
    </option>
  `;

  try {
    const data = await fetchAdminJson(
      `/api/admin/reports?type=${
        encodeURIComponent(type)
      }&meta=1`,
      {
        method: "GET"
      }
    );

    const firstDate =
      data.range?.firstDate || "";

    const lastDate =
      data.range?.lastDate || "";

    if (!firstDate || !lastDate) {
      select.innerHTML = `
        <option value="">
          Belum ada data
        </option>
      `;

      return;
    }

    const firstMatch =
      /^(\d{4})-(\d{2})-\d{2}$/.exec(
        firstDate
      );

    const lastMatch =
      /^(\d{4})-(\d{2})-\d{2}$/.exec(
        lastDate
      );

    if (!firstMatch || !lastMatch) {
      throw new Error(
        "Format tanggal laporan tidak valid."
      );
    }

    const firstMonth = new Date(
      Number(firstMatch[1]),
      Number(firstMatch[2]) - 1,
      1
    );

    const lastMonth = new Date(
      Number(lastMatch[1]),
      Number(lastMatch[2]) - 1,
      1
    );

    const formatter =
      new Intl.DateTimeFormat(
        "id-ID",
        {
          month: "long",
          year: "numeric"
        }
      );

    const options = [];
    const current = new Date(lastMonth);

    while (current >= firstMonth) {
      const value =
        `${current.getFullYear()}-` +
        String(
          current.getMonth() + 1
        ).padStart(2, "0");

      options.push(`
        <option value="${value}">
          ${formatter.format(current)}
        </option>
      `);

      current.setMonth(
        current.getMonth() - 1
      );
    }

    select.innerHTML =
      options.join("");
  } catch (error) {
    select.innerHTML = `
      <option value="">
        Gagal memuat bulan
      </option>
    `;

    if (
      !handleAdminAuthError(error) &&
      note
    ) {
      note.textContent =
        error.message ||
        "Gagal memuat pilihan bulan.";
    }
  } finally {
    select.disabled =
      !select.value;
  }
}

function updateReportWeeklyRangeNote() {
  const input =
    document.getElementById(
      "reportWeeklyInput"
    );

  const note =
    document.getElementById(
      "reportWeeklyRangeNote"
    );

  const startDate =
    parseReportDate(
      input?.value || ""
    );

  if (!note || !startDate) {
    return;
  }

  const endDate =
    new Date(startDate);

  /*
   * The selected date is day 1,
   * so add 6 days for a 7-day report.
   */
  endDate.setDate(
    startDate.getDate() + 6
  );

  note.textContent =
    `${formatReportDisplayDate(startDate)} – ` +
    formatReportDisplayDate(endDate);
}

function updateReportPeriodControls() {
  const period =
    document.getElementById(
      "reportPeriodInput"
    )?.value || "monthly";

  document
    .getElementById("reportDailyGroup")
    ?.classList.toggle(
      "is-hidden",
      period !== "daily"
    );

  document
    .getElementById("reportWeeklyGroup")
    ?.classList.toggle(
      "is-hidden",
      period !== "weekly"
    );

  document
    .getElementById("reportMonthlyGroup")
    ?.classList.toggle(
      "is-hidden",
      period !== "monthly"
    );

  document
    .getElementById("reportCustomFromGroup")
    ?.classList.toggle(
      "is-hidden",
      period !== "custom"
    );

  document
    .getElementById("reportCustomToGroup")
    ?.classList.toggle(
      "is-hidden",
      period !== "custom"
    );
}

async function initialiseReportPeriodControls() {
  const today = new Date();

  const dailyInput =
    document.getElementById(
      "reportDailyInput"
    );

  const weeklyInput =
    document.getElementById(
      "reportWeeklyInput"
    );

  const customFromInput =
    document.getElementById(
      "reportCustomFromInput"
    );

  const customToInput =
    document.getElementById(
      "reportCustomToInput"
    );

  await populateReportMonthOptions();

  if (dailyInput) {
    dailyInput.value =
      toReportDateValue(today);
  }

  if (weeklyInput) {
  weeklyInput.value =
    toReportDateValue(today);
}

  if (customFromInput) {
    customFromInput.value =
      toReportDateValue(today);
  }

  if (customToInput) {
    customToInput.value =
      toReportDateValue(today);
  }

  updateReportWeeklyRangeNote();
  updateReportPeriodControls();
}

function getSelectedReportDateRange() {
  const period =
    document.getElementById(
      "reportPeriodInput"
    )?.value || "monthly";

  const daily =
    document.getElementById(
      "reportDailyInput"
    )?.value || "";

  const weekly =
    document.getElementById(
      "reportWeeklyInput"
    )?.value || "";

  const monthly =
    document.getElementById(
      "reportMonthlyInput"
    )?.value || "";

  const customFrom =
    document.getElementById(
      "reportCustomFromInput"
    )?.value || "";

  const customTo =
    document.getElementById(
      "reportCustomToInput"
    )?.value || "";

  if (period === "daily") {
    return {
      from: daily,
      to: daily
    };
  }

  if (period === "weekly") {
  const startDate =
    parseReportDate(weekly);

  if (!startDate) {
    return {
      from: "",
      to: ""
    };
  }

  const endDate =
    new Date(startDate);

  endDate.setDate(
    startDate.getDate() + 6
  );

  return {
    from: toReportDateValue(startDate),
    to: toReportDateValue(endDate)
  };
}

  if (period === "monthly") {
    const match =
      /^(\d{4})-(\d{2})$/.exec(
        monthly
      );

    if (!match) {
      return {
        from: "",
        to: ""
      };
    }

    const year =
      Number(match[1]);

    const monthIndex =
      Number(match[2]) - 1;

    return {
      from: toReportDateValue(
        new Date(
          year,
          monthIndex,
          1
        )
      ),

      to: toReportDateValue(
        new Date(
          year,
          monthIndex + 1,
          0
        )
      )
    };
  }

  return {
    from: customFrom,
    to: customTo
  };
}
function getReportColumns(type) {
  if (type === "stock") {
    return [
      ["date", "Tanggal"], ["bike", "Sepeda"], ["color", "Warna"],
      ["movementLabel", "Jenis"], ["quantityChange", "Perubahan"],
      ["quantityBefore", "Stok Sebelum"], ["quantityAfter", "Stok Sesudah"],
      ["createdBy", "Admin"], ["note", "Catatan"]
    ];
  }

  return [
    ["date", "Tanggal"], ["invoiceNumber", "Invoice"], ["customerName", "Customer"],
    ["bike", "Sepeda"], ["color", "Warna"], ["quantity", "Jumlah"],
    ["unitPrice", "Harga Satuan"], ["lineTotal", "Total"],
    ["payment", "Pembayaran"], ["statusLabel", "Status"], ["createdBy", "Admin"]
  ];
}

function formatReportCell(key, value) {
  if (["unitPrice", "lineTotal"].includes(key)) return formatRupiah(Number(value || 0));
  return String(value ?? "-");
}
function formatPrintableReportPeriod(
  from,
  to
) {
  const fromDate =
    parseReportDate(from);

  const toDate =
    parseReportDate(to);

  if (!fromDate || !toDate) {
    return `${from} sampai ${to}`;
  }

  if (from === to) {
    return formatReportDisplayDate(fromDate);
  }

  return (
    `${formatReportDisplayDate(fromDate)} – ` +
    formatReportDisplayDate(toDate)
  );
}

function getSalesReportSummary(rows = []) {
  const invoiceNumbers =
    new Set();

  const activeInvoiceNumbers =
    new Set();

  const voidedInvoiceNumbers =
    new Set();

  let totalUnits = 0;
  let netRevenue = 0;

  rows.forEach((row) => {
    const invoiceNumber =
      row.invoiceNumber || "-";

    invoiceNumbers.add(invoiceNumber);

    if (row.statusLabel === "Dibatalkan") {
      voidedInvoiceNumbers.add(
        invoiceNumber
      );

      return;
    }

    activeInvoiceNumbers.add(
      invoiceNumber
    );

    totalUnits +=
      Number(row.quantity || 0);

    netRevenue +=
      Number(row.lineTotal || 0);
  });

  return [
    {
      label: "Total Transaksi",
      value: invoiceNumbers.size
    },
    {
      label: "Invoice Aktif",
      value: activeInvoiceNumbers.size
    },
    {
      label: "Invoice Dibatalkan",
      value: voidedInvoiceNumbers.size
    },
    {
      label: "Unit Terjual",
      value: totalUnits
    },
    {
      label: "Omzet Bersih",
      value: formatRupiah(netRevenue)
    }
  ];
}

function getStockReportSummary(rows = []) {
  let stockIn = 0;
  let stockOut = 0;
  let netChange = 0;

  rows.forEach((row) => {
    const change =
      Number(row.quantityChange || 0);

    if (change > 0) {
      stockIn += change;
    }

    if (change < 0) {
      stockOut += Math.abs(change);
    }

    netChange += change;
  });

  return [
    {
      label: "Total Pergerakan",
      value: rows.length
    },
    {
      label: "Stok Masuk",
      value: stockIn
    },
    {
      label: "Stok Keluar",
      value: stockOut
    },
    {
      label: "Perubahan Bersih",
      value:
        netChange > 0
          ? `+${netChange}`
          : String(netChange)
    }
  ];
}

function getPrintableReportSummary(report) {
  return report.type === "sales"
    ? getSalesReportSummary(report.rows)
    : getStockReportSummary(report.rows);
}

function renderPrintableReportSummary(
  report
) {
  const container =
    document.getElementById(
      "printReportSummary"
    );

  if (!container) {
    return;
  }

  const summary =
    getPrintableReportSummary(report);

  container.innerHTML =
    summary
      .map(
        (item) => `
          <article
            class="print-report-summary-item"
          >
            <span
              class="print-report-summary-label"
            >
              ${escapeHtml(item.label)}
            </span>

            <strong
              class="print-report-summary-value"
            >
              ${escapeHtml(item.value)}
            </strong>
          </article>
        `
      )
      .join("");
}

function renderPrintableReportTable(
  report
) {
  const head =
    document.getElementById(
      "printReportTableHead"
    );

  const body =
    document.getElementById(
      "printReportTableBody"
    );

  const foot =
    document.getElementById(
      "printReportTableFoot"
    );

  if (!head || !body || !foot) {
    return;
  }

  const columns =
    getReportColumns(report.type);

  head.innerHTML = `
    <tr>
      ${columns
        .map(
          ([, label]) =>
            `<th>${escapeHtml(label)}</th>`
        )
        .join("")}
    </tr>
  `;

  body.innerHTML =
    report.rows.length
      ? report.rows
          .map(
            (row) => `
              <tr>
                ${columns
                  .map(([key]) => {
                    const numeric =
                      [
                        "quantity",
                        "unitPrice",
                        "lineTotal",
                        "quantityChange",
                        "quantityBefore",
                        "quantityAfter"
                      ].includes(key);

                    return `
                      <td
                        class="${
                          numeric
                            ? "is-number"
                            : ""
                        }"
                      >
                        ${escapeHtml(
                          formatReportCell(
                            key,
                            row[key]
                          )
                        )}
                      </td>
                    `;
                  })
                  .join("")}
              </tr>
            `
          )
          .join("")
      : `
          <tr>
            <td
              colspan="${columns.length}"
              class="print-report-empty"
            >
              Tidak ada data pada periode ini.
            </td>
          </tr>
        `;

  if (report.type === "sales") {
    const revenue =
      report.rows.reduce(
        (total, row) => {
          if (
            row.statusLabel ===
            "Dibatalkan"
          ) {
            return total;
          }

          return (
            total +
            Number(row.lineTotal || 0)
          );
        },
        0
      );

    foot.innerHTML = `
      <tr>
        <td
          colspan="${columns.length - 1}"
          class="is-number"
        >
          TOTAL OMZET BERSIH
        </td>

        <td class="is-number">
          ${escapeHtml(
            formatRupiah(revenue)
          )}
        </td>
      </tr>
    `;
  } else {
    foot.innerHTML = `
      <tr>
        <td colspan="${columns.length}">
          Total ${report.rows.length}
          pergerakan stok
        </td>
      </tr>
    `;
  }
}

async function preparePrintableReport(
  report
) {
  await loadPrintableReport();

  const title =
    report.type === "sales"
      ? "LAPORAN PENJUALAN"
      : "LAPORAN PERGERAKAN STOK";

  const period =
    formatPrintableReportPeriod(
      report.from,
      report.to
    );

  const createdAt =
    new Intl.DateTimeFormat(
      "id-ID",
      {
        dateStyle: "long",
        timeStyle: "short"
      }
    ).format(new Date());

  document.getElementById(
    "printReportTitle"
  ).textContent = title;

  document.getElementById(
    "printReportPeriod"
  ).textContent = `Periode: ${period}`;

  document.getElementById(
    "printReportCreatedAt"
  ).textContent = createdAt;

  document.getElementById(
    "printReportCreatedBy"
  ).textContent = "Sistem Admin";

  document.getElementById(
    "printReportFooterPeriod"
  ).textContent = period;

  renderPrintableReportSummary(report);
  renderPrintableReportTable(report);
}
function renderGeneratedReport(report) {
  const preview = document.getElementById("reportPreview");
  const head = document.getElementById("reportPreviewHead");
  const body = document.getElementById("reportPreviewBody");
const printButton =
  document.getElementById(
    "printReportButton"
  );
  const columns = getReportColumns(report.type);

  if (!preview || !head || !body) return;

  document.getElementById("reportPreviewType").textContent =
    report.type === "sales" ? "Laporan Penjualan" : "Laporan Pergerakan Stok";
  document.getElementById("reportPreviewTitle").textContent = report.title;
  document.getElementById("reportPreviewPeriod").textContent = `${report.from} sampai ${report.to}`;
  document.getElementById("reportPreviewSummary").textContent = `${report.rows.length} data`;

  head.innerHTML = `<tr>${columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}</tr>`;
  body.innerHTML = report.rows.length
    ? report.rows.slice(0, 100).map((row) => `<tr>${columns.map(([key]) =>
        `<td>${escapeHtml(formatReportCell(key, row[key]))}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${columns.length}" class="admin-report-empty">Tidak ada data pada periode ini.</td></tr>`;

  preview.classList.remove("is-hidden");
  if (printButton) printButton.disabled = !report.rows.length;
}

async function previewGeneratedReport() {
  const type = document.getElementById("reportTypeInput")?.value || "sales";
  const { from, to } =  getSelectedReportDateRange();
  const note = document.getElementById("reportGenerationNote");
  const button = document.getElementById("previewReportBtn");

  if (!from || !to || from > to) {
    if (note) note.textContent = "Rentang tanggal laporan tidak valid.";
    return;
  }

  if (button) { button.disabled = true; button.textContent = "Memuat..."; }

  try {
    generatedReport = await fetchAdminJson(
      `/api/admin/reports?type=${encodeURIComponent(type)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { method: "GET" }
    );
    renderGeneratedReport(generatedReport);
    if (note) note.textContent = generatedReport.rows.length
      ? `Preview menampilkan maksimal 100 dari ${generatedReport.rows.length} data.`
      : "Tidak ada data pada periode yang dipilih.";
  } catch (error) {
    if (!handleAdminAuthError(error) && note) note.textContent = error.message || "Gagal membuat laporan.";
  } finally {
    if (button) { button.disabled = false; button.textContent = "Preview Laporan"; }
  }
}
async function printGeneratedReport() {
  const note =
    document.getElementById(
      "reportGenerationNote"
    );

  const button =
    document.getElementById(
      "printReportButton"
    );

  if (!generatedReport?.rows?.length) {
    if (note) {
      note.textContent =
        "Preview laporan terlebih dahulu.";
    }

    return;
  }

  /*
   * Open the tab directly from the click.
   * Mobile browsers may block it if it is
   * opened after the asynchronous setup.
   */
  const printWindow =
    window.open("", "_blank");

  if (!printWindow) {
    window.alert(
      "Browser memblokir halaman cetak. Izinkan pop-up lalu coba lagi."
    );

    return;
  }

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
        <title>Menyiapkan Laporan</title>
      </head>
      <body>
        <p>Menyiapkan laporan...</p>
      </body>
    </html>
  `);
  printWindow.document.close();

  if (button) {
    button.disabled = true;
    button.textContent =
      "Menyiapkan laporan...";
  }

  try {
    await preparePrintableReport(
      generatedReport
    );

    const report =
      document.getElementById(
        "printableReport"
      );

    if (!report) {
      throw new Error(
        "Format laporan cetak tidak ditemukan."
      );
    }

    const baseUrl =
      `${window.location.origin}/`;

    const reportTitle =
      generatedReport.type === "sales"
        ? "Laporan Penjualan"
        : "Laporan Pergerakan Stok";

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
          <title>${reportTitle}</title>

          <link
            rel="stylesheet"
            href="css/global.css"
          >
          <link
            rel="stylesheet"
            href="css/admin-print-report.css"
          >

          <style>
            @page {
              size: A4 landscape;
              margin: 12mm;
            }

            html,
            body {
              width: 100%;
              margin: 0;
              padding: 0;
              background: #ffffff;
            }

            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .print-report {
              box-sizing: border-box;
              display: block !important;
              width: 273mm;
              max-width: 273mm;
              margin: 0 auto;
              padding: 0;
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
                min-width: 0 !important;
                min-height: 0 !important;
              }

              .print-report {
                display: block !important;
                width: 273mm !important;
                max-width: 273mm !important;
                margin: 0 auto !important;
                padding: 0 !important;
              }

              .print-report-header,
              .print-report-meta,
              .print-report-summary,
              .print-report-footer {
                break-inside: avoid;
              }

              .print-report-table {
                width: 100% !important;
                break-inside: auto;
              }

              .print-report-table thead {
                display: table-header-group;
              }

              .print-report-table tfoot {
                display: table-row-group;
              }

              .print-report-table tr {
                break-inside: avoid;
                break-after: auto;
              }

              .print-report-table th,
              .print-report-table td {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>

        <body class="standalone-report-print">
          ${report.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();

    printWindow.addEventListener(
      "load",
      () => {
        /*
         * Allow the linked stylesheet to
         * finish rendering before print.
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
  } catch (error) {
    console.error(
      "Failed to print report:",
      error
    );

    if (note) {
      note.textContent =
        error.message ||
        "Gagal menyiapkan laporan cetak.";
    }

    if (!printWindow.closed) {
      printWindow.close();
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        "Cetak / Simpan PDF";
    }
  }
}
function setupReportsPage() {
  const refreshInvoiceAnalyticsButton = document.getElementById("refreshInvoiceAnalyticsBtn");
  const refreshStockAnalyticsButton = document.getElementById("reportRefreshStockAnalyticsBtn");
  const periodInput = document.getElementById("reportPeriodInput");
  const previewButton = document.getElementById("previewReportBtn");
const printButton =
  document.getElementById(
    "printReportButton"
  );
  const typeInput = document.getElementById("reportTypeInput");
const dailyInput =
  document.getElementById(
    "reportDailyInput"
  );

const weeklyInput =
  document.getElementById(
    "reportWeeklyInput"
  );

const monthlyInput =
  document.getElementById(
    "reportMonthlyInput"
  );

const customFromInput =
  document.getElementById(
    "reportCustomFromInput"
  );

const customToInput =
  document.getElementById(
    "reportCustomToInput"
  );

  if (
    refreshInvoiceAnalyticsButton &&
    !refreshInvoiceAnalyticsButton.dataset.reportsInvoiceAnalyticsBound
  ) {
    refreshInvoiceAnalyticsButton.dataset.reportsInvoiceAnalyticsBound = "true";
    refreshInvoiceAnalyticsButton.addEventListener("click", loadInvoiceAnalytics);
  }

  if (
    refreshStockAnalyticsButton &&
    !refreshStockAnalyticsButton.dataset.reportsStockAnalyticsBound
  ) {
    refreshStockAnalyticsButton.dataset.reportsStockAnalyticsBound = "true";
    refreshStockAnalyticsButton.addEventListener("click", loadReportStockAnalytics);
  }

if (
  periodInput &&
  !periodInput.dataset.reportPeriodBound
) {
  periodInput.dataset.reportPeriodBound =
    "true";

  periodInput.addEventListener(
    "change",
    () => {
      updateReportPeriodControls();
      invalidateGeneratedReport();
    }
  );

  initialiseReportPeriodControls();
}
if (
  typeInput &&
  !typeInput.dataset.reportTypeBound
) {
  typeInput.dataset.reportTypeBound =
    "true";

  typeInput.addEventListener(
    "change",
    async () => {
      invalidateGeneratedReport();

      await populateReportMonthOptions();
    }
  );
}
[
  dailyInput,
  weeklyInput,
  monthlyInput,
  customFromInput,
  customToInput
].forEach((input) => {
  if (
    !input ||
    input.dataset.reportFilterBound
  ) {
    return;
  }

  input.dataset.reportFilterBound =
    "true";

  input.addEventListener(
    "change",
    () => {
      if (input === weeklyInput) {
        updateReportWeeklyRangeNote();
      }

      invalidateGeneratedReport();
    }
  );
});

  if (previewButton && !previewButton.dataset.reportPreviewBound) {
    previewButton.dataset.reportPreviewBound = "true";
    previewButton.addEventListener("click", previewGeneratedReport);
  }

  if (printButton && !printButton.dataset.reportPrintBound) {
    printButton.dataset.reportPrintBound = "true";
    printButton.addEventListener("click", printGeneratedReport);
  }
}