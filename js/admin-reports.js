/* =========================
   ADMIN REPORTS
========================= */
function renderReportStockAnalyticsSummary(summary = {}) {
  const totalStock = document.getElementById("reportStockAnalyticsTotalStock");
  const activeBikes = document.getElementById("reportStockAnalyticsActiveBikes");
  const lowStock = document.getElementById("reportStockAnalyticsLowStock");
  const outOfStock = document.getElementById("reportStockAnalyticsOutOfStock");

  if (totalStock) {
    totalStock.textContent = Number(summary.totalStock || 0).toLocaleString("id-ID");
  }

  if (activeBikes) {
    activeBikes.textContent = Number(summary.activeBikes || 0).toLocaleString("id-ID");
  }

  if (lowStock) {
    lowStock.textContent = Number(summary.lowStockBikes || 0).toLocaleString("id-ID");
  }

  if (outOfStock) {
    outOfStock.textContent = Number(summary.outOfStockBikes || 0).toLocaleString("id-ID");
  }
}

function renderReportStockMovementList(movements = []) {
  const list = document.getElementById("reportStockAnalyticsMovementList");

  if (!list) {
    return;
  }

  if (!movements.length) {
    list.innerHTML = `
      <div class="admin-empty-state">
        Belum ada pergerakan stok.
      </div>
    `;
    return;
  }

  list.innerHTML = movements
    .slice()
    .reverse()
    .map((movement) => {
      const netChange = Number(movement.netChange || 0);
      const netClass = netChange >= 0 ? "is-positive" : "is-negative";
      const netText = netChange > 0 ? `+${netChange}` : String(netChange);

      return `
        <article class="admin-stock-movement-row">
          <div>
            <strong>${escapeHtml(movement.date || "-")}</strong>
            <span>Tanggal</span>
          </div>

          <div>
            <strong>+${Number(movement.stockIn || 0)}</strong>
            <span>Masuk</span>
          </div>

          <div>
            <strong>-${Number(movement.sale || 0)}</strong>
            <span>Terjual</span>
          </div>

          <div>
            <strong>${Number(movement.adjustment || 0)}</strong>
            <span>Adjustment</span>
          </div>

          <div class="${netClass}">
            <strong>${netText}</strong>
            <span>Net</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderReportStockMovementChart(movements = []) {
  const chart = document.getElementById("reportStockAnalyticsMovementChart");

  if (!chart) {
    return;
  }

  if (!movements.length) {
    chart.innerHTML = `
      <div class="admin-empty-state">
        Belum ada data grafik stok.
      </div>
    `;
    return;
  }

  const data = movements.map((movement) => ({
    date: movement.date || "-",
    netChange: Number(movement.netChange || 0)
  }));

  const width = 760;
  const height = 260;
  const paddingLeft = 54;
  const paddingRight = 24;
  const paddingTop = 52;
  const paddingBottom = 38;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const maxAbsValue = Math.max(
    1,
    ...data.map((item) => Math.abs(item.netChange))
  );

  const getX = (index) => {
    if (data.length === 1) {
      return paddingLeft + plotWidth / 2;
    }

    return paddingLeft + (index / (data.length - 1)) * plotWidth;
  };

  const getY = (value) => {
    const normalized = (value + maxAbsValue) / (maxAbsValue * 2);
    return paddingTop + (1 - normalized) * plotHeight;
  };

  const zeroY = getY(0);

  const points = data
    .map((item, index) => `${getX(index)},${getY(item.netChange)}`)
    .join(" ");

  const areaPoints = [
    `${getX(0)},${zeroY}`,
    points,
    `${getX(data.length - 1)},${zeroY}`
  ].join(" ");

  const pointMarkup = data
    .map((item, index) => {
      const x = getX(index);
      const y = getY(item.netChange);
      const valueText = item.netChange > 0
        ? `+${item.netChange}`
        : String(item.netChange);

      return `
        <g>
          <circle
            class="stock-chart-point"
            cx="${x}"
            cy="${y}"
            r="4"
          ></circle>

          <text
            class="stock-chart-value"
            x="${x}"
            y="${y - 10}"
            text-anchor="middle"
          >
            ${escapeHtml(valueText)}
          </text>
        </g>
      `;
    })
    .join("");

  const labelStep = Math.max(1, Math.ceil(data.length / 7));

  const labelMarkup = data
    .map((item, index) => {
      if (index % labelStep !== 0 && index !== data.length - 1) {
        return "";
      }

      return `
        <text
          class="stock-chart-label"
          x="${getX(index)}"
          y="${height - 10}"
          text-anchor="middle"
        >
          ${escapeHtml(item.date.slice(5) || item.date)}
        </text>
      `;
    })
    .join("");

  chart.innerHTML = `
    <svg
      viewBox="0 0 ${width} ${height}"
      role="img"
      aria-label="Grafik pergerakan stok harian"
    >
      <text class="stock-chart-title" x="${paddingLeft}" y="18">
        Net Change Stok Harian
      </text>

      <text class="stock-chart-subtitle" x="${paddingLeft}" y="36">
        Positif berarti stok naik, negatif berarti stok berkurang
      </text>

      <line
        class="stock-chart-axis"
        x1="${paddingLeft}"
        y1="${paddingTop}"
        x2="${paddingLeft}"
        y2="${height - paddingBottom}"
      ></line>

      <line
        class="stock-chart-axis"
        x1="${paddingLeft}"
        y1="${height - paddingBottom}"
        x2="${width - paddingRight}"
        y2="${height - paddingBottom}"
      ></line>

      <line
        class="stock-chart-zero-line"
        x1="${paddingLeft}"
        y1="${zeroY}"
        x2="${width - paddingRight}"
        y2="${zeroY}"
      ></line>

      <text
        class="stock-chart-label"
        x="${paddingLeft - 10}"
        y="${zeroY + 4}"
        text-anchor="end"
      >
        0
      </text>

      <polygon
        class="stock-chart-area"
        points="${areaPoints}"
      ></polygon>

      <polyline
        class="stock-chart-line"
        points="${points}"
      ></polyline>

      ${pointMarkup}
      ${labelMarkup}
    </svg>
  `;
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