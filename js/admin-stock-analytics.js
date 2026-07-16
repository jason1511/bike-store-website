/* =========================
   STOCK ANALYTICS API
========================= */
async function fetchStockAnalytics() {
  return fetchAdminJson(
    "/api/admin/analytics/stock",
    {
      method: "GET"
    }
  );
}

/* =========================
   BIKES VIEW RENDERERS
========================= */
function renderStockAnalyticsSummary(summary = {}) {
  renderAdminStockSummary(
    summary,
    {
      totalStock: "stockAnalyticsTotalStock",
      activeBikes: "stockAnalyticsActiveBikes",
      lowStock: "stockAnalyticsLowStock",
      outOfStock: "stockAnalyticsOutOfStock"
    }
  );
}

function renderStockMovementChart(movements = []) {
  renderAdminStockMovementChart(
    movements,
    {
      targetId: "stockAnalyticsMovementChart",
      width: 680,
      height: 220,
      paddingLeft: 42,
      paddingRight: 22,
      paddingTop: 44,
      paddingBottom: 34,
      labelCount: 6,
      subtitle:
        "Naik turun stok berdasarkan stock movement"
    }
  );
}

function renderStockMovementList(movements = []) {
  renderAdminStockMovementList(
    movements,
    "stockAnalyticsMovementList"
  );
}

/* =========================
   BIKES VIEW LOADER
========================= */
async function loadStockAnalytics() {
  const movementList = document.getElementById(
    "stockAnalyticsMovementList"
  );

  const movementChart = document.getElementById(
    "stockAnalyticsMovementChart"
  );

  if (movementList) {
    movementList.innerHTML = `
      <div class="admin-empty-state">
        Memuat statistik stok...
      </div>
    `;
  }

  if (movementChart) {
    movementChart.innerHTML = `
      <div class="admin-empty-state">
        Memuat grafik stok...
      </div>
    `;
  }

  try {
    const data = await fetchStockAnalytics();
    const movements = data.dailyMovements || [];

    renderStockAnalyticsSummary(
      data.summary || {}
    );

    renderStockMovementChart(movements);
    renderStockMovementList(movements);
  } catch (error) {
    if (handleAdminAuthError(error)) {
      return;
    }

    console.error(
      "Failed to load stock analytics:",
      error
    );

    const errorMessage = escapeHtml(
      error.message ||
      "Gagal memuat statistik stok."
    );

    if (movementList) {
      movementList.innerHTML = `
        <div class="admin-empty-state is-error">
          ${errorMessage}
        </div>
      `;
    }

    if (movementChart) {
      movementChart.innerHTML = `
        <div class="admin-empty-state is-error">
          ${errorMessage}
        </div>
      `;
    }
  }
}