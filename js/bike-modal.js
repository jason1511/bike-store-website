function getModalBikeColors(bike) {
  if (typeof getBikeColors === "function") {
    return getBikeColors(bike);
  }

  const colors = Array.isArray(bike.colors) ? bike.colors : [];

  return colors
    .map((color) => ({
      name: String(color.name || "").trim(),
      hex: String(color.hex || "#cccccc").trim(),
      image: String(color.image || "").trim(),
      stockQty: Math.max(0, Number(color.stockQty || 0))
    }))
    .filter((color) => color.name || color.image || color.stockQty > 0);
}

function getModalBikePrimaryColor(bike) {
  const colors = getModalBikeColors(bike);

  return colors.find((color) => color.stockQty > 0 && color.image)
    || colors.find((color) => color.image)
    || colors.find((color) => color.stockQty > 0)
    || colors[0]
    || null;
}

function getModalBikeTotalStock(bike) {
  if (typeof getBikeTotalStock === "function") {
    return getBikeTotalStock(bike);
  }

  const colorStockTotal = getModalBikeColors(bike).reduce((total, color) => {
    return total + Math.max(0, Number(color.stockQty || 0));
  }, 0);

  return colorStockTotal > 0
    ? colorStockTotal
    : Math.max(0, Number(bike.stockQty || 0));
}

function getModalBikeDisplayImage(bike) {
  const primaryColor = getModalBikePrimaryColor(bike);

  return primaryColor?.image || bike.image || "images/logo.jpeg";
}

function updateModalStockLabel(modalLayout, colorName, stockQty) {
  const stockLabel = modalLayout.querySelector(".bike-modal-selected-stock");

  if (!stockLabel) {
    return;
  }

  const safeStockQty = Math.max(0, Number(stockQty || 0));
  const isAvailable = safeStockQty > 0;

  stockLabel.textContent = isAvailable
    ? "Tersedia"
    : "Tidak tersedia";

  stockLabel.classList.toggle("is-empty", !isAvailable);
  stockLabel.classList.toggle("is-available", isAvailable);
}
function switchBikeModalColor(button) {
  if (button.disabled) {
    return;
  }

  const modalLayout = button.closest(".bike-modal-layout");

  if (!modalLayout) {
    return;
  }

  const modalImage = modalLayout.querySelector(".bike-modal-main-image");
  const colorLabel = modalLayout.querySelector(".bike-modal-color");
  const newImage = button.dataset.bikeColorImage;
  const newColorName = button.dataset.bikeColorName;
  const newStockQty = Number(button.dataset.bikeColorStock || 0);

  if (modalImage && newImage) {
    modalImage.src = newImage;
  }

  if (colorLabel && newColorName) {
    colorLabel.textContent = `Warna: ${newColorName}`;
  }

  updateModalStockLabel(modalLayout, newColorName, newStockQty);

  modalLayout.querySelectorAll(".bike-color-dot").forEach((dot) => {
    dot.classList.remove("is-active");
  });

  button.classList.add("is-active");
}

function openBikeModal(bikeId) {
  const bikeModal = document.getElementById("bikeModal");
  const bikeModalBody = document.getElementById("bikeModalBody");
  const bike = getBikeById(bikeId);

  if (!bikeModal || !bikeModalBody || !bike) {
    return;
  }

  const brandTheme = getBrandTheme(bike.brand);
  const highlights = getHighlights(bike);
  const recommendedUses = getRecommendedUses(bike);
  const colorVariants = getModalBikeColors(bike);
  const defaultColor = getModalBikePrimaryColor(bike);
  const totalStock = getModalBikeTotalStock(bike);

  const imageSrc = getModalBikeDisplayImage(bike);
  const colorName = defaultColor?.name || bike.colorName || "";
  const selectedColorStock = defaultColor
    ? Number(defaultColor.stockQty || 0)
    : totalStock;
  const imageAlt = bike.alt || `Sepeda listrik ${bike.name || bike.brand || ""}`;
  const isAvailable = Boolean(bike.inStock) && totalStock > 0;

  bikeModalBody.innerHTML = `
    <div class="bike-modal-layout bike-brand-theme ${brandTheme.className}">
      <div class="bike-modal-image">
        <img
          src="${escapeHtml(imageSrc)}"
          alt="${escapeHtml(imageAlt)}"
          class="bike-modal-main-image"
        >
      </div>

      <div class="bike-modal-details">
        <div class="bike-modal-brand-row">
          ${
            brandTheme.logo
              ? `
                <img
                  src="${escapeHtml(brandTheme.logo)}"
                  alt="${escapeHtml(bike.brand)} logo"
                  class="bike-modal-brand-logo"
                >
              `
              : ""
          }

          <p class="bike-modal-brand">${escapeHtml(bike.brand)}</p>
        </div>

        <h2 id="bikeModalTitle">${escapeHtml(bike.name)}</h2>

        <p class="bike-modal-stock ${isAvailable ? "is-available" : "is-empty"}">
  ${isAvailable ? "Tersedia" : "Tidak tersedia"}
</p>

        ${
          colorName
            ? `
              <p class="bike-modal-color">
                Warna: ${escapeHtml(colorName)}
              </p>
            `
            : ""
        }

        ${
          colorVariants.length
            ? `
              <div class="bike-color-options bike-modal-color-options" aria-label="Pilihan warna ${escapeHtml(bike.name)}">
                ${colorVariants
                  .map((color) => {
                    const stockQty = Number(color.stockQty || 0);
                    const isColorAvailable = stockQty > 0;
                    const isActive = defaultColor && color.name === defaultColor.name;

                    return `
                      <button
                        type="button"
                        class="bike-color-dot ${isActive ? "is-active" : ""} ${isColorAvailable ? "is-available" : "is-empty"}"
                        style="--bike-color-dot: ${escapeHtml(color.hex || "#cccccc")};"
                        data-bike-color-image="${escapeHtml(color.image || bike.image || imageSrc)}"
                        data-bike-color-name="${escapeHtml(color.name || "")}"
                        data-bike-color-stock="${stockQty}"
                        onclick="event.stopPropagation(); switchBikeModalColor(this);"
                        aria-label="Warna ${escapeHtml(color.name || "unit")} - ${stockQty} unit"
                        title="${escapeHtml(color.name || "Warna")} - stok ${stockQty}"
                        ${isColorAvailable ? "" : "disabled"}
                      ></button>
                    `;
                  })
                  .join("")}
              </div>

              <<p class="bike-modal-selected-stock ${selectedColorStock > 0 ? "is-available" : "is-empty"}">
  ${selectedColorStock > 0 ? "Tersedia" : "Tidak tersedia"}
</p>
            `
            : ""
        }

        <p class="bike-modal-description">
          ${escapeHtml(bike.description || "Sepeda listrik untuk kebutuhan mobilitas harian.")}
        </p>

        ${
          highlights.length
            ? `
              <div class="bike-highlights">
                ${highlights
                  .map((highlight) => `<span class="highlight-badge">${escapeHtml(highlight)}</span>`)
                  .join("")}
              </div>
            `
            : ""
        }

        ${
          recommendedUses.length
            ? `
              <div class="bike-recommended">
                <h3>Cocok untuk:</h3>

                <div class="recommended-tags">
                  ${recommendedUses
                    .map((use) => `<span>${escapeHtml(use)}</span>`)
                    .join("")}
                </div>
              </div>
            `
            : ""
        }

        <div class="bike-modal-specs">
          <div class="bike-modal-spec">
            <strong>Jarak Tempuh:</strong> ${escapeHtml(bike.range || "-")}
          </div>

          <div class="bike-modal-spec">
            <strong>Motor:</strong> ${escapeHtml(bike.motor || "-")}
          </div>

          <div class="bike-modal-spec">
            <strong>Waktu Pengisian:</strong> ${escapeHtml(getChargeTime(bike))}
          </div>

          <div class="bike-modal-spec">
            <strong>Kecepatan Maks:</strong> ${escapeHtml(bike.topSpeed || "± 40 KM/H")}
          </div>

          <div class="bike-modal-spec">
            <strong>Kapasitas Beban:</strong> ${escapeHtml(bike.maxWeight || "± 150 KG")}
          </div>
        </div>

        <p class="bike-modal-price">${formatPrice(bike.price)}</p>

        <div class="bike-modal-actions">
          <a
            href="${getWhatsAppLink(bike)}"
            target="_blank"
            rel="noopener"
            class="btn-primary"
          >
            <span class="wa-btn-content">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                alt="WhatsApp"
                class="wa-icon"
              >
              <span>${isAvailable ? "Tanya WhatsApp" : "Tanya Ketersediaan"}</span>
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

setupBikeModalControls();