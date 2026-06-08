const ADMIN_TOKEN_STORAGE_KEY = "nbaAdminToken";

let adminBikesCache = [];

/* =========================
   SESSION STORAGE
========================= */
function getStoredAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || "";
}

function setStoredAdminToken(token) {
  sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
}

function clearStoredAdminToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}

/* =========================
   GENERAL HELPERS
========================= */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createSlugFromName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildBikeImageBaseName(extra = "") {
  const brand = document.getElementById("bikeBrandInput")?.value.trim() || "";
  const name = document.getElementById("bikeNameInput")?.value.trim() || "";

  return [brand, name, extra]
    .filter(Boolean)
    .map(createSlugFromName)
    .filter(Boolean)
    .join("-");
}

function parseBikeColors(colors) {
  if (Array.isArray(colors)) {
    return colors;
  }

  if (typeof colors === "string") {
    try {
      const parsedColors = JSON.parse(colors);
      return Array.isArray(parsedColors) ? parsedColors : [];
    } catch (error) {
      return [];
    }
  }

  return [];
}

function setAdminMessage(message, type = "") {
  const messageElement = document.getElementById("adminLoginMessage");

  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.classList.remove("is-error", "is-success");

  if (type) {
    messageElement.classList.add(type);
  }
}

function setAdminFormNote(message, type = "") {
  const note = document.getElementById("adminFormNote");

  if (!note) {
    return;
  }

  note.textContent = message;
  note.classList.remove("is-error", "is-success");

  if (type) {
    note.classList.add(type);
  }
}

function setUploadNote(noteElement, message, type = "") {
  if (!noteElement) {
    return;
  }

  noteElement.textContent = message;
  noteElement.classList.remove("is-error", "is-success");

  if (type) {
    noteElement.classList.add(type);
  }
}

/* =========================
   PAGE VIEW STATE
========================= */
function showAdminDashboard() {
  const loginPanel = document.getElementById("adminLoginPanel");
  const dashboard = document.getElementById("adminDashboard");

  if (loginPanel) {
    loginPanel.classList.add("is-hidden");
  }

  if (dashboard) {
    dashboard.classList.remove("is-hidden");
  }

  loadAdminBikes();
}

function showAdminLogin() {
  const loginPanel = document.getElementById("adminLoginPanel");
  const dashboard = document.getElementById("adminDashboard");

  if (dashboard) {
    dashboard.classList.add("is-hidden");
  }

  if (loginPanel) {
    loginPanel.classList.remove("is-hidden");
  }
}

/* =========================
   ADMIN AUTH
========================= */
async function verifyAdminToken(token) {
  const response = await fetch("/api/admin/verify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Token admin tidak valid");
  }

  return data;
}

function setupAdminLogin() {
  const form = document.getElementById("adminLoginForm");
  const tokenInput = document.getElementById("adminTokenInput");

  if (!form || !tokenInput) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = tokenInput.value.trim();

    if (!token) {
      setAdminMessage("Masukkan token admin terlebih dahulu.", "is-error");
      return;
    }

    setAdminMessage("Memeriksa token admin...");

    try {
      await verifyAdminToken(token);

      setStoredAdminToken(token);
      setAdminMessage("Login berhasil.", "is-success");
      showAdminDashboard();
    } catch (error) {
      clearStoredAdminToken();
      setAdminMessage(error.message, "is-error");
    }
  });
}

function setupAdminLogout() {
  const logoutButton = document.getElementById("adminLogoutBtn");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", () => {
    clearStoredAdminToken();
    adminBikesCache = [];
    hideBikeEditor();
    showAdminLogin();
    setAdminMessage("Anda sudah keluar dari dashboard admin.");
  });
}

async function restoreAdminSession() {
  const token = getStoredAdminToken();

  if (!token) {
    showAdminLogin();
    return;
  }

  try {
    await verifyAdminToken(token);
    showAdminDashboard();
  } catch (error) {
    clearStoredAdminToken();
    showAdminLogin();
  }
}

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
    throw new Error(data?.error || "Gagal memuat data sepeda");
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
      const isInStock = bike.inStock && Number(bike.stockQty) > 0;
      const colorCount = parseBikeColors(bike.colors).length;

      return `
        <article class="admin-bike-list-card">
          <div class="admin-bike-list-main">
            <div>
              <p class="admin-bike-brand">${escapeHtml(bike.brand)}</p>
              <h3>${escapeHtml(bike.name)}</h3>
            </div>

            <span class="admin-stock-pill ${isInStock ? "is-in" : "is-out"}">
              ${isInStock ? `Stok ${escapeHtml(bike.stockQty)}` : "Kosong"}
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
              isInStock
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
    renderAdminBikes(bikes);
  } catch (error) {
    adminBikesCache = [];

    if (bikeList) {
      bikeList.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }
}

function setupBikeRefresh() {
  const refreshButton = document.getElementById("refreshBikesBtn");

  if (!refreshButton) {
    return;
  }

  refreshButton.addEventListener("click", loadAdminBikes);
}

/* =========================
   R2 IMAGE UPLOAD
========================= */
async function uploadImageToR2(file, folder = "bikes", fileBaseName = "") {
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
    updateMainImagePreview();
    setUploadNote(mainImageNote, "Gambar utama berhasil diupload.", "is-success");
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
    updateColorVariantPreview(card);
    setUploadNote(note, "Gambar warna berhasil diupload.", "is-success");
  }
}

/* =========================
   IMAGE PREVIEW
========================= */
function renderImagePreview(previewElement, imagePath, fallbackText) {
  if (!previewElement) {
    return;
  }

  if (!imagePath) {
    previewElement.innerHTML = `<span>${escapeHtml(fallbackText)}</span>`;
    return;
  }

  previewElement.innerHTML = `
    <img
      src="${escapeHtml(imagePath)}"
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

  const objectUrl = URL.createObjectURL(file);

  previewElement.innerHTML = `
    <img
      src="${objectUrl}"
      alt="Preview gambar upload"
      onload="URL.revokeObjectURL(this.src)"
    >
  `;
}

function updateMainImagePreview() {
  const imageInput = document.getElementById("bikeImageInput");
  const preview = document.getElementById("mainImagePreview");

  renderImagePreview(
    preview,
    imageInput?.value.trim() || "",
    "Preview gambar utama akan muncul di sini."
  );
}

function updateColorVariantPreview(card) {
  if (!card) {
    return;
  }

  const imageInput = card.querySelector("[data-color-image]");
  const preview = card.querySelector("[data-color-image-preview]");

  renderImagePreview(
    preview,
    imageInput?.value.trim() || "",
    "Preview gambar warna akan muncul di sini."
  );
}

function setupImagePreviewInputs() {
  const mainImageInput = document.getElementById("bikeImageInput");
  const mainImageUploadInput = document.getElementById("bikeMainImageUploadInput");
  const mainImagePreview = document.getElementById("mainImagePreview");

  if (mainImageInput) {
    mainImageInput.addEventListener("input", updateMainImagePreview);
  }

  if (mainImageUploadInput) {
    mainImageUploadInput.addEventListener("change", () => {
      const file = mainImageUploadInput.files?.[0];

      if (file) {
        renderLocalFilePreview(
          mainImagePreview,
          file,
          "Preview gambar utama akan muncul di sini."
        );
      } else {
        updateMainImagePreview();
      }
    });
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

        <div class="admin-form-group admin-color-variant-image">
          <label>Path Gambar Warna</label>
          <input
            type="text"
            data-color-image
            placeholder="Akan terisi otomatis setelah simpan jika upload file"
            value="${escapeHtml(image)}"
          >
        </div>

        <div class="admin-image-preview admin-color-variant-preview" data-color-image-preview>
          ${
            image
              ? `<img src="${escapeHtml(image)}" alt="Preview warna ${escapeHtml(name || index + 1)}">`
              : "<span>Preview gambar warna akan muncul di sini.</span>"
          }
        </div>

        <div class="admin-form-group admin-color-variant-image">
          <label>Upload Gambar Warna</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            data-color-image-file
          >

          <p class="admin-form-note" data-color-upload-note>
            Pilih gambar baru jika ingin mengganti gambar warna. File akan diupload saat Simpan ditekan.
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

  list.insertAdjacentHTML(
    "beforeend",
    createColorVariantCard(color, currentCount)
  );

  refreshColorVariantTitles();
}

function getColorVariantsFromForm() {
  const cards = document.querySelectorAll("[data-color-variant-card]");

  return Array.from(cards)
    .map((card) => ({
      name: card.querySelector("[data-color-name]")?.value.trim() || "",
      hex: card.querySelector("[data-color-hex]")?.value.trim() || "#cccccc",
      image: card.querySelector("[data-color-image]")?.value.trim() || ""
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

  list.addEventListener("input", (event) => {
    const imageInput = event.target.closest("[data-color-image]");

    if (!imageInput) {
      return;
    }

    const card = imageInput.closest("[data-color-variant-card]");
    updateColorVariantPreview(card);
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
    image: document.getElementById("bikeImageInput")?.value.trim() || colors[0]?.image || "",
    alt: `Sepeda listrik ${name} di showroom Lumajang`,
    comfort: document.getElementById("bikeComfortInput")?.value || "medium",
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

  if (!bike.brand) errors.push("Brand wajib diisi.");
  if (!bike.name) errors.push("Nama model wajib diisi.");
  if (!bike.id) errors.push("ID sepeda gagal dibuat.");
  if (!bike.image) errors.push("Gambar utama atau gambar warna pertama wajib diisi.");
  if (!bike.description) errors.push("Deskripsi wajib diisi.");
  if (bike.stockQty < 0) errors.push("Jumlah stok tidak boleh negatif.");

  bike.colors.forEach((color, index) => {
    if (!color.name && color.image) {
      errors.push(`Nama warna ke-${index + 1} wajib diisi jika gambar warna diisi.`);
    }

    if (color.name && !color.image) {
      errors.push(`Gambar warna ke-${index + 1} wajib diisi jika nama warna diisi.`);
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
  setBikeFormValue("bikeColorNameInput", "");
  setBikeFormChecked("bikeFeaturedInput", false);
  setBikeFormChecked("bikeInStockInput", true);
  setBikeFormValue("bikeStockQtyInput", "1");

  renderColorVariants([]);
  updateMainImagePreview();

  setAdminFormNote("Perubahan akan langsung tersimpan ke database D1.");
  setUploadNote(
    document.getElementById("mainImageUploadNote"),
    "Pilih gambar baru jika ingin mengganti Gambar Utama. File akan diupload saat tombol Simpan ditekan."
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
  setBikeFormValue("bikeSafetyInput", bike.safety);
  setBikeFormValue("bikeImageInput", bike.image);
  setBikeFormValue("bikeColorNameInput", bike.colorName);
  setBikeFormValue("bikeDescriptionInput", bike.description);
  setBikeFormChecked("bikeFeaturedInput", bike.featured);
  setBikeFormChecked("bikeInStockInput", bike.inStock);
  setBikeFormValue("bikeStockQtyInput", bike.stockQty ?? 0);

  renderColorVariants(bike.colors);
  updateMainImagePreview();

  setAdminFormNote("Perubahan akan langsung tersimpan ke database D1.");
  setUploadNote(
    document.getElementById("mainImageUploadNote"),
    "Pilih gambar baru jika ingin mengganti Gambar Utama. File akan diupload saat tombol Simpan ditekan."
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

/* =========================
   SETUP: FORM SAVE
========================= */
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

/* =========================
   SETUP: BIKE CARD ACTIONS
========================= */
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
        `Aktifkan lagi ${bike.name}? Unit ini akan kembali muncul di katalog publik dengan stok minimal 1.`
      );

      if (!confirmed) {
        return;
      }

      reactivateButton.disabled = true;
      reactivateButton.textContent = "Memproses...";

      try {
        await reactivateBike(bikeId);
        await loadAdminBikes();
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

/* =========================
   INIT
========================= */
setupAdminLogin();
setupAdminLogout();
setupBikeRefresh();
setupImagePreviewInputs();
setupColorVariantEditor();
setupBikeEditor();
setupBikeFormSave();
restoreAdminSession();