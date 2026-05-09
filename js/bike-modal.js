function openBikeModal(bikeId) {
  const bikeModal = document.getElementById("bikeModal");
  const bikeModalBody = document.getElementById("bikeModalBody");
  const bike = getBikeById(bikeId);

  if (!bikeModal || !bikeModalBody || !bike) {
    return;
  }

  const highlights = getHighlights(bike);
  const recommendedUses = getRecommendedUses(bike);
  const brandTheme = getBrandTheme(bike.brand);

  bikeModalBody.innerHTML = `
    <div class="bike-modal-layout bike-brand-theme ${brandTheme.className}">
      <div class="bike-modal-image">
        <img src="${bike.image}" alt="${bike.alt}">
      </div>

      <div class="bike-modal-details">
        <div class="bike-modal-brand-row">
          ${brandTheme.logo ? `
            <img 
              src="${brandTheme.logo}" 
              alt="${bike.brand} logo"
              class="bike-modal-brand-logo"
            >
          ` : ""}

          <p class="bike-modal-brand">${bike.brand}</p>
        </div>

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
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
                alt="WhatsApp" 
                class="wa-icon"
              >
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

function setupBikeModalControls() {
  const bikeModalClose = document.getElementById("bikeModalClose");
  const bikeModalOverlay = document.getElementById("bikeModalOverlay");

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