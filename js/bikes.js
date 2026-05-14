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
});