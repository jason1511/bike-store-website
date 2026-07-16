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
    return;
  }

  const data = movements.map((movement) => ({
    date: String(movement.date || "-"),
    netChange: Number(movement.netChange || 0)
  }));

  const plotWidth =
    width - paddingLeft - paddingRight;

  const plotHeight =
    height - paddingTop - paddingBottom;

  const maxAbsValue = Math.max(
    1,
    ...data.map((item) => {
      return Math.abs(item.netChange);
    })
  );

  function getX(index) {
    if (data.length === 1) {
      return paddingLeft + plotWidth / 2;
    }

    return (
      paddingLeft +
      (index / (data.length - 1)) * plotWidth
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

  const points = data
    .map((item, index) => {
      return `${getX(index)},${getY(item.netChange)}`;
    })
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

  chart.innerHTML = `
    <svg
      viewBox="0 0 ${width} ${height}"
      role="img"
      aria-label="Grafik pergerakan stok harian"
    >
      <text
        class="stock-chart-title"
        x="${paddingLeft}"
        y="18"
      >
        Net Change Stok Harian
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

      const netText = netChange > 0
        ? `+${netChange}`
        : String(netChange);

      return `
        <article class="admin-stock-movement-row">
          <div>
            <strong>
              ${escapeHtml(movement.date || "-")}
            </strong>
            <span>Tanggal</span>
          </div>

          <div>
            <strong>
              +${Number(movement.stockIn || 0)}
            </strong>
            <span>Masuk</span>
          </div>

          <div>
            <strong>
              -${Number(movement.sale || 0)}
            </strong>
            <span>Terjual</span>
          </div>

          <div>
            <strong>
              ${Number(movement.adjustment || 0)}
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