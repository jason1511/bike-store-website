/* =========================
   ADMIN INVOICE ANALYTICS
========================= */
let invoiceAnalyticsChartState = {
  dailySales: [],
  metric: "revenue",
  granularity: "day",
  rangeDays: 14
};

function getInvoiceAnalyticsRangeDays() {
  const value = Number(
    document.getElementById(
      "reportsAnalyticsRangeInput"
    )?.value || 14
  );

  return [14, 30, 90, 365].includes(value)
    ? value
    : 14;
}

async function fetchInvoiceAnalytics(days = 14) {
  return fetchAdminJson(
    `/api/admin/analytics/invoices?days=${encodeURIComponent(days)}`,
    { method: "GET" }
  );
}

function renderInvoiceAnalyticsSummary(
  summary = {},
  hasCostData = false
) {
  const revenue = document.getElementById(
    "invoiceAnalyticsRevenue"
  );
  const unitsSold = document.getElementById(
    "invoiceAnalyticsUnitsSold"
  );
  const activeInvoices = document.getElementById(
    "invoiceAnalyticsActiveInvoices"
  );
  const grossProfit = document.getElementById(
    "invoiceAnalyticsGrossProfit"
  );
  const profitNote = document.getElementById(
    "invoiceAnalyticsProfitNote"
  );

  if (revenue) {
    revenue.textContent = formatRupiah(
      summary.revenue || 0
    );
  }

  if (unitsSold) {
    unitsSold.textContent = Number(
      summary.unitsSold || 0
    ).toLocaleString("id-ID");
  }

  if (activeInvoices) {
    activeInvoices.textContent = Number(
      summary.activeInvoices || 0
    ).toLocaleString("id-ID");
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

function getInvoiceChartMetricConfig(metric) {
  const configs = {
    revenue: {
      label: "Omzet Bersih",
      key: "netRevenue",
      className: "is-revenue",
      format: (value) => formatRupiah(value),
      axisFormat: formatCompactRupiah
    },
    units: {
      label: "Unit Terjual",
      key: "unitsSold",
      className: "is-units",
      format: (value) => `${Number(value).toLocaleString("id-ID")} unit`,
      axisFormat: (value) => Number(value).toLocaleString("id-ID")
    },
    invoices: {
      label: "Invoice Aktif",
      key: "invoicesCreated",
      className: "is-invoices",
      format: (value) => `${Number(value).toLocaleString("id-ID")} invoice`,
      axisFormat: (value) => Number(value).toLocaleString("id-ID")
    }
  };

  return configs[metric] || configs.revenue;
}

function formatCompactRupiah(value) {
  const number = Number(value || 0);
  const absolute = Math.abs(number);

  if (absolute >= 1_000_000_000) {
    return `Rp ${(number / 1_000_000_000).toLocaleString(
      "id-ID",
      { maximumFractionDigits: 1 }
    )} M`;
  }

  if (absolute >= 1_000_000) {
    return `Rp ${(number / 1_000_000).toLocaleString(
      "id-ID",
      { maximumFractionDigits: 1 }
    )} jt`;
  }

  if (absolute >= 1_000) {
    return `Rp ${(number / 1_000).toLocaleString(
      "id-ID",
      { maximumFractionDigits: 1 }
    )} rb`;
  }

  return `Rp ${number.toLocaleString("id-ID")}`;
}

function getAnalyticsGranularityLabel(granularity) {
  if (granularity === "month") {
    return "bulan";
  }

  if (granularity === "week") {
    return "minggu";
  }

  return "hari";
}

function getAnalyticsRangeLabel(days) {
  return days === 365
    ? "12 bulan terakhir"
    : `${days} hari terakhir`;
}

function formatAnalyticsDateLabel(value, granularity) {
  const text = String(value || "-");

  if (granularity === "month") {
    return text;
  }

  return text.length > 5
    ? text.slice(5)
    : text;
}

function renderInvoiceAnalyticsChart(
  dailySales = [],
  options = {}
) {
  const chart = document.getElementById(
    "invoiceAnalyticsChart"
  );

  if (!chart) {
    return;
  }

  const metric = options.metric ||
    invoiceAnalyticsChartState.metric;
  const granularity = options.granularity ||
    invoiceAnalyticsChartState.granularity;
  const rangeDays = Number(
    options.rangeDays ||
    invoiceAnalyticsChartState.rangeDays ||
    14
  );
  const config = getInvoiceChartMetricConfig(metric);

  if (!Array.isArray(dailySales) || !dailySales.length) {
    chart.innerHTML = `
      <div class="admin-empty-state">
        Belum ada data ${escapeHtml(
          config.label.toLowerCase()
        )} pada periode ini.
      </div>
    `;
    return;
  }

  const data = dailySales.map((day) => ({
    date: String(day.date || "-"),
    netRevenue: Number(
      day.netRevenue ?? day.revenue ?? 0
    ),
    voidedRevenue: Number(day.voidedRevenue || 0),
    unitsSold: Number(day.unitsSold || 0),
    invoicesCreated: Number(
      day.invoicesCreated || 0
    ),
    invoicesVoided: Number(
      day.invoicesVoided || 0
    )
  }));

  const width = Math.max(
    760,
    110 + data.length * 58
  );
  const height = 300;
  const paddingLeft = 78;
  const paddingRight = 24;
  const paddingTop = 55;
  const paddingBottom = 46;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const maxValue = Math.max(
    1,
    ...data.map((item) => Number(item[config.key] || 0))
  );
  const slotWidth = plotWidth / data.length;
  const barWidth = Math.max(
    8,
    Math.min(38, slotWidth * 0.56)
  );

  const getX = (index) => {
    return paddingLeft + slotWidth * (index + 0.5);
  };

  const getY = (value) => {
    return paddingTop +
      (1 - Number(value || 0) / maxValue) * plotHeight;
  };

  const gridValues = [1, 0.75, 0.5, 0.25, 0]
    .map((ratio) => Math.round(maxValue * ratio))
    .filter((value, index, values) => {
      return values.indexOf(value) === index;
    });

  const gridMarkup = gridValues.map((value) => {
    const y = getY(value);

    return `
      <line
        class="invoice-chart-grid-line"
        x1="${paddingLeft}"
        y1="${y}"
        x2="${width - paddingRight}"
        y2="${y}"
      ></line>
      <text
        class="invoice-chart-grid-label"
        x="${paddingLeft - 10}"
        y="${y + 4}"
        text-anchor="end"
      >
        ${escapeHtml(config.axisFormat(value))}
      </text>
    `;
  }).join("");

  const bars = data.map((item, index) => {
    const value = Number(item[config.key] || 0);
    const x = getX(index) - barWidth / 2;
    const y = getY(value);
    const barHeight = Math.max(
      2,
      height - paddingBottom - y
    );
    const barY = value > 0
      ? y
      : height - paddingBottom - 2;
    const tooltip = [
      item.date,
      `${config.label}: ${config.format(value)}`,
      `Void: ${formatRupiah(item.voidedRevenue)}`,
      `Invoice dibatalkan: ${item.invoicesVoided}`
    ].join(" | ");

    return `
      <rect
        class="invoice-chart-bar ${config.className}"
        x="${x}"
        y="${barY}"
        width="${barWidth}"
        height="${barHeight}"
        rx="4"
        tabindex="0"
        data-chart-tooltip="${escapeHtml(tooltip)}"
        aria-label="${escapeHtml(tooltip)}"
      >
        <title>${escapeHtml(tooltip)}</title>
      </rect>
    `;
  }).join("");

  const labelStep = Math.max(
    1,
    Math.ceil(data.length / 8)
  );
  const labelMarkup = data.map((item, index) => {
    if (
      index % labelStep !== 0 &&
      index !== data.length - 1
    ) {
      return "";
    }

    return `
      <text
        class="invoice-chart-label"
        x="${getX(index)}"
        y="${height - 13}"
        text-anchor="middle"
      >
        ${escapeHtml(
          formatAnalyticsDateLabel(
            item.date,
            granularity
          )
        )}
      </text>
    `;
  }).join("");

  chart.innerHTML = `
    <svg
      viewBox="0 0 ${width} ${height}"
      style="min-width: ${width}px"
      role="img"
      aria-label="Grafik ${escapeHtml(
        config.label.toLowerCase()
      )} per ${escapeHtml(
        getAnalyticsGranularityLabel(granularity)
      )}"
    >
      <text
        class="invoice-chart-title"
        x="${paddingLeft}"
        y="20"
      >
        ${escapeHtml(config.label)}
      </text>
      <text
        class="invoice-chart-subtitle"
        x="${paddingLeft}"
        y="39"
      >
        Per ${escapeHtml(
          getAnalyticsGranularityLabel(granularity)
        )} - ${escapeHtml(
          getAnalyticsRangeLabel(rangeDays)
        )}
      </text>

      ${gridMarkup}

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

      ${bars}
      ${labelMarkup}
    </svg>
  `;

  if (typeof setupAdminChartTooltips === "function") {
    setupAdminChartTooltips(chart);
  }
}

function updateInvoiceAnalyticsChartDescription() {
  const element = document.getElementById(
    "invoiceAnalyticsChartDescription"
  );

  if (!element) {
    return;
  }

  const config = getInvoiceChartMetricConfig(
    invoiceAnalyticsChartState.metric
  );

  element.textContent =
    `${config.label} per ${getAnalyticsGranularityLabel(
      invoiceAnalyticsChartState.granularity
    )} dalam ${getAnalyticsRangeLabel(
      invoiceAnalyticsChartState.rangeDays
    )}.`;
}

function setInvoiceAnalyticsChartMetric(metric) {
  const allowedMetrics = [
    "revenue",
    "units",
    "invoices"
  ];

  invoiceAnalyticsChartState.metric =
    allowedMetrics.includes(metric)
      ? metric
      : "revenue";

  document.querySelectorAll(
    "[data-invoice-chart-metric]"
  ).forEach((button) => {
    const isActive =
      button.dataset.invoiceChartMetric ===
      invoiceAnalyticsChartState.metric;

    button.classList.toggle("is-active", isActive);
    button.setAttribute(
      "aria-pressed",
      String(isActive)
    );
  });

  updateInvoiceAnalyticsChartDescription();

  renderInvoiceAnalyticsChart(
    invoiceAnalyticsChartState.dailySales,
    invoiceAnalyticsChartState
  );
}

function setupInvoiceAnalyticsMetricSwitch() {
  document.querySelectorAll(
    "[data-invoice-chart-metric]"
  ).forEach((button) => {
    if (button.dataset.invoiceChartMetricBound) {
      return;
    }

    button.dataset.invoiceChartMetricBound = "true";
    button.addEventListener("click", () => {
      setInvoiceAnalyticsChartMetric(
        button.dataset.invoiceChartMetric
      );
    });
  });
}

async function loadInvoiceAnalytics() {
  const chart = document.getElementById(
    "invoiceAnalyticsChart"
  );
  const rangeDays = getInvoiceAnalyticsRangeDays();

  if (chart) {
    chart.innerHTML = `
      <div class="admin-empty-state">
        Memuat analitik invoice...
      </div>
    `;
  }

  try {
    const data = await fetchInvoiceAnalytics(rangeDays);

    invoiceAnalyticsChartState = {
      ...invoiceAnalyticsChartState,
      dailySales: data.dailySales || [],
      granularity: data.granularity || "day",
      rangeDays: Number(data.rangeDays || rangeDays)
    };

    renderInvoiceAnalyticsSummary(
      data.summary || {},
      Boolean(data.hasCostData)
    );
    setupInvoiceAnalyticsMetricSwitch();
    updateInvoiceAnalyticsChartDescription();
    renderInvoiceAnalyticsChart(
      invoiceAnalyticsChartState.dailySales,
      invoiceAnalyticsChartState
    );
  } catch (error) {
    if (handleAdminAuthError(error)) {
      return;
    }

    console.error(
      "Failed to load invoice analytics:",
      error
    );

    if (chart) {
      chart.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(
            error.message ||
            "Gagal memuat analitik invoice."
          )}
        </div>
      `;
    }
  }
}
