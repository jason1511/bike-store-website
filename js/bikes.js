let currentBrand = "all";
let currentSort = "default";
let currentSearch = "";
function parseBikeColorsForPage(colors) {
  if (Array.isArray(colors)) {
    return colors;
  }

  if (typeof colors === "string") {
    try {
      const parsedColors = JSON.parse(colors);
      return Array.isArray(parsedColors) ? parsedColors : [];
    } catch (error) {
      return [];
    }
  }

  return [];
}

function getBikeColorsForPage(bike) {
  if (!bike) {
    return [];
  }

  return parseBikeColorsForPage(bike.colors)
    .map((color) => ({
      name: String(color.name || "").trim(),
      hex: String(color.hex || "#cccccc").trim(),
      image: String(color.image || "").trim(),
      stockQty: Math.max(0, Number(color.stockQty || 0))
    }))
    .filter((color) => color.name || color.image || color.stockQty > 0);
}

function getBikeTotalStockForPage(bike) {
  const colors = getBikeColorsForPage(bike);
  const colorStockTotal = colors.reduce((total, color) => {
    return total + Math.max(0, Number(color.stockQty || 0));
  }, 0);

  return colorStockTotal > 0
    ? colorStockTotal
    : Math.max(0, Number(bike?.stockQty || 0));
}

function getBikePrimaryColorForPage(bike) {
  const colors = getBikeColorsForPage(bike);

  return colors.find((color) => color.stockQty > 0 && color.image)
    || colors.find((color) => color.image)
    || colors.find((color) => color.stockQty > 0)
    || colors[0]
    || null;
}

function getBikeDisplayImageForPage(bike) {
  const primaryColor = getBikePrimaryColorForPage(bike);

  return primaryColor?.image || bike?.image || "images/logo.jpeg";
}

function getBikeStockLabelForPage(bike) {
  const totalStock = getBikeTotalStockForPage(bike);

  if (!bike?.inStock) {
    return "Tidak aktif";
  }

  if (totalStock <= 0) {
    return "Stok habis";
  }

  return `Stok ${totalStock}`;
}
/* =========================
   FILTER + SORT
========================= */
function getInitialBrandFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const brand = params.get("brand");

  if (!brand) {
    return "all";
  }

  const matchedBike = bikes.find(
    (bike) => bike.brand.toLowerCase() === brand.toLowerCase()
  );

  return matchedBike ? matchedBike.brand : "all";
}

function renderBikes() {
  const bikeGrid = document.getElementById("bikeGrid");

  if (!bikeGrid) {
    return;
  }

  const visibleBikes = getFilteredAndSortedBikes({
    brand: currentBrand,
    search: currentSearch,
    sort: currentSort
  });

  if (!visibleBikes.length) {
    bikeGrid.innerHTML = `
      <div class="bike-empty-state">
        <h3>Tidak ada sepeda ditemukan</h3>
        <p>Coba gunakan kata kunci, brand, atau urutan yang berbeda.</p>
      </div>
    `;

    updateBikeStatus();
    return;
  }

  bikeGrid.innerHTML = visibleBikes
    .map((bike) => createBikeCard(bike))
    .join("");

  updateBikeStatus();
}

function updateBikeStatus() {
  const bikeStatus = document.getElementById("bikeStatus");

  if (!bikeStatus) {
    return;
  }

  const visibleCount = getFilteredAndSortedBikes({
    brand: currentBrand,
    search: currentSearch,
    sort: currentSort
  }).length;

  const brandLabel = currentBrand === "all" ? "semua brand" : currentBrand;

  if (currentSearch.trim()) {
    bikeStatus.innerHTML = `
      Menampilkan <strong>${escapeHtml(brandLabel)}</strong> untuk
      <strong>“${escapeHtml(currentSearch.trim())}”</strong> (${visibleCount})
    `;
    return;
  }

  bikeStatus.innerHTML = `Menampilkan <strong>${escapeHtml(brandLabel)}</strong> (${visibleCount})`;
}

function updateActiveFilterButton() {
  const filterButtons = document.querySelectorAll(".filter-btn");

  filterButtons.forEach((button) => {
    const isActive = button.dataset.brand === currentBrand;
    button.classList.toggle("active", isActive);
  });
}

function setupBikeFilters() {
  const filterButtons = document.querySelectorAll(".filter-btn");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentBrand = button.dataset.brand || "all";

      const url = new URL(window.location);

      if (currentBrand === "all") {
        url.searchParams.delete("brand");
      } else {
        url.searchParams.set("brand", currentBrand);
      }

      window.history.replaceState({}, "", url);

      updateActiveFilterButton();
      renderBikes();
    });
  });
}

function setupBikeSearch() {
  const searchInput = document.getElementById("searchInput");

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", (event) => {
    currentSearch = event.target.value;
    renderBikes();
  });
}

function setupBikeSort() {
  const sortSelect = document.getElementById("sortSelect");

  if (!sortSelect) {
    return;
  }

  sortSelect.addEventListener("change", (event) => {
    currentSort = event.target.value;
    renderBikes();
  });
}

function setupClearFilters() {
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");

  if (!clearFiltersBtn) {
    return;
  }

  clearFiltersBtn.addEventListener("click", () => {
    currentBrand = "all";
    currentSort = "default";
    currentSearch = "";

    const url = new URL(window.location);
    url.searchParams.delete("brand");
    window.history.replaceState({}, "", url);

    if (searchInput) {
      searchInput.value = "";
    }

    if (sortSelect) {
      sortSelect.value = "default";
    }

    updateActiveFilterButton();
    renderBikes();
  });
}

/* =========================
   BIKE MODAL
========================= */
function setupBikeModal() {
  const bikeGrid = document.getElementById("bikeGrid");

  if (!bikeGrid) {
    return;
  }

  bikeGrid.addEventListener("click", (event) => {
    const bikeCard = event.target.closest(".bike-card");

    if (!bikeCard) {
      return;
    }

    openBikeModal(bikeCard.dataset.bikeId);
  });

  bikeGrid.addEventListener("keydown", (event) => {
    const bikeCard = event.target.closest(".bike-card");

    if (!bikeCard) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openBikeModal(bikeCard.dataset.bikeId);
    }
  });
}

/* =========================
   COMPARE BIKES
========================= */
function getCompareElements() {
  return {
    form:
      document.getElementById("compareBikeForm") ||
      document.getElementById("compareForm"),

    bikeOne: document.getElementById("compareBikeOne"),
    bikeTwo: document.getElementById("compareBikeTwo"),

    usage:
      document.getElementById("compareUsageInput") ||
      document.getElementById("compareNeedInput"),

    button:
      document.getElementById("compareBikeBtn") ||
      document.querySelector("#compareBikeForm button[type='submit']") ||
      document.getElementById("compareBikesBtn"),

    result:
      document.getElementById("compareBikeResult") ||
      document.getElementById("compareResult") ||
      document.getElementById("compareResultPanel") ||
      document.getElementById("compareOutput")
  };
}

function setupCompareBikeDropdowns() {
  const { bikeOne, bikeTwo } = getCompareElements();

  if (!bikeOne || !bikeTwo) {
    return;
  }

  const bikeOptions = bikes
    .map((bike) => `
      <option value="${escapeHtml(bike.id)}">
        ${escapeHtml(bike.brand)} - ${escapeHtml(bike.name)}
      </option>
    `)
    .join("");

  bikeOne.innerHTML = `
    <option value="">Pilih sepeda pertama</option>
    ${bikeOptions}
  `;

  bikeTwo.innerHTML = `
    <option value="">Pilih sepeda kedua</option>
    ${bikeOptions}
  `;
}

function createCompareBikePreview(bike, label) {
  const brandTheme = getBrandTheme(bike.brand);
  const imageSrc = getBikeDisplayImageForPage(bike);
  const imageAlt = bike.alt || `Sepeda listrik ${bike.name || bike.brand || ""}`;
  const stockLabel = getBikeStockLabelForPage(bike);
  const primaryColor = getBikePrimaryColorForPage(bike);

  return `
    <button
      type="button"
      class="compare-bike-preview ${brandTheme.className}"
      data-bike-id="${escapeHtml(bike.id)}"
      aria-label="Lihat detail ${escapeHtml(bike.name)}"
    >
      <div class="compare-bike-preview-image">
        <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(imageAlt)}">
      </div>

      <div class="compare-bike-preview-info">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(bike.brand)} ${escapeHtml(bike.name)}</strong>
        <small>${escapeHtml(bike.range || "-")} • ${escapeHtml(bike.motor || "-")}</small>
        <small>
          ${escapeHtml(stockLabel)}
          ${primaryColor?.name ? ` • Warna utama: ${escapeHtml(primaryColor.name)}` : ""}
        </small>
      </div>
    </button>
  `;
}

function createComparisonPoints(points) {
  if (!Array.isArray(points) || !points.length) {
    return "";
  }

  return `
    <div class="compare-ai-points">
      ${points
        .map((point) => `
          <div class="compare-ai-point">
            <strong>${escapeHtml(point.label || "Catatan")}</strong>
            <p>${escapeHtml(point.text || "")}</p>
          </div>
        `)
        .join("")}
    </div>
  `;
}

function extractNumber(value) {
  const match = String(value || "").match(/\d+/);

  return match ? Number(match[0]) : 0;
}

function getCompareCellClass(type, bike, otherBike, winnerId) {
  if (type === "winner") {
    return bike.id === winnerId ? "is-better" : "is-weaker";
  }

  if (type === "range") {
    const bikeValue = extractNumber(bike.range);
    const otherValue = extractNumber(otherBike.range);

    if (!bikeValue || !otherValue || bikeValue === otherValue) return "";
    return bikeValue > otherValue ? "is-better" : "is-weaker";
  }

  if (type === "motor") {
    const bikeValue = extractNumber(bike.motor);
    const otherValue = extractNumber(otherBike.motor);

    if (!bikeValue || !otherValue || bikeValue === otherValue) return "";
    return bikeValue > otherValue ? "is-better" : "is-weaker";
  }

  if (type === "battery") {
    const bikeValue = extractNumber(bike.battery);
    const otherValue = extractNumber(otherBike.battery);

    if (!bikeValue || !otherValue || bikeValue === otherValue) return "";
    return bikeValue > otherValue ? "is-better" : "is-weaker";
  }

  if (type === "speed") {
    const bikeValue = extractNumber(bike.topSpeed);
    const otherValue = extractNumber(otherBike.topSpeed);

    if (!bikeValue || !otherValue || bikeValue === otherValue) return "";
    return bikeValue > otherValue ? "is-better" : "is-weaker";
  }

  if (type === "comfort") {
    const bikeValue = bike.comfort === "high" ? 2 : 1;
    const otherValue = otherBike.comfort === "high" ? 2 : 1;

    if (bikeValue === otherValue) return "";
    return bikeValue > otherValue ? "is-better" : "is-weaker";
  }

  return "";
}

function createCompareTableRow(label, bikeOneValue, bikeTwoValue, bikeOneClass = "", bikeTwoClass = "") {
  return `
    <tr>
      <td>${escapeHtml(label)}</td>
      <td class="${bikeOneClass}">${escapeHtml(bikeOneValue || "-")}</td>
      <td class="${bikeTwoClass}">${escapeHtml(bikeTwoValue || "-")}</td>
    </tr>
  `;
}

function createCompareTableRows(bikeOne, bikeTwo, winnerId) {
  return [
    createCompareTableRow(
      "Rekomendasi",
      bikeOne.id === winnerId ? "Direkomendasikan" : "Alternatif",
      bikeTwo.id === winnerId ? "Direkomendasikan" : "Alternatif",
      getCompareCellClass("winner", bikeOne, bikeTwo, winnerId),
      getCompareCellClass("winner", bikeTwo, bikeOne, winnerId)
    ),
    createCompareTableRow(
      "Jarak Tempuh",
      bikeOne.range,
      bikeTwo.range,
      getCompareCellClass("range", bikeOne, bikeTwo, winnerId),
      getCompareCellClass("range", bikeTwo, bikeOne, winnerId)
    ),
    createCompareTableRow(
      "Motor",
      bikeOne.motor,
      bikeTwo.motor,
      getCompareCellClass("motor", bikeOne, bikeTwo, winnerId),
      getCompareCellClass("motor", bikeTwo, bikeOne, winnerId)
    ),
    createCompareTableRow(
      "Baterai",
      bikeOne.battery,
      bikeTwo.battery,
      getCompareCellClass("battery", bikeOne, bikeTwo, winnerId),
      getCompareCellClass("battery", bikeTwo, bikeOne, winnerId)
    ),
    createCompareTableRow(
      "Kecepatan Maks",
      bikeOne.topSpeed,
      bikeTwo.topSpeed,
      getCompareCellClass("speed", bikeOne, bikeTwo, winnerId),
      getCompareCellClass("speed", bikeTwo, bikeOne, winnerId)
    ),
    createCompareTableRow(
      "Kenyamanan",
      bikeOne.comfort || "-",
      bikeTwo.comfort || "-",
      getCompareCellClass("comfort", bikeOne, bikeTwo, winnerId),
      getCompareCellClass("comfort", bikeTwo, bikeOne, winnerId)
    ),
    createCompareTableRow(
      "Fitur Keamanan",
      bikeOne.safety,
      bikeTwo.safety
    )
  ].join("");
}

function renderCompareLoading() {
  const { result } = getCompareElements();

  if (!result) {
    return;
  }

  result.innerHTML = `
    <div class="compare-result-card">
      <h3>Membandingkan sepeda...</h3>
      <p>AI sedang membantu memilih sepeda yang paling sesuai.</p>
    </div>
  `;
}

function renderCompareError(message) {
  const { result } = getCompareElements();

  if (!result) {
    return;
  }

  result.innerHTML = `
    <div class="compare-result-card is-error">
      <h3>Perbandingan gagal</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderCompareResult(data) {
  const { result } = getCompareElements();

  if (!result) {
    return;
  }

  const bikesToPreview = Array.isArray(data.bikes) ? data.bikes : [];
  const bikeOne = bikesToPreview[0];
  const bikeTwo = bikesToPreview[1];
  const bestBike =
    data.bestBike ||
    bikesToPreview.find((bike) => bike.id === data.bestBikeId);

  if (!bikeOne || !bikeTwo) {
    renderCompareError("Data sepeda tidak lengkap untuk dibandingkan.");
    return;
  }

  const winnerId = bestBike?.id || data.bestBikeId || "";
  const comparisonRows = createCompareTableRows(bikeOne, bikeTwo, winnerId);

  result.innerHTML = `
    <div class="compare-result-card">
      <div class="compare-preview-grid">
        ${createCompareBikePreview(bikeOne, "Pilihan 1")}
        ${createCompareBikePreview(bikeTwo, "Pilihan 2")}
      </div>

      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th>Aspek</th>
              <th>${escapeHtml(bikeOne.brand)} ${escapeHtml(bikeOne.name)}</th>
              <th>${escapeHtml(bikeTwo.brand)} ${escapeHtml(bikeTwo.name)}</th>
            </tr>
          </thead>

          <tbody>
            ${comparisonRows}
          </tbody>
        </table>
      </div>

      <div class="compare-ai-summary">
        <p class="compare-eyebrow">Rekomendasi AI</p>
        <h3>${escapeHtml(data.summary || "Hasil perbandingan sepeda")}</h3>

        ${
          bestBike
            ? `
              <p>
                Rekomendasi utama:
                <strong>${escapeHtml(bestBike.brand)} ${escapeHtml(bestBike.name)}</strong>
              </p>
            `
            : ""
        }

        <p>${escapeHtml(data.reason || "Pilih sepeda yang paling sesuai dengan kebutuhan harian Anda.")}</p>

        ${createComparisonPoints(data.comparisonPoints)}
      </div>
    </div>
  `;

  result.querySelectorAll("[data-bike-id]").forEach((button) => {
    button.addEventListener("click", () => {
      openBikeModal(button.dataset.bikeId);
    });
  });
}

async function compareSelectedBikesWithAI(bikeIds, usage = "") {
  const response = await fetch("/api/compare-bikes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      bikeIds,
      usage
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal membandingkan sepeda.");
  }

  return data;
}

function setupCompareBikes() {
  const { form, bikeOne, bikeTwo, usage, button } = getCompareElements();

  if (!bikeOne || !bikeTwo) {
    return;
  }

  const handleCompare = async (event) => {
    event.preventDefault();

    const bikeOneId = bikeOne.value;
    const bikeTwoId = bikeTwo.value;
    const usageText = usage?.value.trim() || "";

    if (!bikeOneId || !bikeTwoId) {
      renderCompareError("Pilih dua sepeda terlebih dahulu.");
      return;
    }

    if (bikeOneId === bikeTwoId) {
      renderCompareError("Pilih dua sepeda yang berbeda untuk dibandingkan.");
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Membandingkan...";
    }

    renderCompareLoading();

    try {
      const data = await compareSelectedBikesWithAI(
        [bikeOneId, bikeTwoId],
        usageText
      );

      renderCompareResult(data);
    } catch (error) {
      renderCompareError(error.message);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Bandingkan";
      }
    }
  };

  if (form) {
    form.addEventListener("submit", handleCompare);
    return;
  }

  if (button) {
    button.addEventListener("click", handleCompare);
  }
}

/* =========================
   PAGE INIT
========================= */
async function initializeBikesPage() {
  try {
    if (typeof loadBikes === "function") {
      await loadBikes();
    } else if (typeof loadBikeData === "function") {
      await loadBikeData();
    } else if (typeof initializeBikeData === "function") {
      await initializeBikeData();
    }

    currentBrand = getInitialBrandFromUrl();

    setupBikeFilters();
    setupBikeSearch();
    setupBikeSort();
    setupClearFilters();
    setupBikeModal();
    setupCompareBikeDropdowns();
    setupCompareBikes();

    updateActiveFilterButton();
    renderBikes();
  } catch (error) {
    console.error("Failed to initialize bikes page:", error);

    const bikeGrid = document.getElementById("bikeGrid");

    if (bikeGrid) {
      bikeGrid.innerHTML = `
        <div class="bike-empty-state">
          <h3>Gagal memuat katalog</h3>
          <p>Silakan refresh halaman atau coba lagi nanti.</p>
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", initializeBikesPage);