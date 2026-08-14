let adminBrandOptions = [];
const ADMIN_BIKE_PAGE_SIZE = 25;
let adminBikeCurrentPage = 1;

/* =========================
   ADMIN BIKE LIST
========================= */
async function fetchAdminBikes() {
  const data = await fetchAdminJson("/api/admin/bikes", {
    method: "GET"
  });

  return data.bikes || [];
}
async function fetchAdminBrands() {
  const data = await fetchAdminJson("/api/admin/brands", {
    method: "GET"
  });

  return data.brands || [];
}


function getAdminBrandById(brandId) {
  return adminBrandOptions.find((brand) => brand.id === brandId) || null;
}

function getAdminBrandByName(brandName) {
  const normalizedName = String(brandName || "").trim().toLowerCase();

  return adminBrandOptions.find((brand) => {
    return String(brand.name || "").trim().toLowerCase() === normalizedName;
  }) || null;
}

function populateBikeBrandSelect(selectedBrandId = "") {
  const brandInput = document.getElementById("bikeBrandInput");

  if (!brandInput) {
    return;
  }

  if (!adminBrandOptions.length) {
    brandInput.innerHTML = `<option value="">Brand belum tersedia</option>`;
    return;
  }

  brandInput.innerHTML = `
    <option value="">Pilih brand</option>
    ${adminBrandOptions
      .map((brand) => `
        <option value="${escapeHtml(brand.id)}">
          ${escapeHtml(brand.name)}
        </option>
      `)
      .join("")}
  `;

  if (selectedBrandId) {
    brandInput.value = selectedBrandId;
  }
}

async function loadAdminBrands() {
  adminBrandOptions = await fetchAdminBrands();
  populateBikeBrandSelect();
}

function getSafeStockSwatch(color) {
  const swatch = String(color || "").trim();

  return /^#[0-9a-f]{3,8}$/i.test(swatch)
    ? swatch
    : "#cccccc";
}

function getAdminBikeStockColors(bike) {
  const colors = normalizeBikeColors(bike.colors);

  if (colors.length) {
    return colors;
  }

  return [{
    name: String(bike.colorName || "Warna tidak dicatat").trim(),
    hex: "#cccccc",
    stockQty: Math.max(0, Number(bike.stockQty || 0))
  }];
}

function getAdminBikeTotalStock(bike) {
  return getAdminBikeStockColors(bike).reduce(
    (total, color) => {
      return total + Math.max(
        0,
        Number(color.stockQty || 0)
      );
    },
    0
  );
}

function getAdminBikeStockState(bike) {
  const quantities = getAdminBikeStockColors(bike)
    .map((color) => {
      return Math.max(
        0,
        Number(color.stockQty || 0)
      );
    });

  if (quantities.some((quantity) => quantity <= 0)) {
    return "out";
  }

  if (quantities.some((quantity) => quantity <= 3)) {
    return "low";
  }

  return "safe";
}

function adminBikeMatchesStockFilter(
  bike,
  stockFilter
) {
  if (stockFilter === "all") {
    return true;
  }

  const quantities = getAdminBikeStockColors(bike)
    .map((color) => {
      return Math.max(
        0,
        Number(color.stockQty || 0)
      );
    });

  if (stockFilter === "out") {
    return quantities.some((quantity) => {
      return quantity <= 0;
    });
  }

  if (stockFilter === "low") {
    return quantities.some((quantity) => {
      return quantity >= 1 && quantity <= 3;
    });
  }

  if (stockFilter === "safe") {
    return quantities.every((quantity) => {
      return quantity > 3;
    });
  }

  return true;
}

function renderAdminBikeColorStock(bike) {
  return getAdminBikeStockColors(bike)
    .map((color) => {
      const quantity = Math.max(0, Number(color.stockQty || 0));
      const stockClass = quantity <= 0
        ? "is-empty"
        : quantity <= 3
          ? "is-low"
          : "is-ready";

      return `
        <div class="admin-stock-color-chip ${stockClass}">
          <i style="--stock-swatch: ${getSafeStockSwatch(color.hex)}"></i>
          <em>${escapeHtml(
            color.name || "Warna belum dicatat"
          )}</em>
          <b>${quantity}</b>
        </div>
      `;
    })
    .join("");
}

function renderAdminBikes(bikes) {
  const bikeList = document.getElementById("adminBikeList");

  if (!bikeList) {
    return;
  }

  if (!bikes.length) {
    bikeList.innerHTML = `
      <div class="admin-empty-state">
        Belum ada data sepeda.
      </div>
    `;
    return;
  }

  bikeList.innerHTML = bikes
    .map((bike) => {
      const isActive = Boolean(bike.inStock);
      const totalStock = getAdminBikeTotalStock(bike);
      const price = Number(bike.price || 0);

      return `
        <article class="admin-bike-list-card ${
          isActive ? "" : "is-inactive"
        }">
          <div class="admin-bike-list-main">
            <div class="admin-bike-list-info">
              <p class="admin-bike-brand">${escapeHtml(bike.brand || "-")}</p>
              <h3>${escapeHtml(bike.name)}</h3>
              <p class="admin-bike-list-price ${
                price > 0 ? "" : "is-missing"
              }">
                ${price > 0
                  ? escapeHtml(formatRupiah(price))
                  : "Harga belum diisi"}
              </p>
            </div>

            <div class="admin-bike-color-stock-list">
              ${renderAdminBikeColorStock(bike)}
            </div>

            <div class="admin-bike-list-side">
              <div class="admin-bike-total-stock">
                <span>Total</span>
                <strong>${totalStock.toLocaleString("id-ID")}</strong>
                ${isActive
                  ? ""
                  : "<small>Nonaktif</small>"}
              </div>

              <div class="admin-card-actions">
                <button
                  type="button"
                  class="admin-action-btn"
                  data-admin-edit-bike="${escapeHtml(bike.id)}"
                >
                  Edit
                </button>

                ${
                  isActive
                    ? `
                      <button
                        type="button"
                        class="admin-action-btn admin-danger-btn"
                        data-admin-deactivate-bike="${escapeHtml(bike.id)}"
                      >
                        Nonaktifkan
                      </button>
                    `
                    : `
                      <button
                        type="button"
                        class="admin-action-btn admin-success-btn"
                        data-admin-reactivate-bike="${escapeHtml(bike.id)}"
                      >
                        Aktifkan Lagi
                      </button>
                    `
                }
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function getAvailableBrands(bikes) {
  return [...new Set(
    bikes
      .map((bike) => bike.brand)
      .filter(Boolean)
      .map((brand) => brand.trim())
  )].sort((a, b) => a.localeCompare(b));
}

function populateBrandFilter(bikes) {
  const brandFilter = document.getElementById("adminBikeBrandFilter");

  if (!brandFilter) {
    return;
  }

  const currentValue = brandFilter.value || "all";
  const brands = getAvailableBrands(bikes);

  brandFilter.innerHTML = `
    <option value="all">Semua Brand</option>
    ${brands
      .map((brand) => `
        <option value="${escapeHtml(brand)}">
          ${escapeHtml(brand)}
        </option>
      `)
      .join("")}
  `;

  brandFilter.value = currentValue === "all" || brands.includes(currentValue)
    ? currentValue
    : "all";
}

function getFilteredAdminBikes() {
  const searchInput = document.getElementById("adminBikeSearchInput");
  const statusFilter = document.getElementById("adminBikeStatusFilter");
  const brandFilter = document.getElementById("adminBikeBrandFilter");
  const stockFilter = document.getElementById(
    "adminBikeStockFilter"
  );
  const sortInput = document.getElementById(
    "adminBikeSortInput"
  );

  const searchTerm = normalizeSearchText(searchInput?.value);
  const statusValue = statusFilter?.value || "all";
  const brandValue = brandFilter?.value || "all";
  const stockValue = stockFilter?.value || "all";
  const sortValue = sortInput?.value || "attention";

  const filteredBikes = adminBikesCache.filter((bike) => {
    const isActive = Boolean(bike.inStock);
    const colorNames = normalizeBikeColors(bike.colors)
      .map((color) => color.name)
      .join(" ");

    if (statusValue === "active" && !isActive) {
      return false;
    }

    if (statusValue === "inactive" && isActive) {
      return false;
    }

    if (brandValue !== "all" && bike.brand !== brandValue) {
      return false;
    }

    if (
      !adminBikeMatchesStockFilter(
        bike,
        stockValue
      )
    ) {
      return false;
    }

    if (!searchTerm) {
      return true;
    }

    const searchableText = normalizeSearchText([
      bike.brand,
      bike.name,
      bike.colorName,
      colorNames
    ].join(" "));

    return searchableText.includes(searchTerm);
  });

  return filteredBikes.sort((first, second) => {
    const firstTotal = getAdminBikeTotalStock(first);
    const secondTotal = getAdminBikeTotalStock(second);
    const nameComparison = `${first.brand} ${first.name}`
      .localeCompare(
        `${second.brand} ${second.name}`,
        "id-ID"
      );

    if (sortValue === "name") {
      return nameComparison;
    }

    if (sortValue === "stock-asc") {
      return firstTotal - secondTotal || nameComparison;
    }

    if (sortValue === "stock-desc") {
      return secondTotal - firstTotal || nameComparison;
    }

    const stockPriority = {
      out: 0,
      low: 1,
      safe: 2
    };
    const activeComparison =
      Number(Boolean(second.inStock)) -
      Number(Boolean(first.inStock));

    return (
      activeComparison ||
      stockPriority[getAdminBikeStockState(first)] -
        stockPriority[getAdminBikeStockState(second)] ||
      firstTotal - secondTotal ||
      nameComparison
    );
  });
}

function updateAdminResultCount(
  filteredCount,
  totalCount,
  startIndex,
  endIndex
) {
  const resultCount = document.getElementById("adminBikeResultCount");

  if (!resultCount) {
    return;
  }

  if (!filteredCount) {
    resultCount.textContent = `Tidak ada sepeda dari ${totalCount} data.`;
    return;
  }

  resultCount.textContent =
    `Menampilkan ${startIndex + 1}–${endIndex} dari ` +
    `${filteredCount} sepeda` +
    (filteredCount === totalCount
      ? "."
      : ` (${totalCount} total).`);
}

function renderAdminBikePagination(totalItems) {
  const pagination = document.getElementById(
    "adminBikePagination"
  );

  if (!pagination) {
    return;
  }

  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / ADMIN_BIKE_PAGE_SIZE)
  );

  if (totalPages <= 1) {
    pagination.classList.add("is-hidden");
    pagination.innerHTML = "";
    return;
  }

  pagination.classList.remove("is-hidden");
  pagination.innerHTML = `
    <button
      type="button"
      class="btn-secondary"
      data-admin-bike-page="previous"
      ${adminBikeCurrentPage <= 1 ? "disabled" : ""}
    >
      Sebelumnya
    </button>
    <span>
      Halaman ${adminBikeCurrentPage} dari ${totalPages}
    </span>
    <button
      type="button"
      class="btn-secondary"
      data-admin-bike-page="next"
      ${adminBikeCurrentPage >= totalPages ? "disabled" : ""}
    >
      Berikutnya
    </button>
  `;
}

function applyAdminBikeFilters(options = {}) {
  if (options.resetPage) {
    adminBikeCurrentPage = 1;
  }

  const filteredBikes = getFilteredAdminBikes();
  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredBikes.length / ADMIN_BIKE_PAGE_SIZE
    )
  );

  adminBikeCurrentPage = Math.min(
    adminBikeCurrentPage,
    totalPages
  );

  const startIndex =
    (adminBikeCurrentPage - 1) * ADMIN_BIKE_PAGE_SIZE;
  const endIndex = Math.min(
    startIndex + ADMIN_BIKE_PAGE_SIZE,
    filteredBikes.length
  );
  const pageBikes = filteredBikes.slice(
    startIndex,
    endIndex
  );

  renderAdminBikes(pageBikes);
  updateAdminResultCount(
    filteredBikes.length,
    adminBikesCache.length,
    startIndex,
    endIndex
  );
  renderAdminBikePagination(filteredBikes.length);
}

async function loadAdminBikes() {
  const bikeList = document.getElementById("adminBikeList");

  if (bikeList) {
    bikeList.innerHTML = `
      <div class="admin-empty-state">
        Memuat data sepeda...
      </div>
    `;
  }

  try {
    const bikes = await fetchAdminBikes();

    adminBikesCache = bikes;
    adminBikeCurrentPage = 1;
    populateBrandFilter(adminBikesCache);
    applyAdminBikeFilters();
    await loadStockAnalytics();
  } catch (error) {
  if (handleAdminAuthError(error)) {
    return;
  }

  adminBikesCache = [];

  if (bikeList) {
    bikeList.innerHTML = `
      <div class="admin-empty-state is-error">
        ${escapeHtml(error.message)}
      </div>
    `;
  }

  updateAdminResultCount(0, 0, 0, 0);
}
}

function setupBikeRefresh() {
  const refreshButton = document.getElementById("refreshBikesBtn");
  const refreshStockAnalyticsButton = document.getElementById("refreshStockAnalyticsBtn");

  if (refreshButton && !refreshButton.dataset.bikeRefreshBound) {
    refreshButton.dataset.bikeRefreshBound = "true";
    refreshButton.addEventListener("click", loadAdminBikes);
  }

  if (refreshStockAnalyticsButton && !refreshStockAnalyticsButton.dataset.stockAnalyticsBound) {
    refreshStockAnalyticsButton.dataset.stockAnalyticsBound = "true";
    refreshStockAnalyticsButton.addEventListener(
      "click",
      loadAdminBikes
    );
  }
}

function setupAdminBikeFilters() {
  const searchInput = document.getElementById(
    "adminBikeSearchInput"
  );

  const statusFilter = document.getElementById(
    "adminBikeStatusFilter"
  );

  const brandFilter = document.getElementById(
    "adminBikeBrandFilter"
  );

  const stockFilter = document.getElementById(
    "adminBikeStockFilter"
  );

  const sortInput = document.getElementById(
    "adminBikeSortInput"
  );

  const pagination = document.getElementById(
    "adminBikePagination"
  );

  const resetAndApplyFilters = () => {
    applyAdminBikeFilters({ resetPage: true });
  };

  if (
    searchInput &&
    !searchInput.dataset.bikeSearchBound
  ) {
    searchInput.dataset.bikeSearchBound = "true";

    searchInput.addEventListener(
      "input",
      resetAndApplyFilters
    );
  }

  if (
    statusFilter &&
    !statusFilter.dataset.bikeStatusBound
  ) {
    statusFilter.dataset.bikeStatusBound = "true";

    statusFilter.addEventListener(
      "change",
      resetAndApplyFilters
    );
  }

  if (
    brandFilter &&
    !brandFilter.dataset.bikeBrandBound
  ) {
    brandFilter.dataset.bikeBrandBound = "true";

    brandFilter.addEventListener(
      "change",
      resetAndApplyFilters
    );
  }

  [stockFilter, sortInput].forEach((input) => {
    if (!input || input.dataset.bikeFilterBound) {
      return;
    }

    input.dataset.bikeFilterBound = "true";
    input.addEventListener(
      "change",
      resetAndApplyFilters
    );
  });

  if (
    pagination &&
    !pagination.dataset.bikePaginationBound
  ) {
    pagination.dataset.bikePaginationBound = "true";
    pagination.addEventListener("click", (event) => {
      const button = event.target.closest(
        "[data-admin-bike-page]"
      );

      if (!button || button.disabled) {
        return;
      }

      adminBikeCurrentPage +=
        button.dataset.adminBikePage === "next"
          ? 1
          : -1;
      applyAdminBikeFilters();

      document.getElementById(
        "adminBikeResultCount"
      )?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    });
  }
}
