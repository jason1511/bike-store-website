let adminBrandOptions = [];

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
      const stockQty = Number(bike.stockQty || 0);
      const isAvailable = isActive && stockQty > 0;
      const colorCount = normalizeBikeColors(bike.colors).length;

      return `
        <article class="admin-bike-list-card">
          <div class="admin-bike-list-main">
            <div>
              <p class="admin-bike-brand">${escapeHtml(bike.brand)}</p>
              <h3>${escapeHtml(bike.name)}</h3>
            </div>

            <span class="admin-stock-pill ${isAvailable ? "is-in" : "is-out"}">
              ${
                !isActive
                  ? "Nonaktif"
                  : isAvailable
                    ? `Stok ${stockQty}`
                    : "Stok Habis"
              }
            </span>
          </div>

          <div class="admin-bike-meta">
            <span>
              <strong>Baterai</strong>
              ${escapeHtml(bike.battery || "-")}
            </span>

            <span>
              <strong>Motor</strong>
              ${escapeHtml(bike.motor || "-")}
            </span>

            <span>
              <strong>Warna</strong>
              ${colorCount ? `${colorCount} pilihan` : escapeHtml(bike.colorName || "-")}
            </span>
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

  const searchTerm = normalizeSearchText(searchInput?.value);
  const statusValue = statusFilter?.value || "all";
  const brandValue = brandFilter?.value || "all";

  return adminBikesCache.filter((bike) => {
    const isActive = Boolean(bike.inStock);

    if (statusValue === "active" && !isActive) {
      return false;
    }

    if (statusValue === "inactive" && isActive) {
      return false;
    }

    if (brandValue !== "all" && bike.brand !== brandValue) {
      return false;
    }

    if (!searchTerm) {
      return true;
    }

    const searchableText = normalizeSearchText([
      bike.brand,
      bike.name,
      bike.battery,
      bike.motor,
      bike.range,
      bike.maxWeight,
      bike.colorName,
      bike.description
    ].join(" "));

    return searchableText.includes(searchTerm);
  });
}

function updateAdminResultCount(filteredCount, totalCount) {
  const resultCount = document.getElementById("adminBikeResultCount");

  if (!resultCount) {
    return;
  }

  if (filteredCount === totalCount) {
    resultCount.textContent = `Menampilkan semua ${totalCount} sepeda.`;
    return;
  }

  resultCount.textContent = `Menampilkan ${filteredCount} dari ${totalCount} sepeda.`;
}

function applyAdminBikeFilters() {
  const filteredBikes = getFilteredAdminBikes();

  renderAdminBikes(filteredBikes);
  updateAdminResultCount(filteredBikes.length, adminBikesCache.length);
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

  updateAdminResultCount(0, 0);
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
    refreshStockAnalyticsButton.addEventListener("click", loadStockAnalytics);
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

  if (
    searchInput &&
    !searchInput.dataset.bikeSearchBound
  ) {
    searchInput.dataset.bikeSearchBound = "true";

    searchInput.addEventListener(
      "input",
      applyAdminBikeFilters
    );
  }

  if (
    statusFilter &&
    !statusFilter.dataset.bikeStatusBound
  ) {
    statusFilter.dataset.bikeStatusBound = "true";

    statusFilter.addEventListener(
      "change",
      applyAdminBikeFilters
    );
  }

  if (
    brandFilter &&
    !brandFilter.dataset.bikeBrandBound
  ) {
    brandFilter.dataset.bikeBrandBound = "true";

    brandFilter.addEventListener(
      "change",
      applyAdminBikeFilters
    );
  }
}