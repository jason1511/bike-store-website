let currentCategory = "all";
let currentSort = "default";
let currentSearch = "";
let hideSoldOut = false;

function setupHideSoldOutToggle() {
  const hideSoldOutToggle = document.getElementById("hideSoldOutToggle");

  if (!hideSoldOutToggle) {
    return;
  }

  hideSoldOutToggle.addEventListener("change", (event) => {
    hideSoldOut = event.target.checked;
    renderBikes();
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
function renderBikes() {
  const bikeGrid = document.getElementById("bikeGrid");

  if (!bikeGrid) {
    return;
  }

  const visibleBikes = getFilteredAndSortedBikes({
    category: currentCategory,
    search: currentSearch,
    sort: currentSort,
    hideSoldOut
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
    const isActive = button.dataset.category === currentCategory;
    button.classList.toggle("active", isActive);
  });
}

function setupBikeFilters() {
  const filterButtons = document.querySelectorAll(".filter-btn");

  if (!filterButtons.length) {
    return;
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentCategory = button.dataset.category;
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

function applyCategoryFromUrl() {
  const params = new URLSearchParams(globalThis.location.search);
  const categoryFromUrl = params.get("category");

  if (!categoryFromUrl) {
    return;
  }

  const validCategories = ["all", ...getUniqueCategories()];

  if (validCategories.includes(categoryFromUrl)) {
    currentCategory = categoryFromUrl;
  }
}
function formatCategoryLabel(category) {
  if (category === "all") {
    return "all bikes";
  }

  return `${category} bikes`;
}

function updateBikeStatus() {
  const bikeStatus = document.getElementById("bikeStatus");

  if (!bikeStatus) {
    return;
  }

  const visibleCount = getFilteredAndSortedBikes({
  category: currentCategory,
  search: currentSearch,
  sort: currentSort,
  hideSoldOut
}).length;
  const categoryLabel = formatCategoryLabel(currentCategory);

  if (currentSearch.trim()) {
    bikeStatus.innerHTML = `Showing <strong>${categoryLabel}</strong> for <strong>“${currentSearch.trim()}”</strong> (${visibleCount})`;
    return;
  }

  bikeStatus.innerHTML = `Showing <strong>${categoryLabel}</strong> (${visibleCount})`;
}
function setupClearFilters() {
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  const hideSoldOutToggle = document.getElementById("hideSoldOutToggle");
  if (!clearFiltersBtn) {
    return;
  }

  clearFiltersBtn.addEventListener("click", () => {
    currentCategory = "all";
    currentSort = "default";
    currentSearch = "";
    hideSoldOut = false;

if (hideSoldOutToggle) {
  hideSoldOutToggle.checked = false;
}
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
function openBikeModal(bikeId) {
  const bikeModal = document.getElementById("bikeModal");
  const bikeModalBody = document.getElementById("bikeModalBody");
  const bike = getBikeById(bikeId);

  if (!bikeModal || !bikeModalBody || !bike) {
    return;
  }

  bikeModalBody.innerHTML = `
    <div class="bike-modal-layout">
      <div class="bike-modal-image">
        <img src="${bike.image}" alt="${bike.alt}">
      </div>

      <div class="bike-modal-details">
  <p class="bike-modal-brand">${bike.brand}</p>
  <h2 id="bikeModalTitle">${bike.name}</h2>
  <p class="bike-modal-description">${bike.description}</p>

        <div class="bike-modal-specs">
          <div class="bike-modal-spec"><strong>Range:</strong> Up to ${bike.range}</div>
          <div class="bike-modal-spec"><strong>Motor:</strong> ${bike.motor}</div>
          <div class="bike-modal-spec"><strong>Charge Time:</strong> ${bike.chargeTime}</div>
          <div class="bike-modal-spec"><strong>Terrain:</strong> ${bike.terrain}</div>
          <div class="bike-modal-spec"><strong>Comfort:</strong> ${bike.comfort}</div>
          <div class="bike-modal-spec"><strong>Category:</strong> ${bike.category}</div>
        </div>

        <p class="bike-modal-price">${formatPrice(bike.price)}</p>

        <div class="bike-modal-actions">
          <a href="contact.html" class="btn-primary">Contact Us</a>
          <a href="contact.html" class="btn-secondary">Ask About This Bike</a>
        </div>
      </div>
    </div>
  `;

  bikeModal.classList.add("is-open");
  bikeModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeBikeModal() {
  const bikeModal = document.getElementById("bikeModal");

  if (!bikeModal) {
    return;
  }

  bikeModal.classList.remove("is-open");
  bikeModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function setupBikeModal() {
  const bikeGrid = document.getElementById("bikeGrid");
  const bikeModalClose = document.getElementById("bikeModalClose");
  const bikeModalOverlay = document.getElementById("bikeModalOverlay");

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

  if (bikeModalClose) {
    bikeModalClose.addEventListener("click", closeBikeModal);
  }

  if (bikeModalOverlay) {
    bikeModalOverlay.addEventListener("click", closeBikeModal);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeBikeModal();
    }
  });
}
document.addEventListener("bikesLoaded", () => {
  applyCategoryFromUrl();
  renderBikes();
  updateActiveFilterButton();
  setupBikeFilters();
  setupBikeSort();
  setupBikeSearch();
  setupClearFilters();
  setupBikeModal();
  setupHideSoldOutToggle();
});