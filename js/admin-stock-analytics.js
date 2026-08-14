/* =========================
   CATALOG STOCK SNAPSHOT
========================= */
async function fetchStockAnalytics(days = 14) {
  return fetchAdminJson(
    `/api/admin/analytics/stock?days=${encodeURIComponent(days)}`,
    { method: "GET" }
  );
}

function getCatalogStockSnapshot(bikes = []) {
  const activeBikes = bikes.filter((bike) => {
    return Boolean(bike.inStock);
  });
  const activeVariants = activeBikes.flatMap((bike) => {
    return getAdminBikeStockColors(bike).map((color) => ({
      bikeId: bike.id,
      brand: bike.brand || "-",
      name: bike.name || "-",
      colorName:
        color.name || "Warna belum dicatat",
      colorHex: getSafeStockSwatch(color.hex),
      quantity: Math.max(
        0,
        Number(color.stockQty || 0)
      )
    }));
  });
  const allUnits = bikes.reduce((total, bike) => {
    return total + getAdminBikeTotalStock(bike);
  }, 0);
  const health = activeVariants.reduce(
    (result, variant) => {
      if (variant.quantity <= 0) {
        result.out += 1;
      } else if (variant.quantity <= 3) {
        result.low += 1;
      } else if (variant.quantity <= 10) {
        result.safe += 1;
      } else {
        result.high += 1;
      }

      return result;
    },
    { out: 0, low: 0, safe: 0, high: 0 }
  );

  return {
    summary: {
      totalStock: allUnits,
      activeBikes: activeBikes.length,
      colorVariants: activeVariants.length,
      lowStockBikes: health.low,
      outOfStockBikes: health.out
    },
    health,
    urgentVariants: activeVariants
      .filter((variant) => variant.quantity <= 3)
      .sort((first, second) => {
        return (
          first.quantity - second.quantity ||
          `${first.brand} ${first.name} ${first.colorName}`
            .localeCompare(
              `${second.brand} ${second.name} ${second.colorName}`,
              "id-ID"
            )
        );
      })
      .slice(0, 8)
  };
}

function renderStockAnalyticsSummary(summary = {}) {
  const values = {
    stockAnalyticsTotalStock: summary.totalStock,
    stockAnalyticsActiveBikes: summary.activeBikes,
    stockAnalyticsColorVariants: summary.colorVariants,
    stockAnalyticsLowStock: summary.lowStockBikes,
    stockAnalyticsOutOfStock: summary.outOfStockBikes
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = Number(
        value || 0
      ).toLocaleString("id-ID");
    }
  });
}

function renderStockHealthChart(health = {}) {
  const chart = document.getElementById(
    "stockAnalyticsHealthChart"
  );

  if (!chart) {
    return;
  }

  const categories = [
    {
      key: "out",
      label: "Habis",
      range: "0 unit",
      className: "is-out"
    },
    {
      key: "low",
      label: "Rendah",
      range: "1–3 unit",
      className: "is-low"
    },
    {
      key: "safe",
      label: "Aman",
      range: "4–10 unit",
      className: "is-safe"
    },
    {
      key: "high",
      label: "Tinggi",
      range: ">10 unit",
      className: "is-high"
    }
  ].map((category) => ({
    ...category,
    value: Math.max(
      0,
      Number(health[category.key] || 0)
    )
  }));
  const total = categories.reduce((sum, category) => {
    return sum + category.value;
  }, 0);

  if (!total) {
    chart.innerHTML = `
      <div class="admin-empty-state">
        Belum ada varian warna aktif.
      </div>
    `;
    return;
  }

  chart.innerHTML = `
    <div
      class="admin-stock-health-bar"
      role="img"
      aria-label="${escapeHtml(
        categories.map((category) => {
          return `${category.label} ${category.value} varian`;
        }).join(", ")
      )}"
    >
      ${categories.map((category) => {
        if (!category.value) {
          return "";
        }

        const share = category.value / total;

        return `
          <span
            class="${category.className}"
            style="--stock-health-share: ${share}"
            title="${escapeHtml(
              `${category.label}: ${category.value} varian`
            )}"
          ></span>
        `;
      }).join("")}
    </div>

    <div class="admin-stock-health-legend">
      ${categories.map((category) => `
        <article class="${category.className}">
          <span>${escapeHtml(category.label)}</span>
          <strong>${category.value.toLocaleString("id-ID")}</strong>
          <small>${escapeHtml(category.range)}</small>
        </article>
      `).join("")}
    </div>
  `;
}

function renderUrgentRestockList(variants = []) {
  const list = document.getElementById(
    "stockAnalyticsRestockList"
  );

  if (!list) {
    return;
  }

  if (!variants.length) {
    list.innerHTML = `
      <div class="admin-empty-state">
        Tidak ada varian aktif dengan stok 0–3.
      </div>
    `;
    return;
  }

  list.innerHTML = variants.map((variant) => {
    const isOut = variant.quantity <= 0;

    return `
      <article class="admin-restock-row ${
        isOut ? "is-out" : "is-low"
      }">
        <div class="admin-restock-bike">
          <span>${escapeHtml(variant.brand)}</span>
          <strong>${escapeHtml(variant.name)}</strong>
          <small>
            <i style="--stock-swatch: ${variant.colorHex}"></i>
            ${escapeHtml(variant.colorName)}
          </small>
        </div>

        <div class="admin-restock-quantity">
          <strong>${variant.quantity.toLocaleString("id-ID")}</strong>
          <span>${isOut ? "Habis" : "Rendah"}</span>
        </div>
      </article>
    `;
  }).join("");
}

function loadStockAnalytics() {
  const snapshot = getCatalogStockSnapshot(
    adminBikesCache
  );

  renderStockAnalyticsSummary(snapshot.summary);
  renderStockHealthChart(snapshot.health);
  renderUrgentRestockList(snapshot.urgentVariants);
}
