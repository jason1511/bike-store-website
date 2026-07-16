/* =========================
   ADMIN INVOICE ANALYTICS
========================= */
async function fetchInvoiceAnalytics() {
  const data = await fetchAdminJson("/api/admin/analytics/invoices", {
    method: "GET"
  });

  return data;
}
function renderInvoiceAnalyticsSummary(summary = {}, hasCostData = false) {
  const revenue = document.getElementById("invoiceAnalyticsRevenue");
  const unitsSold = document.getElementById("invoiceAnalyticsUnitsSold");
  const activeInvoices = document.getElementById("invoiceAnalyticsActiveInvoices");
  const grossProfit = document.getElementById("invoiceAnalyticsGrossProfit");
  const profitNote = document.getElementById("invoiceAnalyticsProfitNote");

  if (revenue) {
    revenue.textContent = formatRupiah(summary.revenue || 0);
  }

  if (unitsSold) {
    unitsSold.textContent = Number(summary.unitsSold || 0).toLocaleString("id-ID");
  }

  if (activeInvoices) {
    activeInvoices.textContent = Number(summary.activeInvoices || 0).toLocaleString("id-ID");
  }

  if (grossProfit) {
    grossProfit.textContent = hasCostData
      ? formatRupiah(summary.grossProfit || 0)
      : "-";
  }

  if (profitNote) {
    profitNote.textContent = hasCostData
      ? "Omzet dikurangi modal"
      : "Butuh data modal/unit cost";
  }
}
function renderInvoiceAnalyticsChart(dailySales = [], hasCostData = false) {
  const chart = document.getElementById("invoiceAnalyticsChart");

  if (!chart) {
    return;
  }

  if (!dailySales.length) {
    chart.innerHTML = `
      <div class="admin-empty-state">
        Belum ada data penjualan harian.
      </div>
    `;
    return;
  }

  const data = dailySales.map((day) => ({
    date: day.date || "-",
    revenue: Number(day.grossRevenue || day.revenue || 0),
    voidedRevenue: Number(day.voidedRevenue || 0),
    netRevenue: Number(day.netRevenue || day.revenue || 0),
    grossProfit: hasCostData ? Number(day.grossProfit || 0) : null
  }));

  const width = 760;
  const height = 280;
  const paddingLeft = 72;
  const paddingRight = 28;
  const paddingTop = 58;
  const paddingBottom = 40;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const allValues = data.flatMap((item) => {
    const values = [
      item.revenue,
      item.netRevenue,
      -item.voidedRevenue
    ];

    if (hasCostData) {
      values.push(item.grossProfit);
    }

    return values;
  });

  const minValue = Math.min(0, ...allValues);
  const maxValue = Math.max(1, ...allValues);
  const valueRange = Math.max(1, maxValue - minValue);

  const getX = (index) => {
    if (data.length === 1) {
      return paddingLeft + plotWidth / 2;
    }

    return paddingLeft + (index / (data.length - 1)) * plotWidth;
  };

  const getY = (value) => {
    const normalized = (value - minValue) / valueRange;
    return paddingTop + (1 - normalized) * plotHeight;
  };

  const zeroY = getY(0);

  const getPoints = (valueGetter) => {
    return data
      .map((item, index) => `${getX(index)},${getY(valueGetter(item))}`)
      .join(" ");
  };

  const revenuePoints = getPoints((item) => item.revenue);
  const netRevenuePoints = getPoints((item) => item.netRevenue);
  const voidedPoints = getPoints((item) => -item.voidedRevenue);

  const profitPoints = hasCostData
    ? getPoints((item) => item.grossProfit)
    : "";

  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  const labelMarkup = data
    .map((item, index) => {
      if (index % labelStep !== 0 && index !== data.length - 1) {
        return "";
      }

      return `
        <text
          class="invoice-chart-label"
          x="${getX(index)}"
          y="${height - 10}"
          text-anchor="middle"
        >
          ${escapeHtml(item.date.slice(5) || item.date)}
        </text>
      `;
    })
    .join("");

  const revenuePointMarkup = data
    .map((item, index) => `
      <circle
        class="invoice-chart-point is-revenue"
        cx="${getX(index)}"
        cy="${getY(item.revenue)}"
        r="4"
      ></circle>
    `)
    .join("");

  const netPointMarkup = data
    .map((item, index) => `
      <circle
        class="invoice-chart-point is-net"
        cx="${getX(index)}"
        cy="${getY(item.netRevenue)}"
        r="4"
      ></circle>
    `)
    .join("");

  const voidedPointMarkup = data
    .filter((item) => Number(item.voidedRevenue || 0) > 0)
    .map((item, index) => {
      const originalIndex = data.indexOf(item);

      return `
        <circle
          class="invoice-chart-point is-voided"
          cx="${getX(originalIndex)}"
          cy="${getY(-item.voidedRevenue)}"
          r="4"
        ></circle>
      `;
    })
    .join("");

  const profitPointMarkup = hasCostData
    ? data
      .map((item, index) => `
        <circle
          class="invoice-chart-point is-profit"
          cx="${getX(index)}"
          cy="${getY(item.grossProfit)}"
          r="4"
        ></circle>
      `)
      .join("")
    : "";

  chart.innerHTML = `
    <svg
      viewBox="0 0 ${width} ${height}"
      role="img"
      aria-label="Grafik omzet, net omzet, void, dan profit penjualan harian"
    >
      <text class="invoice-chart-title" x="${paddingLeft}" y="18">
        Omzet Harian
      </text>

      <text class="invoice-chart-subtitle" x="${paddingLeft}" y="36">
        ${hasCostData
          ? "Omzet, net omzet, void, dan profit/loss harian"
          : "Omzet, net omzet, dan void harian. Profit/loss butuh data modal."}
      </text>

      <line
        class="invoice-chart-axis"
        x1="${paddingLeft}"
        y1="${paddingTop}"
        x2="${paddingLeft}"
        y2="${height - paddingBottom}"
      ></line>

      <line
        class="invoice-chart-axis"
        x1="${paddingLeft}"
        y1="${height - paddingBottom}"
        x2="${width - paddingRight}"
        y2="${height - paddingBottom}"
      ></line>

      <line
        class="invoice-chart-grid-line"
        x1="${paddingLeft}"
        y1="${paddingTop}"
        x2="${width - paddingRight}"
        y2="${paddingTop}"
      ></line>

      <line
        class="invoice-chart-grid-line"
        x1="${paddingLeft}"
        y1="${zeroY}"
        x2="${width - paddingRight}"
        y2="${zeroY}"
      ></line>

      <text
        class="invoice-chart-label"
        x="${paddingLeft - 10}"
        y="${paddingTop + 4}"
        text-anchor="end"
      >
        ${escapeHtml(formatRupiah(maxValue))}
      </text>

      <text
        class="invoice-chart-label"
        x="${paddingLeft - 10}"
        y="${zeroY + 4}"
        text-anchor="end"
      >
        Rp 0
      </text>

      ${
        minValue < 0
          ? `
            <text
              class="invoice-chart-label"
              x="${paddingLeft - 10}"
              y="${height - paddingBottom + 4}"
              text-anchor="end"
            >
              ${escapeHtml(formatRupiah(minValue))}
            </text>
          `
          : ""
      }

      <polyline
        class="invoice-chart-revenue-line"
        points="${revenuePoints}"
      ></polyline>

      <polyline
        class="invoice-chart-net-line"
        points="${netRevenuePoints}"
      ></polyline>

      <polyline
        class="invoice-chart-voided-line"
        points="${voidedPoints}"
      ></polyline>

      ${
        hasCostData
          ? `
            <polyline
              class="invoice-chart-profit-line"
              points="${profitPoints}"
            ></polyline>
          `
          : ""
      }

      ${revenuePointMarkup}
      ${netPointMarkup}
      ${voidedPointMarkup}
      ${profitPointMarkup}
      ${labelMarkup}

      <text class="invoice-chart-legend" x="${width - 340}" y="22">
        ● Omzet
      </text>

      <text class="invoice-chart-legend" x="${width - 250}" y="22">
        ● Net
      </text>

      <text class="invoice-chart-legend" x="${width - 180}" y="22">
        ● Void
      </text>

      ${
        hasCostData
          ? `<text class="invoice-chart-legend" x="${width - 110}" y="22">● Profit</text>`
          : ""
      }
    </svg>
  `;
}
async function loadInvoiceAnalytics() {
  const chart = document.getElementById("invoiceAnalyticsChart");

  if (chart) {
    chart.innerHTML = `
      <div class="admin-empty-state">
        Memuat analitik invoice...
      </div>
    `;
  }

  try {
    const data = await fetchInvoiceAnalytics();

    renderInvoiceAnalyticsSummary(data.summary || {}, Boolean(data.hasCostData));
    renderInvoiceAnalyticsChart(data.dailySales || [], Boolean(data.hasCostData));
  } catch (error) {
    if (handleAdminAuthError(error)) {
      return;
    }

    console.error("Failed to load invoice analytics:", error);

    if (chart) {
      chart.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(error.message || "Gagal memuat analitik invoice.")}
        </div>
      `;
    }
  }
}