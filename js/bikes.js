let currentCategory = "all";
let currentSort = "default";
let currentSearch = "";
let currentBrand = "all";

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
    currentCategory = "all";
    currentSort = "default";
    currentSearch = "";

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
const highlights = getHighlights(bike);
const recommendedUses = getRecommendedUses(bike);
  bikeModalBody.innerHTML = `
    <div class="bike-modal-layout">
      <div class="bike-modal-image">
        <img src="${bike.image}" alt="${bike.alt}">
      </div>

      <div class="bike-modal-details">
  <p class="bike-modal-brand">${bike.brand}</p>
  <h2 id="bikeModalTitle">${bike.name}</h2>
  <p class="bike-modal-description">${bike.description}</p>
${highlights.length ? `
  <div class="bike-highlights">
    ${highlights.map(h => `<span class="highlight-badge">${h}</span>`).join("")}
  </div>
` : ""}
${recommendedUses.length ? `
  <div class="bike-recommended">
    <h3>Cocok untuk:</h3>
    <div class="recommended-tags">
      ${recommendedUses.map(use => `<span>${use}</span>`).join("")}
    </div>
  </div>
` : ""}
        <div class="bike-modal-specs">
  <div class="bike-modal-spec">
    <strong>Jarak Tempuh:</strong> ${bike.range || "-"}
  </div>

  <div class="bike-modal-spec">
    <strong>Motor:</strong> ${bike.motor || "-"}
  </div>

  <div class="bike-modal-spec">
    <strong>Waktu Pengisian:</strong> ${getChargeTime(bike)}
  </div>

  <div class="bike-modal-spec">
    <strong>Kecepatan Maks:</strong> ${bike.topSpeed || "± 40 KM/H"}
  </div>

  <div class="bike-modal-spec">
    <strong>Kapasitas Beban:</strong> ${bike.maxWeight || "± 150 KG"}
  </div>
</div>

        <p class="bike-modal-price">${formatPrice(bike.price)}</p>

        <div class="bike-modal-actions">
  <a href="${getWhatsAppLink(bike)}" target="_blank" rel="noopener" class="btn-primary">
  <span class="wa-btn-content">
    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
         alt="WhatsApp" 
         class="wa-icon">
    <span>Tanya WhatsApp</span>
  </span>
</a>
  <a href="contact.html" class="btn-secondary">
    Lihat Kontak Toko
  </a>
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
whenBikesLoaded(() => {
  renderBikes();
  updateActiveFilterButton();
  setupBikeFilters();
  setupBikeSort();
  setupBikeSearch();
  setupClearFilters();
  setupBikeModal();
});