/* =========================
   ADMIN BIKE LIST
========================= */
async function fetchAdminBikes() {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/bikes", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal memuat data sepeda.");
  }

  return data.bikes || [];
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
      const colorCount = parseBikeColors(bike.colors).length;

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
  } catch (error) {
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

  if (refreshButton) {
    refreshButton.addEventListener("click", loadAdminBikes);
  }
}

function setupAdminBikeFilters() {
  const searchInput = document.getElementById("adminBikeSearchInput");
  const statusFilter = document.getElementById("adminBikeStatusFilter");
  const brandFilter = document.getElementById("adminBikeBrandFilter");

  if (searchInput) {
    searchInput.addEventListener("input", applyAdminBikeFilters);
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", applyAdminBikeFilters);
  }

  if (brandFilter) {
    brandFilter.addEventListener("change", applyAdminBikeFilters);
  }
}

/* =========================
   R2 IMAGE UPLOAD
========================= */
function buildBikeImageBaseName(extra = "") {
  const brand = document.getElementById("bikeBrandInput")?.value.trim() || "";
  const name = document.getElementById("bikeNameInput")?.value.trim() || "";

  return [brand, name, extra]
    .filter(Boolean)
    .map(createSlugFromName)
    .filter(Boolean)
    .join("-");
}

async function uploadImageToR2(file, folder = "bikes", fileBaseName = "") {
  if (!file || !(file instanceof File)) {
    throw new Error("File gambar tidak ditemukan. Pilih gambar terlebih dahulu.");
  }

  const token = getStoredAdminToken();
  const formData = new FormData();

  formData.append("image", file);
  formData.append("folder", folder);
  formData.append("fileBaseName", fileBaseName);

  const response = await fetch("/api/admin/upload-image", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal upload gambar.");
  }

  return data.imagePath;
}

async function uploadPendingBikeImages() {
  const mainImageFileInput = document.getElementById("bikeMainImageUploadInput");
  const mainImageInput = document.getElementById("bikeImageInput");
  const mainImageNote = document.getElementById("mainImageUploadNote");
  const mainImageFile = mainImageFileInput?.files?.[0];

  if (mainImageFile && mainImageInput) {
    setUploadNote(mainImageNote, "Mengupload gambar utama...");

    const mainImagePath = await uploadImageToR2(
      mainImageFile,
      "bikes",
      buildBikeImageBaseName("main")
    );

    mainImageInput.value = mainImagePath;

    if (mainImageFileInput) {
      mainImageFileInput.value = "";
    }

    updateMainImagePreview();
    setUploadNote(mainImageNote, "Gambar utama berhasil diupload dan path dibuat otomatis.", "is-success");
  }

  const colorCards = document.querySelectorAll("[data-color-variant-card]");

  for (const card of colorCards) {
    const fileInput = card.querySelector("[data-color-image-file]");
    const imageInput = card.querySelector("[data-color-image]");
    const note = card.querySelector("[data-color-upload-note]");
    const colorName = card.querySelector("[data-color-name]")?.value.trim() || "warna";
    const file = fileInput?.files?.[0];

    if (!file || !imageInput) {
      continue;
    }

    setUploadNote(note, "Mengupload gambar warna...");

    const imagePath = await uploadImageToR2(
      file,
      "bikes/colors",
      buildBikeImageBaseName(colorName)
    );

    imageInput.value = imagePath;

    if (fileInput) {
      fileInput.value = "";
    }

    updateColorVariantPreview(card);
    setUploadNote(note, "Gambar warna berhasil diupload dan path dibuat otomatis.", "is-success");
  }
}

/* =========================
   IMAGE PREVIEW
========================= */
function normalizeBikeImagePath(imagePath, fallbackFolder = "bikes") {
  const value = String(imagePath || "").trim();

  if (!value) {
    return "";
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    value.startsWith("images/")
  ) {
    return value;
  }

  if (value.startsWith("api/images/")) {
    return `/${value}`;
  }

  if (value.startsWith("bikes/")) {
    return `/api/images/${value}`;
  }

  return `/api/images/${fallbackFolder}/${value}`;
}
function getImageFileNameFromPath(imagePath) {
  if (!imagePath) {
    return "";
  }

  return String(imagePath).split("/").filter(Boolean).pop() || imagePath;
}

function updateImageStatus(statusElement, imagePath, hasPendingFile = false) {
  if (!statusElement) {
    return;
  }

  statusElement.classList.remove("is-success", "is-warning");

  if (hasPendingFile) {
    statusElement.textContent = "Gambar baru dipilih. Path akan dibuat otomatis saat Simpan.";
    statusElement.classList.add("is-warning");
    return;
  }

  if (imagePath) {
    statusElement.textContent = `Gambar tersimpan: ${getImageFileNameFromPath(imagePath)}`;
    statusElement.classList.add("is-success");
    return;
  }

  statusElement.textContent = "Belum ada gambar.";
}

function renderImagePreview(previewElement, imagePath, fallbackText) {
  if (!previewElement) {
    return;
  }

  const normalizedPath = normalizeBikeImagePath(imagePath);

  if (!normalizedPath) {
    previewElement.innerHTML = `<span>${escapeHtml(fallbackText)}</span>`;
    return;
  }

  previewElement.innerHTML = `
    <img
      src="${escapeHtml(normalizedPath)}"
      alt="Preview gambar"
      onerror="this.parentElement.innerHTML='<span>Gambar tidak bisa dimuat.</span>'"
    >
  `;
}

function renderLocalFilePreview(previewElement, file, fallbackText) {
  if (!previewElement) {
    return;
  }

  if (!file) {
    renderImagePreview(previewElement, "", fallbackText);
    return;
  }

  const objectUrl = window.URL.createObjectURL(file);
  const image = document.createElement("img");

  image.src = objectUrl;
  image.alt = "Preview gambar upload";

  image.addEventListener("load", () => {
    if (window.URL && typeof window.URL.revokeObjectURL === "function") {
      window.URL.revokeObjectURL(objectUrl);
    }
  });

  image.addEventListener("error", () => {
    previewElement.innerHTML = "<span>Gambar tidak bisa dimuat.</span>";

    if (window.URL && typeof window.URL.revokeObjectURL === "function") {
      window.URL.revokeObjectURL(objectUrl);
    }
  });

  previewElement.innerHTML = "";
  previewElement.appendChild(image);
}

function updateMainImagePreview() {
  const imageInput = document.getElementById("bikeImageInput");
  const preview = document.getElementById("mainImagePreview");
  const status = document.getElementById("mainImageStatus");
  const uploadInput = document.getElementById("bikeMainImageUploadInput");

  const imagePath = imageInput?.value.trim() || "";
  const hasPendingFile = Boolean(uploadInput?.files?.[0]);

  if (hasPendingFile) {
    renderLocalFilePreview(
      preview,
      uploadInput.files[0],
      "Preview gambar utama akan muncul di sini."
    );
  } else {
    renderImagePreview(
      preview,
      imagePath,
      "Preview gambar utama akan muncul di sini."
    );
  }

  updateImageStatus(status, imagePath, hasPendingFile);
}

function updateColorVariantPreview(card) {
  if (!card) {
    return;
  }

  const imageInput = card.querySelector("[data-color-image]");
  const fileInput = card.querySelector("[data-color-image-file]");
  const preview = card.querySelector("[data-color-image-preview]");
  const status = card.querySelector("[data-color-image-status]");

  const imagePath = imageInput?.value.trim() || "";
  const hasPendingFile = Boolean(fileInput?.files?.[0]);

  if (hasPendingFile) {
    renderLocalFilePreview(
      preview,
      fileInput.files[0],
      "Preview gambar warna akan muncul di sini."
    );
  } else {
    renderImagePreview(
      preview,
      imagePath,
      "Preview gambar warna akan muncul di sini."
    );
  }

  updateImageStatus(status, imagePath, hasPendingFile);
}

function setupImagePreviewInputs() {
  const mainImageUploadInput = document.getElementById("bikeMainImageUploadInput");

  if (mainImageUploadInput) {
    mainImageUploadInput.addEventListener("change", updateMainImagePreview);
  }
}
/* =========================
   COLOR VARIANT EDITOR
========================= */
function createColorVariantCard(color = {}, index = 0) {
  const name = color.name || "";
  const hex = color.hex || "#cccccc";
  const image = color.image || "";

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
                ? `<img src="${escapeHtml(image)}" alt="Preview warna ${escapeHtml(name || index + 1)}">`
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
    return;
  }

  list.innerHTML = parsedColors
    .map((color, index) => createColorVariantCard(color, index))
    .join("");
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

  list.insertAdjacentHTML("beforeend", createColorVariantCard(color, currentCount));
  refreshColorVariantTitles();
}

function getColorVariantsFromForm() {
  const cards = document.querySelectorAll("[data-color-variant-card]");

  return Array.from(cards)
    .map((card) => ({
      name: card.querySelector("[data-color-name]")?.value.trim() || "",
      hex: card.querySelector("[data-color-hex]")?.value.trim() || "#cccccc",
      image: normalizeBikeImagePath(
  card.querySelector("[data-color-image]")?.value.trim() || "",
  "bikes/colors"
)
    }))
    .filter((color) => color.name || color.image);
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
      refreshColorVariantTitles();
    }

    if (!list.querySelector("[data-color-variant-card]")) {
      renderColorVariants([]);
    }
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
    } else {
      updateColorVariantPreview(card);
    }
  });
}
/* =========================
   BIKE FORM DATA
========================= */
function getBikeFormData() {
  const existingId = document.getElementById("bikeIdInput")?.value.trim();
  const brand = document.getElementById("bikeBrandInput")?.value.trim();
  const name = document.getElementById("bikeNameInput")?.value.trim();
  const generatedId = `${createSlugFromName(brand)}-${createSlugFromName(name)}`;
  const colors = getColorVariantsFromForm();

  const defaultColorName =
    document.getElementById("bikeColorNameInput")?.value.trim() ||
    colors[0]?.name ||
    "";

  return {
    id: existingId || generatedId,
    brand,
    name,
    battery: document.getElementById("bikeBatteryInput")?.value.trim() || "",
    motor: document.getElementById("bikeMotorInput")?.value.trim() || "",
    topSpeed: document.getElementById("bikeTopSpeedInput")?.value.trim() || "",
    range: document.getElementById("bikeRangeInput")?.value.trim() || "",
    maxWeight: document.getElementById("bikeMaxWeightInput")?.value.trim() || "",
    safety: document.getElementById("bikeSafetyInput")?.value.trim() || "",
    image: normalizeBikeImagePath(
  document.getElementById("bikeImageInput")?.value.trim() || colors[0]?.image || "",
  "bikes"
),
    alt: `Sepeda listrik ${name} di showroom Lumajang`,
    comfort: document.getElementById("bikeComfortInput")?.value || "medium",
    price: Number(document.getElementById("bikePriceInput")?.value || 0),
    colorName: defaultColorName,
    colors,
    description: document.getElementById("bikeDescriptionInput")?.value.trim() || "",
    featured: Boolean(document.getElementById("bikeFeaturedInput")?.checked),
    inStock: Boolean(document.getElementById("bikeInStockInput")?.checked),
    stockQty: Number(document.getElementById("bikeStockQtyInput")?.value || 0)
  };
}

function validateBikeFormData(bike) {
  const errors = [];
  const mainImageFile = document.getElementById("bikeMainImageUploadInput")?.files?.[0];

  if (!bike.brand) errors.push("Brand wajib diisi.");
  if (!bike.name) errors.push("Nama model wajib diisi.");
  if (!bike.id) errors.push("ID sepeda gagal dibuat.");
  if (!bike.description) errors.push("Deskripsi wajib diisi.");
  if (bike.price < 0) errors.push("Harga tidak boleh negatif.");
  if (bike.stockQty < 0) errors.push("Stok internal tidak boleh negatif.");

  const hasMainImage = Boolean(bike.image);
  const hasPendingMainImage = Boolean(mainImageFile);
  const hasColorImage = bike.colors.some((color) => Boolean(color.image));

  if (!hasMainImage && !hasPendingMainImage && !hasColorImage) {
    errors.push("Upload gambar utama atau gambar warna minimal satu.");
  }

  bike.colors.forEach((color, index) => {
    if (!color.name && color.image) {
      errors.push(`Nama warna ke-${index + 1} wajib diisi jika gambar warna ada.`);
    }
  });

  return errors;
}

/* =========================
   BIKE EDITOR UI
========================= */
function showBikeEditor() {
  const panel = document.getElementById("adminBikeEditorPanel");

  if (panel) {
    panel.classList.remove("is-hidden");
  }
}

function hideBikeEditor() {
  const panel = document.getElementById("adminBikeEditorPanel");

  if (panel) {
    panel.classList.add("is-hidden");
  }
}

function setBikeFormValue(id, value) {
  const input = document.getElementById(id);

  if (input) {
    input.value = value ?? "";
  }
}

function setBikeFormChecked(id, value) {
  const input = document.getElementById(id);

  if (input) {
    input.checked = Boolean(value);
  }
}

function resetBikeEditorForm() {
  const title = document.getElementById("adminBikeEditorTitle");
  const form = document.getElementById("adminBikeForm");
  const mainImageUploadInput = document.getElementById("bikeMainImageUploadInput");

  if (title) {
    title.textContent = "Tambah Sepeda";
  }

  if (form) {
    form.reset();
  }

  if (mainImageUploadInput) {
    mainImageUploadInput.value = "";
  }

  setBikeFormValue("bikeIdInput", "");
  setBikeFormValue("bikeComfortInput", "medium");
  setBikeFormValue("bikePriceInput", "0");
  setBikeFormValue("bikeColorNameInput", "");
  setBikeFormChecked("bikeFeaturedInput", false);
  setBikeFormChecked("bikeInStockInput", true);
  setBikeFormValue("bikeStockQtyInput", isCurrentUserAdmin() ? "1" : "0");

  renderColorVariants([]);
  updateMainImagePreview();
document.querySelectorAll("[data-color-variant-card]").forEach(updateColorVariantPreview);
  setAdminFormNote(
    isCurrentUserAdmin()
      ? "Admin bisa mengatur stok internal."
      : "Staff bisa mengedit katalog, tetapi tidak bisa menambah stok internal."
  );

  setUploadNote(
    document.getElementById("mainImageUploadNote"),
    "Pilih gambar baru jika ingin mengganti gambar utama. File akan diupload saat tombol Simpan ditekan."
  );
}

function fillBikeEditorForm(bike) {
  const title = document.getElementById("adminBikeEditorTitle");
  const mainImageUploadInput = document.getElementById("bikeMainImageUploadInput");

  if (title) {
    title.textContent = `Edit ${bike.name}`;
  }

  if (mainImageUploadInput) {
    mainImageUploadInput.value = "";
  }

  setBikeFormValue("bikeIdInput", bike.id);
  setBikeFormValue("bikeBrandInput", bike.brand);
  setBikeFormValue("bikeNameInput", bike.name);
  setBikeFormValue("bikeBatteryInput", bike.battery);
  setBikeFormValue("bikeMotorInput", bike.motor);
  setBikeFormValue("bikeTopSpeedInput", bike.topSpeed);
  setBikeFormValue("bikeRangeInput", bike.range);
  setBikeFormValue("bikeMaxWeightInput", bike.maxWeight);
  setBikeFormValue("bikeComfortInput", bike.comfort || "medium");
  setBikeFormValue("bikePriceInput", bike.price ?? 0);
  setBikeFormValue("bikeSafetyInput", bike.safety);
  setBikeFormValue("bikeImageInput", bike.image);
  setBikeFormValue("bikeColorNameInput", bike.colorName);
  setBikeFormValue("bikeDescriptionInput", bike.description);
  setBikeFormChecked("bikeFeaturedInput", bike.featured);
  setBikeFormChecked("bikeInStockInput", bike.inStock);
  setBikeFormValue("bikeStockQtyInput", bike.stockQty ?? 0);

  renderColorVariants(bike.colors);
  updateMainImagePreview();
document.querySelectorAll("[data-color-variant-card]").forEach(updateColorVariantPreview);
  setAdminFormNote(
    isCurrentUserAdmin()
      ? "Admin bisa mengatur stok internal."
      : "Staff bisa mengedit katalog, tetapi tidak bisa menambah stok internal."
  );

  setUploadNote(
    document.getElementById("mainImageUploadNote"),
    "Pilih gambar baru jika ingin mengganti gambar utama. File akan diupload saat tombol Simpan ditekan."
  );
}

/* =========================
   BIKE DATABASE ACTIONS
========================= */
async function saveBikeToDatabase(bike, isEditing) {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/bikes", {
    method: isEditing ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(bike)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const apiErrors = Array.isArray(data?.errors)
      ? ` ${data.errors.join(" ")}`
      : "";

    throw new Error((data?.error || "Gagal menyimpan sepeda.") + apiErrors);
  }

  return data.bike;
}

async function deactivateBike(id) {
  const token = getStoredAdminToken();

  const response = await fetch(`/api/admin/bikes?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal menonaktifkan sepeda.");
  }

  return data;
}

async function reactivateBike(id) {
  const token = getStoredAdminToken();

  const response = await fetch(
    `/api/admin/bikes?id=${encodeURIComponent(id)}&mode=reactivate`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal mengaktifkan sepeda.");
  }

  return data;
}

function setupBikeFormSave() {
  const form = document.getElementById("adminBikeForm");
  const saveButton = document.getElementById("saveBikeBtn");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Menyimpan...";
    }

    setAdminFormNote("Menyiapkan data dan upload gambar...");

    try {
      await uploadPendingBikeImages();

      const bike = getBikeFormData();
      const errors = validateBikeFormData(bike);
      const isEditing = Boolean(document.getElementById("bikeIdInput")?.value.trim());

      if (errors.length) {
        setAdminFormNote(errors.join(" "), "is-error");
        return;
      }

      setAdminFormNote("Menyimpan data sepeda ke database...");

      await saveBikeToDatabase(bike, isEditing);

      setAdminFormNote("Data sepeda berhasil disimpan.", "is-success");
      await loadAdminBikes();

      if (isCurrentUserAdmin() && typeof loadAuditLogs === "function") {
        loadAuditLogs();
      }

      if (!isEditing) {
        fillBikeEditorForm(bike);
      }
    } catch (error) {
      setAdminFormNote(error.message, "is-error");
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Simpan ke Database";
      }
    }
  });
}

function setupBikeEditor() {
  const addButton = document.getElementById("addBikeBtn");
  const closeButton = document.getElementById("closeBikeEditorBtn");
  const bikeList = document.getElementById("adminBikeList");

  if (addButton) {
    addButton.addEventListener("click", () => {
      resetBikeEditorForm();
      showBikeEditor();
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", hideBikeEditor);
  }

  if (!bikeList) {
    return;
  }

  bikeList.addEventListener("click", async (event) => {
    const reactivateButton = event.target.closest("[data-admin-reactivate-bike]");

    if (reactivateButton) {
      const bikeId = reactivateButton.dataset.adminReactivateBike;
      const bike = adminBikesCache.find((item) => item.id === bikeId);

      if (!bike) {
        return;
      }

      const confirmed = window.confirm(
        `Aktifkan lagi ${bike.name}? Unit ini akan kembali muncul di katalog publik.`
      );

      if (!confirmed) {
        return;
      }

      reactivateButton.disabled = true;
      reactivateButton.textContent = "Memproses...";

      try {
        await reactivateBike(bikeId);
        await loadAdminBikes();

        if (isCurrentUserAdmin() && typeof loadAuditLogs === "function") {
          loadAuditLogs();
        }
      } catch (error) {
        window.alert(error.message);
        reactivateButton.disabled = false;
        reactivateButton.textContent = "Aktifkan Lagi";
      }

      return;
    }

    const deactivateButton = event.target.closest("[data-admin-deactivate-bike]");

    if (deactivateButton) {
      const bikeId = deactivateButton.dataset.adminDeactivateBike;
      const bike = adminBikesCache.find((item) => item.id === bikeId);

      if (!bike) {
        return;
      }

      const confirmed = window.confirm(
        `Nonaktifkan ${bike.name}? Unit ini akan hilang dari katalog publik, tetapi datanya tetap tersimpan di admin.`
      );

      if (!confirmed) {
        return;
      }

      deactivateButton.disabled = true;
      deactivateButton.textContent = "Memproses...";

      try {
        await deactivateBike(bikeId);
        hideBikeEditor();
        await loadAdminBikes();

        if (isCurrentUserAdmin() && typeof loadAuditLogs === "function") {
          loadAuditLogs();
        }
      } catch (error) {
        window.alert(error.message);
        deactivateButton.disabled = false;
        deactivateButton.textContent = "Nonaktifkan";
      }

      return;
    }

    const editButton = event.target.closest("[data-admin-edit-bike]");

    if (!editButton) {
      return;
    }

    const bikeId = editButton.dataset.adminEditBike;
    const bike = adminBikesCache.find((item) => item.id === bikeId);

    if (!bike) {
      return;
    }

    fillBikeEditorForm(bike);
    showBikeEditor();
  });
}