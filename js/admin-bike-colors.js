/* =========================
   ADMIN BIKE COLOUR EDITOR
========================= */

function getColorVariantFormStockTotal() {
  const cards = document.querySelectorAll("[data-color-variant-card]");

  return Array.from(cards).reduce((total, card) => {
    const stockInput = card.querySelector("[data-color-stock]");
    const stockQty = Number(stockInput?.value || 0);

    return total + Math.max(0, stockQty);
  }, 0);
}

function updateTotalStockFromColors() {
  const stockInput = document.getElementById("bikeStockQtyInput");

  if (!stockInput) {
    return;
  }

  stockInput.value = String(getColorVariantFormStockTotal());
}
function getPrimaryColorNameFromColors(colors) {
  return colors[0]?.name || "";
}

function syncDefaultColorNameFromColors() {
  const colors = getColorVariantsFromForm();

  setBikeFormValue(
    "bikeColorNameInput",
    getPrimaryColorNameFromColors(colors)
  );
}
/* =========================
   COLOR VARIANT EDITOR
========================= */
function createColorVariantCard(color = {}, index = 0) {
  const name = color.name || "";
  const hex = color.hex || "#cccccc";
  const image = color.image || "";
  const stockQty = Number(color.stockQty || 0);

  return `
    <article class="admin-color-variant-card" data-color-variant-card>
      <div class="admin-color-variant-header">
        <p class="admin-color-variant-title">Warna ${index + 1}</p>

        <button
          type="button"
          class="admin-remove-variant-btn"
          data-remove-color-variant
        >
          Hapus
        </button>
      </div>

      <div class="admin-color-variant-fields">
        <div class="admin-form-group">
          <label>Nama Warna</label>
          <input
            type="text"
            data-color-name
            placeholder="Contoh: Merah"
            value="${escapeHtml(name)}"
          >
        </div>

        <div class="admin-form-group">
          <label>Kode Warna</label>
          <input
            type="color"
            data-color-hex
            value="${escapeHtml(hex)}"
          >
        </div>

        <div class="admin-form-group">
          <label>Stok Warna</label>
          <input
            type="number"
            min="0"
            step="1"
            data-color-stock
            value="${escapeHtml(stockQty)}"
          >
        </div>

        <input
          type="hidden"
          data-color-image
          value="${escapeHtml(image)}"
        >

        <div class="admin-form-group admin-color-variant-image">
          <label>Gambar Warna</label>

          <div class="admin-image-status ${image ? "is-success" : ""}" data-color-image-status>
            ${
              image
                ? `Gambar tersimpan: ${escapeHtml(getImageFileNameFromPath(image))}`
                : "Belum ada gambar warna."
            }
          </div>

          <div class="admin-image-preview admin-color-variant-preview" data-color-image-preview>
            ${
              image
                ? `<img src="${escapeHtml(normalizeBikeImagePath(image, "bikes/colors"))}" alt="Preview warna ${escapeHtml(name || index + 1)}">`
                : "<span>Preview gambar warna akan muncul di sini.</span>"
            }
          </div>
        </div>

        <div class="admin-form-group admin-color-variant-image">
          <label>Upload Gambar Warna</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            data-color-image-file
          >

          <p class="admin-form-note" data-color-upload-note>
            Pilih gambar warna. Path akan dibuat otomatis saat Simpan.
          </p>
        </div>
      </div>
    </article>
  `;
}

function refreshColorVariantTitles() {
  const cards = document.querySelectorAll("[data-color-variant-card]");

  cards.forEach((card, index) => {
    const title = card.querySelector(".admin-color-variant-title");

    if (title) {
      title.textContent = `Warna ${index + 1}`;
    }
  });
}

function renderColorVariants(colors = []) {
  const list = document.getElementById("colorVariantList");
  const parsedColors = parseBikeColors(colors);

  if (!list) {
    return;
  }

  if (!parsedColors.length) {
    list.innerHTML = `
      <div class="admin-empty-state">
        Belum ada pilihan warna. Klik Tambah Warna untuk mulai.
      </div>
    `;

    updateTotalStockFromColors();
    syncDefaultColorNameFromColors();
    return;
  }

  list.innerHTML = parsedColors
    .map((color, index) => createColorVariantCard(color, index))
    .join("");

  updateTotalStockFromColors();
  syncDefaultColorNameFromColors();
}

function addColorVariant(color = {}) {
  const list = document.getElementById("colorVariantList");

  if (!list) {
    return;
  }

  const emptyState = list.querySelector(".admin-empty-state");

  if (emptyState) {
    list.innerHTML = "";
  }

  const currentCount = list.querySelectorAll("[data-color-variant-card]").length;

  list.insertAdjacentHTML(
    "beforeend",
    createColorVariantCard(color, currentCount)
  );

  refreshColorVariantTitles();
  updateTotalStockFromColors();
  syncDefaultColorNameFromColors();
}

function getColorVariantsFromForm() {
  const cards = document.querySelectorAll("[data-color-variant-card]");

  return Array.from(cards)
    .map((card) => ({
      name: card.querySelector("[data-color-name]")?.value.trim() || "",
      hex: card.querySelector("[data-color-hex]")?.value.trim() || "#cccccc",
      stockQty: Math.max(0, Number(card.querySelector("[data-color-stock]")?.value || 0)),
      image: normalizeBikeImagePath(
        card.querySelector("[data-color-image]")?.value.trim() || "",
        "bikes/colors"
      )
    }))
    .filter((color) => color.name || color.image || color.stockQty > 0);
}

function setupColorVariantEditor() {
  const addButton = document.getElementById("addColorVariantBtn");
  const list = document.getElementById("colorVariantList");

  if (addButton) {
    addButton.addEventListener("click", () => {
      addColorVariant();
    });
  }

  if (!list) {
    return;
  }

  list.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-color-variant]");

    if (!removeButton) {
      return;
    }

    const card = removeButton.closest("[data-color-variant-card]");

    if (card) {
      card.remove();
    }

    if (!list.querySelector("[data-color-variant-card]")) {
      renderColorVariants([]);
      return;
    }

    refreshColorVariantTitles();
    updateTotalStockFromColors();
    syncDefaultColorNameFromColors();
  });

  list.addEventListener("change", (event) => {
    const fileInput = event.target.closest("[data-color-image-file]");

    if (!fileInput) {
      return;
    }

    const card = fileInput.closest("[data-color-variant-card]");
    const preview = card?.querySelector("[data-color-image-preview]");
    const file = fileInput.files?.[0];

    if (file) {
      renderLocalFilePreview(
        preview,
        file,
        "Preview gambar warna akan muncul di sini."
      );
      return;
    }

    updateColorVariantPreview(card);
  });

  list.addEventListener("input", (event) => {
    const colorNameInput = event.target.closest("[data-color-name]");
    const stockInput = event.target.closest("[data-color-stock]");

    if (!colorNameInput && !stockInput) {
      return;
    }

    updateTotalStockFromColors();
    syncDefaultColorNameFromColors();
  });
}