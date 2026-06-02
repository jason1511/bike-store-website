let currentBrand = "all";
let currentSort = "default";
let currentSearch = "";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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
      Menampilkan <strong>${brandLabel}</strong> untuk 
      <strong>“${escapeHtml(currentSearch.trim())}”</strong> (${visibleCount})
    `;
    return;
  }

  bikeStatus.innerHTML = `Menampilkan <strong>${brandLabel}</strong> (${visibleCount})`;
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

function setupCompareBikeDropdowns() {
  const compareBikeOne = document.getElementById("compareBikeOne");
  const compareBikeTwo = document.getElementById("compareBikeTwo");

  if (!compareBikeOne || !compareBikeTwo) {
    return;
  }

  const bikeOptions = bikes
    .map((bike) => {
      return `
        <option value="${escapeHtml(bike.id)}">
          ${escapeHtml(bike.brand)} - ${escapeHtml(bike.name)}
        </option>
      `;
    })
    .join("");

  compareBikeOne.innerHTML = `
    <option value="">Pilih sepeda pertama</option>
    ${bikeOptions}
  `;

  compareBikeTwo.innerHTML = `
    <option value="">Pilih sepeda kedua</option>
    ${bikeOptions}
  `;
}

function getCompareCellClass(winner, side) {
  if (winner === "tie") {
    return "compare-neutral";
  }

  if (winner === side) {
    return "compare-win";
  }

  return "compare-lose";
}

function createCompareBikePreview(bike, label, buttonId) {
  const brandClass = getBrandTheme(bike.brand).className;

  return `
    <button
      type="button"
      class="compare-bike-preview ${brandClass}"
      id="${buttonId}"
      aria-label="Lihat detail ${escapeHtml(bike.name)}"
    >
      <div class="compare-bike-preview-image">
        <img src="${escapeHtml(bike.image)}" alt="${escapeHtml(bike.alt)}">
      </div>

      <div class="compare-bike-preview-info">
        <p class="hero-bike-label">${escapeHtml(label)}</p>
        <p class="hero-bike-brand">${escapeHtml(bike.brand)}</p>
        <h4>${escapeHtml(bike.name)}</h4>

        <div class="compare-bike-preview-specs">
          <span>${escapeHtml(bike.range || "Jarak belum tersedia")}</span>
          <span>${escapeHtml(bike.motor || "Motor belum tersedia")}</span>
          <span>${escapeHtml(bike.safety || "Keamanan standar")}</span>
        </div>

        <p class="compare-click-hint">Klik untuk lihat detail</p>
      </div>
    </button>
  `;
}

function renderComparisonResult(result, bikeOne, bikeTwo, comparison) {
  const rows = Array.isArray(comparison.rows) ? comparison.rows : [];

  const rowsHtml = rows
    .map((row) => {
      const winner = ["bikeOne", "bikeTwo", "tie"].includes(row.winner)
        ? row.winner
        : "tie";

      return `
        <tr>
          <th>${escapeHtml(row.label)}</th>
          <td class="${getCompareCellClass(winner, "bikeOne")}">
            ${escapeHtml(row.bikeOne)}
          </td>
          <td class="${getCompareCellClass(winner, "bikeTwo")}">
            ${escapeHtml(row.bikeTwo)}
          </td>
        </tr>
      `;
    })
    .join("");

  result.innerHTML = `
    <p class="hero-bike-label">Hasil Perbandingan AI</p>
    <h3>${escapeHtml(bikeOne.name)} vs ${escapeHtml(bikeTwo.name)}</h3>

    <div class="compare-preview-grid">
  ${createCompareBikePreview(bikeOne, "Sepeda Pertama", "openCompareBikeOne")}

  <div class="compare-vs-badge">VS</div>

  ${createCompareBikePreview(bikeTwo, "Sepeda Kedua", "openCompareBikeTwo")}
</div>

    <div class="compare-summary">
      <p>${escapeHtml(comparison.summary || "Ringkasan belum tersedia.")}</p>
    </div>

    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Aspek</th>
            <th>${escapeHtml(bikeOne.name)}</th>
            <th>${escapeHtml(bikeTwo.name)}</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <div class="compare-final">
      <strong>Rekomendasi akhir:</strong>
      <p>${escapeHtml(comparison.finalRecommendation || "Rekomendasi akhir belum tersedia.")}</p>
    </div>
  `;

  const openBikeOneButton = document.getElementById("openCompareBikeOne");
  const openBikeTwoButton = document.getElementById("openCompareBikeTwo");

  if (openBikeOneButton) {
    openBikeOneButton.addEventListener("click", () => {
      openBikeModal(bikeOne.id);
    });
  }

  if (openBikeTwoButton) {
    openBikeTwoButton.addEventListener("click", () => {
      openBikeModal(bikeTwo.id);
    });
  }
}

function setupCompareBikeForm() {
  const form = document.getElementById("compareBikeForm");
  const result = document.getElementById("compareBikeResult");
  const compareBikeOne = document.getElementById("compareBikeOne");
  const compareBikeTwo = document.getElementById("compareBikeTwo");

  if (!form || !result || !compareBikeOne || !compareBikeTwo) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const bikeOneId = compareBikeOne.value;
    const bikeTwoId = compareBikeTwo.value;

    if (!bikeOneId || !bikeTwoId) {
      result.innerHTML = `
        <h3>Pilih dua sepeda terlebih dahulu</h3>
        <p>Silakan pilih sepeda pertama dan sepeda kedua untuk dibandingkan.</p>
      `;
      return;
    }

    if (bikeOneId === bikeTwoId) {
      result.innerHTML = `
        <h3>Pilih dua model yang berbeda</h3>
        <p>Perbandingan akan lebih berguna jika Anda memilih dua sepeda yang berbeda.</p>
      `;
      return;
    }

    const bikeOne = getBikeById(bikeOneId);
    const bikeTwo = getBikeById(bikeTwoId);

    if (!bikeOne || !bikeTwo) {
      result.innerHTML = `
        <h3>Data sepeda tidak ditemukan</h3>
        <p>Silakan pilih ulang sepeda yang ingin dibandingkan.</p>
      `;
      return;
    }

    result.innerHTML = `
      <h3>Membandingkan sepeda...</h3>
      <p>Sedang membandingkan spesifikasi, kenyamanan, keamanan, dan kecocokan penggunaan.</p>
    `;

    try {
      const response = await fetch("/api/compare-bikes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          bikeOne,
          bikeTwo
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Compare API error response:", errorData);
        throw new Error(errorData?.error || "Failed to compare bikes");
      }

      const data = await response.json();

      if (!data.comparison) {
        throw new Error("Comparison data missing");
      }

      renderComparisonResult(result, bikeOne, bikeTwo, data.comparison);
    } catch (error) {
      console.error(error);

      result.innerHTML = `
        <h3>Perbandingan belum tersedia</h3>
        <p>Silakan coba lagi, atau buka detail masing-masing sepeda untuk membandingkan secara manual.</p>
      `;
    }
  });
}

whenBikesLoaded(() => {
  currentBrand = getInitialBrandFromUrl();

  renderBikes();
  updateActiveFilterButton();
  setupBikeFilters();
  setupBikeSort();
  setupBikeSearch();
  setupClearFilters();
  setupBikeModal();
  setupBikeModalControls();
  setupCompareBikeDropdowns();
  setupCompareBikeForm();
});