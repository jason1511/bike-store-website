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

async function loadReportsPage() {
  const tasks = [];

  if (typeof loadInvoiceAnalytics === "function") {
    tasks.push(loadInvoiceAnalytics());
  }

  tasks.push(loadReportStockAnalytics());

  await Promise.allSettled(tasks);
}

function setupReportsPage() {
  const refreshInvoiceAnalyticsButton = document.getElementById("refreshInvoiceAnalyticsBtn");
  const refreshStockAnalyticsButton = document.getElementById("reportRefreshStockAnalyticsBtn");

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
}