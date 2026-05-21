let currentCategory = "all";
let currentSort = "default";
let currentSearch = "";
let currentBrand = "all";
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
        <h3>No bikes found</h3>
        <p>Try a different search, category, or sort option.</p>
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
      currentBrand = button.dataset.brand;

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


function updateBikeStatus() {
  const bikeStatus = document.getElementById("bikeStatus");

  if (!bikeStatus) {
    return;
  }

  const visibleCount = getFilteredAndSortedBikes({
    brand: currentBrand,
    search: currentSearch,
    sort: currentSort,
  }).length;

  if (currentSearch.trim()) {
    bikeStatus.innerHTML = `Menampilkan <strong>${currentBrand}</strong> untuk <strong>“${currentSearch.trim()}”</strong> (${visibleCount})`;
    return;
  }

  bikeStatus.innerHTML = `Menampilkan <strong>${currentBrand}</strong> (${visibleCount})`;
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

    const bikeId = bikeCard.dataset.bikeId;
    openBikeModal(bikeId);
  });

  bikeGrid.addEventListener("keydown", (event) => {
    const bikeCard = event.target.closest(".bike-card");

    if (!bikeCard) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const bikeId = bikeCard.dataset.bikeId;
      openBikeModal(bikeId);
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
        <option value="${bike.id}">
          ${bike.brand} - ${bike.name}
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

      const comparison = data.comparison;

const rowsHtml = comparison.rows
  .map((row) => {
    const bikeOneClass =
      row.winner === "bikeOne" ? "compare-win" :
      row.winner === "bikeTwo" ? "compare-lose" :
      "compare-neutral";

    const bikeTwoClass =
      row.winner === "bikeTwo" ? "compare-win" :
      row.winner === "bikeOne" ? "compare-lose" :
      "compare-neutral";

    return `
      <tr>
        <th>${row.label}</th>
        <td class="${bikeOneClass}">${row.bikeOne}</td>
        <td class="${bikeTwoClass}">${row.bikeTwo}</td>
      </tr>
    `;
  })
  .join("");

result.innerHTML = `
  <p class="hero-bike-label">Hasil Perbandingan AI</p>
  <h3>${bikeOne.name} vs ${bikeTwo.name}</h3>

  <div class="compare-summary">
    <p>${comparison.summary}</p>
  </div>

  <div class="compare-table-wrap">
    <table class="compare-table">
      <thead>
        <tr>
          <th>Aspek</th>
          <th>${bikeOne.name}</th>
          <th>${bikeTwo.name}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>

  <div class="compare-final">
    <strong>Rekomendasi akhir:</strong>
    <p>${comparison.finalRecommendation}</p>
  </div>

  <div class="compare-result-actions">
    <button type="button" class="btn-secondary" id="openCompareBikeOne">
      Lihat ${bikeOne.name}
    </button>

    <button type="button" class="btn-secondary" id="openCompareBikeTwo">
      Lihat ${bikeTwo.name}
    </button>
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