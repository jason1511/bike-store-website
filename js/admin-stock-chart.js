function renderAdminStockMovementChart(
  movements = [],
  options = {}
) {
  const {
    targetId,
    width = 680,
    height = 220,
    paddingLeft = 42,
    paddingRight = 22,
    paddingTop = 44,
    paddingBottom = 34,
    labelCount = 6,
    summaryTargetId = "",
    subtitle =
      "Naik turun stok berdasarkan stock movement"
  } = options;

  const chart = document.getElementById(targetId);

  if (!chart) {
    return;
  }

  if (!Array.isArray(movements) || !movements.length) {
    chart.innerHTML = `
      <div class="admin-empty-state">
        Belum ada data grafik stok.
      </div>
    `;

    renderAdminStockPeriodSummary(
      [],
      summaryTargetId
    );

    return;
  }

  const data = movements.map((movement) => ({
    date: String(movement.date || "-"),
    stockIn: Math.max(
      0,
      Number(movement.stockIn || 0)
    ),
    sale: Math.max(
      0,
      Number(movement.sale || 0)
    ),
    adjustment: Number(
      movement.adjustment || 0
    ),
    netChange: Number(movement.netChange || 0)
  }));

  renderAdminStockPeriodSummary(
    data,
    summaryTargetId
  );

  const plotWidth =
    width - paddingLeft - paddingRight;

  const plotHeight =
    height - paddingTop - paddingBottom;

  const maxAbsValue = Math.max(
    1,
    ...data.flatMap((item) => [
      item.stockIn,
      item.sale,
      Math.abs(item.adjustment),
      Math.abs(item.netChange)
    ])
  );

  function getX(index) {
    return (
      paddingLeft +
      ((index + 0.5) / data.length) * plotWidth
    );
  }

  function getY(value) {
    const normalized =
      (value + maxAbsValue) /
      (maxAbsValue * 2);

    return (
      paddingTop +
      (1 - normalized) * plotHeight
    );
  }

  const zeroY = getY(0);

  const availableGroupWidth =
    plotWidth / Math.max(1, data.length);

  const barWidth = Math.max(
    4,
    Math.min(14, availableGroupWidth / 4.4)
  );

  function renderBar(
    value,
    x,
    className
  ) {
    if (value === 0) {
      return "";
    }

    const valueY = getY(value);
    const y = Math.min(valueY, zeroY);
    const barHeight = Math.max(
      1,
      Math.abs(zeroY - valueY)
    );

    return `
      <rect
        class="stock-chart-bar ${className}"
        x="${x}"
        y="${y}"
        width="${barWidth}"
        height="${barHeight}"
        rx="2"
      ></rect>
    `;
  }

  const points = data
    .map((item, index) => {
      return `${getX(index)},${getY(item.netChange)}`;
    })
    .join(" ");

  const movementMarkup = data
    .map((item, index) => {
      const x = getX(index);
      const y = getY(item.netChange);
      const tooltipText =
        `${item.date} | Masuk: +${item.stockIn} | ` +
        `Terjual: -${item.sale} | ` +
        `Adjustment: ${formatSignedStockValue(item.adjustment)} | ` +
        `Net: ${formatSignedStockValue(item.netChange)}`;

      return `
        <g
          class="stock-chart-day"
          tabindex="0"
          data-chart-tooltip="${escapeHtml(tooltipText)}"
          aria-label="${escapeHtml(tooltipText)}"
        >
          <title>${escapeHtml(tooltipText)}</title>

          ${renderBar(
            item.stockIn,
            x - (barWidth * 1.65),
            "is-stock-in"
          )}

          ${renderBar(
            -item.sale,
            x - (barWidth * 0.5),
            "is-sale"
          )}

          ${renderBar(
            item.adjustment,
            x + (barWidth * 0.65),
            "is-adjustment"
          )}

          <circle
            class="stock-chart-point"
            cx="${x}"
            cy="${y}"
            r="3.5"
          ></circle>
        </g>
      `;
    })
    .join("");

  const safeLabelCount = Math.max(
    1,
    Number(labelCount || 1)
  );

  const labelStep = Math.max(
    1,
    Math.ceil(data.length / safeLabelCount)
  );

  const labelMarkup = data
    .map((item, index) => {
      const isLastItem =
        index === data.length - 1;

      if (
        index % labelStep !== 0 &&
        !isLastItem
      ) {
        return "";
      }

      const dateLabel =
        item.date.length > 5
          ? item.date.slice(5)
          : item.date;

      return `
        <text
          class="stock-chart-label"
          x="${getX(index)}"
          y="${height - 10}"
          text-anchor="middle"
        >
          ${escapeHtml(dateLabel)}
        </text>
      `;
    })
    .join("");

  const gridValues = [
    maxAbsValue,
    Math.round(maxAbsValue / 2),
    0,
    -Math.round(maxAbsValue / 2),
    -maxAbsValue
  ].filter((value, index, values) => {
    return values.indexOf(value) === index;
  });

  const gridMarkup = gridValues.map((value) => {
    const y = getY(value);

    return `
      <line
        class="${
          value === 0
            ? "stock-chart-zero-line"
            : "stock-chart-grid-line"
        }"
        x1="${paddingLeft}"
        y1="${y}"
        x2="${width - paddingRight}"
        y2="${y}"
      ></line>
      <text
        class="stock-chart-grid-label"
        x="${paddingLeft - 9}"
        y="${y + 4}"
        text-anchor="end"
      >
        ${escapeHtml(formatSignedStockValue(value))}
      </text>
    `;
  }).join("");

  chart.innerHTML = `
    <svg
      viewBox="0 0 ${width} ${height}"
      style="min-width: ${width}px"
      role="img"
      aria-label="Grafik pergerakan stok"
    >
      <text
        class="stock-chart-title"
        x="${paddingLeft}"
        y="18"
      >
        Pergerakan Stok
      </text>

      <text
        class="stock-chart-subtitle"
        x="${paddingLeft}"
        y="${paddingTop - 16}"
      >
        ${escapeHtml(subtitle)}
      </text>

      <line
        class="stock-chart-axis"
        x1="${paddingLeft}"
        y1="${paddingTop}"
        x2="${paddingLeft}"
        y2="${height - paddingBottom}"
      ></line>

      ${gridMarkup}

      <line
        class="stock-chart-axis"
        x1="${paddingLeft}"
        y1="${height - paddingBottom}"
        x2="${width - paddingRight}"
        y2="${height - paddingBottom}"
      ></line>

      <polyline
        class="stock-chart-line"
        points="${points}"
      ></polyline>

      ${movementMarkup}
      ${labelMarkup}
    </svg>
  `;

  setupAdminChartTooltips(chart);
}

function setupAdminChartTooltips(container) {
  if (
    !container?.querySelectorAll ||
    typeof document.createElement !== "function"
  ) {
    return;
  }

  const tooltip = document.createElement("div");

  tooltip.className = "admin-chart-tooltip";
  tooltip.setAttribute("role", "tooltip");
  container.append(tooltip);

  function hideTooltip() {
    tooltip.classList.remove("is-visible");
  }

  function showTooltip(target, event) {
    const text = target.getAttribute(
      "data-chart-tooltip"
    );

    if (!text) {
      return;
    }

    const containerRect =
      container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const clientX = event?.clientX ||
      targetRect.left + targetRect.width / 2;
    const clientY = event?.clientY || targetRect.top;
    const minimumLeft = container.scrollLeft + 12;
    const maximumLeft =
      container.scrollLeft + container.clientWidth - 12;
    const left = Math.min(
      maximumLeft,
      Math.max(
        minimumLeft,
        clientX - containerRect.left +
          container.scrollLeft
      )
    );
    const top = Math.max(
      18,
      clientY - containerRect.top +
        container.scrollTop - 10
    );

    tooltip.textContent = text;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.classList.add("is-visible");
  }

  container.querySelectorAll(
    "[data-chart-tooltip]"
  ).forEach((target) => {
    target.addEventListener(
      "pointerenter",
      (event) => showTooltip(target, event)
    );
    target.addEventListener(
      "pointermove",
      (event) => showTooltip(target, event)
    );
    target.addEventListener(
      "pointerleave",
      hideTooltip
    );
    target.addEventListener(
      "focus",
      () => showTooltip(target)
    );
    target.addEventListener("blur", hideTooltip);
    target.addEventListener(
      "click",
      (event) => showTooltip(target, event)
    );
  });

  container.onscroll = hideTooltip;
}

function formatSignedStockValue(value) {
  const number = Number(value || 0);
  const absoluteText = Math.abs(number).toLocaleString(
    "id-ID"
  );

  return number > 0
    ? `+${absoluteText}`
    : number < 0
      ? `-${absoluteText}`
      : "0";
}

function renderAdminStockPeriodSummary(
  movements = [],
  targetId = ""
) {
  if (!targetId) {
    return;
  }

  const container = document.getElementById(
    targetId
  );

  if (!container) {
    return;
  }

  const totals = movements.reduce(
    (result, movement) => {
      result.stockIn += Number(
        movement.stockIn || 0
      );
      result.sale += Number(
        movement.sale || 0
      );
      result.adjustment += Number(
        movement.adjustment || 0
      );
      result.net += Number(
        movement.netChange || 0
      );

      return result;
    },
    {
      stockIn: 0,
      sale: 0,
      adjustment: 0,
      net: 0
    }
  );

  const values = {
    in: `+${totals.stockIn.toLocaleString("id-ID")}`,
    sale: `-${totals.sale.toLocaleString("id-ID")}`,
    adjustment: formatSignedStockValue(
      totals.adjustment
    ),
    net: formatSignedStockValue(totals.net)
  };

  Object.entries(values).forEach(([key, value]) => {
    const element = container.querySelector(
      `[data-stock-period="${key}"]`
    );

    if (!element) {
      return;
    }

    element.textContent = value;

    if (["adjustment", "net"].includes(key)) {
      const numericValue = key === "net"
        ? totals.net
        : totals.adjustment;

      element.classList.toggle(
        "is-positive",
        numericValue > 0
      );
      element.classList.toggle(
        "is-negative",
        numericValue < 0
      );
    }
  });
}
function renderAdminStockMovementList(
  movements = [],
  targetId
) {
  const list = document.getElementById(targetId);

  if (!list) {
    return;
  }

  if (!Array.isArray(movements) || !movements.length) {
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
      const netChange = Number(
        movement.netChange || 0
      );

      const netClass = netChange >= 0
        ? "is-positive"
        : "is-negative";

      const netText = formatSignedStockValue(
        netChange
      );

      return `
        <article class="admin-stock-movement-row">
          <div>
            <strong>
              ${escapeHtml(movement.date || "-")}
            </strong>
            <span>Periode</span>
          </div>

          <div>
            <strong>
              +${Number(
                movement.stockIn || 0
              ).toLocaleString("id-ID")}
            </strong>
            <span>Masuk</span>
          </div>

          <div>
            <strong>
              -${Number(
                movement.sale || 0
              ).toLocaleString("id-ID")}
            </strong>
            <span>Terjual</span>
          </div>

          <div>
            <strong>
              ${formatSignedStockValue(
                movement.adjustment
              )}
            </strong>
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
function renderAdminStockSummary(
  summary = {},
  targetIds = {}
) {
  const values = {
    totalStock: Number(summary.totalStock || 0),
    activeBikes: Number(summary.activeBikes || 0),
    lowStock: Number(summary.lowStockBikes || 0),
    outOfStock: Number(summary.outOfStockBikes || 0)
  };

  Object.entries(targetIds).forEach(
    ([summaryKey, targetId]) => {
      const element = document.getElementById(
        targetId
      );

      if (!element || !(summaryKey in values)) {
        return;
      }

      element.textContent = values[
        summaryKey
      ].toLocaleString("id-ID");
    }
  );
}
