const ADMIN_SESSION_STORAGE_KEY = "nbaAdminSessionToken";
const ADMIN_USER_STORAGE_KEY = "nbaAdminUser";

let adminBikesCache = [];
let adminServicesCache = [];

/* =========================
   SESSION STORAGE
========================= */
function getStoredAdminToken() {
  return sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || "";
}

function getStoredAdminUser() {
  try {
    return JSON.parse(sessionStorage.getItem(ADMIN_USER_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function setStoredAdminSession(token, user) {
  sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token);
  sessionStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(user));
}

function clearStoredAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  sessionStorage.removeItem(ADMIN_USER_STORAGE_KEY);
}

function isCurrentUserAdmin() {
  const user = getStoredAdminUser();
  return user?.role === "admin";
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

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().trim();
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

  if (!messageElement) return;

  messageElement.textContent = message;
  messageElement.classList.remove("is-error", "is-success");

  if (type) {
    messageElement.classList.add(type);
  }
}

function setAdminFormNote(message, type = "") {
  const note = document.getElementById("adminFormNote");

  if (!note) return;

  note.textContent = message;
  note.classList.remove("is-error", "is-success");

  if (type) {
    note.classList.add(type);
  }
}

function setUploadNote(noteElement, message, type = "") {
  if (!noteElement) return;

  noteElement.textContent = message;
  noteElement.classList.remove("is-error", "is-success");

  if (type) {
    noteElement.classList.add(type);
  }
}

/* =========================
   FAKE PAGE NAVIGATION
========================= */
function configureAdminNavigationForRole() {
  const isAdmin = isCurrentUserAdmin();
  const adminOnlyLinks = document.querySelectorAll("[data-admin-only]");
  const adminOnlyViews = document.querySelectorAll("[data-admin-only-view]");

  adminOnlyLinks.forEach((element) => {
    element.classList.toggle("is-hidden", !isAdmin);
  });

  adminOnlyViews.forEach((element) => {
    element.classList.toggle("is-hidden", !isAdmin);
  });
}

function showAdminView(viewId) {
  const isAdmin = isCurrentUserAdmin();
  const targetView = document.getElementById(viewId);

  if (!targetView) {
    return;
  }

  if (targetView.hasAttribute("data-admin-only-view") && !isAdmin) {
    showAdminView("adminCatalogueView");
    return;
  }

  document.querySelectorAll(".admin-view").forEach((view) => {
    view.classList.toggle("is-active", view.id === viewId);
  });

  document.querySelectorAll("[data-admin-view-target]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminViewTarget === viewId);
  });

  if (viewId === "adminCatalogueView") {
    loadAdminBikes();
  }

  if (viewId === "adminSalesView") {
    loadInvoicePage();
  }

  if (viewId === "adminServiceView") {
    loadServicePage();
  }

  if (viewId === "adminUsersView" && isAdmin) {
    loadAdminUsers();
  }

  if (viewId === "adminAuditView" && isAdmin) {
    loadAuditLogs();
  }
}

function setupAdminViewNavigation() {
  document.querySelectorAll("[data-admin-view-target]").forEach((button) => {
    button.addEventListener("click", () => {
      showAdminView(button.dataset.adminViewTarget);
    });
  });
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
  renderAdminCurrentUserLabel();
  configureAdminNavigationForRole();
  showAdminView("adminCatalogueView");
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
async function loginAdmin(username, password) {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username,
      password
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Username atau password salah");
  }

  return data;
}

async function verifyAdminSession(token) {
  const response = await fetch("/api/admin/verify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Session admin tidak valid");
  }

  return data;
}

function setupAdminLogin() {
  const form = document.getElementById("adminLoginForm");
  const usernameInput = document.getElementById("adminUsernameInput");
  const passwordInput = document.getElementById("adminPasswordInput");

  if (!form || !usernameInput || !passwordInput) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      setAdminMessage("Masukkan username dan password terlebih dahulu.", "is-error");
      return;
    }

    setAdminMessage("Memeriksa akun admin...");

    try {
      const data = await loginAdmin(username, password);

      setStoredAdminSession(data.token, {
        username: data.username,
        role: data.role,
        permissions: data.permissions
      });

      passwordInput.value = "";
      setAdminMessage("Login berhasil.", "is-success");
      showAdminDashboard();
    } catch (error) {
      clearStoredAdminSession();
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
    clearStoredAdminSession();
    adminBikesCache = [];
    adminServicesCache = [];
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
    const data = await verifyAdminSession(token);

    setStoredAdminSession(token, {
      username: data.username,
      role: data.role,
      permissions: data.permissions
    });

    showAdminDashboard();
  } catch (error) {
    clearStoredAdminSession();
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

  if (!refreshButton) {
    return;
  }

  refreshButton.addEventListener("click", loadAdminBikes);
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

  if (!bike.brand) errors.push("Brand wajib diisi.");
  if (!bike.name) errors.push("Nama model wajib diisi.");
  if (!bike.id) errors.push("ID sepeda gagal dibuat.");
  if (!bike.image) errors.push("Gambar utama atau gambar warna pertama wajib diisi.");
  if (!bike.description) errors.push("Deskripsi wajib diisi.");
  if (bike.price < 0) errors.push("Harga tidak boleh negatif.");
  if (bike.stockQty < 0) errors.push("Stok internal tidak boleh negatif.");

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
  setBikeFormValue("bikePriceInput", "0");
  setBikeFormValue("bikeColorNameInput", "");
  setBikeFormChecked("bikeFeaturedInput", false);
  setBikeFormChecked("bikeInStockInput", true);
  setBikeFormValue("bikeStockQtyInput", isCurrentUserAdmin() ? "1" : "0");

  renderColorVariants([]);
  updateMainImagePreview();

  setAdminFormNote(
    isCurrentUserAdmin()
      ? "Admin bisa mengatur stok internal."
      : "Staff bisa mengedit katalog, tetapi tidak bisa menambah stok internal."
  );

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

  setAdminFormNote(
    isCurrentUserAdmin()
      ? "Admin bisa mengatur stok internal."
      : "Staff bisa mengedit katalog, tetapi tidak bisa menambah stok internal."
  );

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

      if (isCurrentUserAdmin()) {
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

      if (!bike) return;

      const confirmed = window.confirm(
        `Aktifkan lagi ${bike.name}? Unit ini akan kembali muncul di katalog publik.`
      );

      if (!confirmed) return;

      reactivateButton.disabled = true;
      reactivateButton.textContent = "Memproses...";

      try {
        await reactivateBike(bikeId);
        await loadAdminBikes();

        if (isCurrentUserAdmin()) {
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

      if (!bike) return;

      const confirmed = window.confirm(
        `Nonaktifkan ${bike.name}? Unit ini akan hilang dari katalog publik, tetapi datanya tetap tersimpan di admin.`
      );

      if (!confirmed) return;

      deactivateButton.disabled = true;
      deactivateButton.textContent = "Memproses...";

      try {
        await deactivateBike(bikeId);
        hideBikeEditor();
        await loadAdminBikes();

        if (isCurrentUserAdmin()) {
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

/* =========================
   USER MANAGEMENT
========================= */
function setAdminUserFormNote(message, type = "") {
  const note = document.getElementById("adminUserFormNote");

  if (!note) return;

  note.textContent = message;
  note.classList.remove("is-error", "is-success");

  if (type) {
    note.classList.add(type);
  }
}

async function fetchAdminUsers() {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/users", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal memuat data user.");
  }

  return data.users || [];
}

function renderAdminUsers(users) {
  const userList = document.getElementById("adminUserList");

  if (!userList) {
    return;
  }

  if (!users.length) {
    userList.innerHTML = `
      <div class="admin-empty-state">
        Belum ada user.
      </div>
    `;
    return;
  }

  userList.innerHTML = users
    .map((user) => `
      <article class="admin-user-card">
        <div>
          <h3>${escapeHtml(user.username)}</h3>

          <div class="admin-user-meta">
            <span class="admin-user-role ${user.role === "admin" ? "is-admin" : "is-staff"}">
              ${escapeHtml(user.role)}
            </span>

            <span class="admin-user-status ${user.isActive ? "is-active" : "is-inactive"}">
              ${user.isActive ? "Aktif" : "Nonaktif"}
            </span>

            <span>
              Dibuat: ${escapeHtml(user.createdAt || "-")}
            </span>
          </div>
        </div>

        <div class="admin-user-actions">
          <button
            type="button"
            class="admin-action-btn ${user.isActive ? "admin-danger-btn" : "admin-success-btn"}"
            data-toggle-user-status="${escapeHtml(user.id)}"
            data-user-active="${user.isActive ? "1" : "0"}"
            data-user-role="${escapeHtml(user.role)}"
          >
            ${user.isActive ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </div>
      </article>
    `)
    .join("");
}

async function loadAdminUsers() {
  const userList = document.getElementById("adminUserList");

  if (!isCurrentUserAdmin()) {
    return;
  }

  if (userList) {
    userList.innerHTML = `
      <div class="admin-empty-state">
        Memuat data user...
      </div>
    `;
  }

  try {
    const users = await fetchAdminUsers();
    renderAdminUsers(users);
  } catch (error) {
    if (userList) {
      userList.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }
}

async function createAdminUser(userData) {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const apiErrors = Array.isArray(data?.errors)
      ? ` ${data.errors.join(" ")}`
      : "";

    throw new Error((data?.error || "Gagal membuat user.") + apiErrors);
  }

  return data.user;
}

async function updateAdminUser(userData) {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/users", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal mengubah user.");
  }

  return data.user;
}
function renderAdminCurrentUserLabel() {
  const label = document.getElementById("adminCurrentUserLabel");
  const user = getStoredAdminUser();

  if (!label || !user) {
    return;
  }

  label.innerHTML = `
    <span>${escapeHtml(user.username || "user")}</span>
    <strong>${escapeHtml(user.role || "")}</strong>
  `;
}
function setupAdminUserManagement() {
  const form = document.getElementById("adminUserForm");
  const refreshButton = document.getElementById("refreshUsersBtn");
  const userList = document.getElementById("adminUserList");
  const createButton = document.getElementById("createUserBtn");

  if (refreshButton) {
    refreshButton.addEventListener("click", loadAdminUsers);
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const username = document.getElementById("newUserUsernameInput")?.value.trim() || "";
      const password = document.getElementById("newUserPasswordInput")?.value || "";
      const role = document.getElementById("newUserRoleInput")?.value || "staff";

      if (!username || !password) {
        setAdminUserFormNote("Username dan password wajib diisi.", "is-error");
        return;
      }

      if (createButton) {
        createButton.disabled = true;
        createButton.textContent = "Membuat...";
      }

      setAdminUserFormNote("Membuat user baru...");

      try {
        await createAdminUser({
          username,
          password,
          role
        });

        form.reset();
        document.getElementById("newUserRoleInput").value = "staff";

        setAdminUserFormNote("User berhasil dibuat.", "is-success");
        await loadAdminUsers();
        loadAuditLogs();
      } catch (error) {
        setAdminUserFormNote(error.message, "is-error");
      } finally {
        if (createButton) {
          createButton.disabled = false;
          createButton.textContent = "Tambah User";
        }
      }
    });
  }

  if (userList) {
    userList.addEventListener("click", async (event) => {
      const toggleButton = event.target.closest("[data-toggle-user-status]");

      if (!toggleButton) return;

      const id = toggleButton.dataset.toggleUserStatus;
      const role = toggleButton.dataset.userRole;
      const isActive = toggleButton.dataset.userActive === "1";
      const nextStatus = !isActive;

      const confirmed = window.confirm(
        `${nextStatus ? "Aktifkan" : "Nonaktifkan"} user ini?`
      );

      if (!confirmed) return;

      toggleButton.disabled = true;
      toggleButton.textContent = "Memproses...";

      try {
        await updateAdminUser({
          id,
          role,
          isActive: nextStatus
        });

        await loadAdminUsers();
        loadAuditLogs();
      } catch (error) {
        window.alert(error.message);
        toggleButton.disabled = false;
        toggleButton.textContent = isActive ? "Nonaktifkan" : "Aktifkan";
      }
    });
  }
}
/* =========================
   INVOICES / SALES
========================= */
function formatRupiah(value) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function getSelectedInvoiceBike() {
  const select = document.getElementById("invoiceBikeInput");
  const bikeId = select?.value || "";

  return adminBikesCache.find((bike) => bike.id === bikeId) || null;
}

function populateInvoiceBikeOptions() {
  const select = document.getElementById("invoiceBikeInput");

  if (!select) {
    return;
  }

  const currentValue = select.value;

  const activeBikes = adminBikesCache
    .filter((bike) => Boolean(bike.inStock))
    .sort((a, b) => {
      const brandCompare = String(a.brand || "").localeCompare(String(b.brand || ""));
      return brandCompare || String(a.name || "").localeCompare(String(b.name || ""));
    });

  select.innerHTML = `
    <option value="">Pilih sepeda</option>
    ${activeBikes
      .map((bike) => {
        const stockQty = Number(bike.stockQty || 0);
        const stockText = stockQty > 0 ? `Stok ${stockQty}` : "Stok habis";

        return `
          <option
            value="${escapeHtml(bike.id)}"
            data-price="${Number(bike.price || 0)}"
            data-stock="${stockQty}"
            ${stockQty <= 0 ? "disabled" : ""}
          >
            ${escapeHtml(bike.brand)} ${escapeHtml(bike.name)} — ${stockText}
          </option>
        `;
      })
      .join("")}
  `;

  if (activeBikes.some((bike) => bike.id === currentValue && Number(bike.stockQty || 0) > 0)) {
    select.value = currentValue;
  }
}

function updateInvoicePreview() {
  const quantityInput = document.getElementById("invoiceQuantityInput");
  const unitPriceInput = document.getElementById("invoiceUnitPriceInput");
  const preview = document.getElementById("adminInvoicePreview");
  const selectedBike = getSelectedInvoiceBike();

  const quantity = Math.max(Number(quantityInput?.value || 1), 1);
  const unitPrice = Number(unitPriceInput?.value || 0);
  const total = quantity * unitPrice;

  if (selectedBike && unitPriceInput && !unitPriceInput.value) {
    unitPriceInput.value = Number(selectedBike.price || 0);
  }

  if (preview) {
    preview.innerHTML = `
      <strong>Total Invoice</strong>
      <span>${formatRupiah(total)}</span>
    `;
  }
}

function resetInvoiceForm() {
  const form = document.getElementById("adminInvoiceForm");

  if (form) {
    form.reset();
  }

  const quantityInput = document.getElementById("invoiceQuantityInput");

  if (quantityInput) {
    quantityInput.value = "1";
  }

  updateInvoicePreview();
}

function getInvoiceFormData() {
  return {
    bikeId: document.getElementById("invoiceBikeInput")?.value || "",
    quantity: Number(document.getElementById("invoiceQuantityInput")?.value || 1),
    unitPrice: Number(document.getElementById("invoiceUnitPriceInput")?.value || 0),
    customerName: document.getElementById("invoiceCustomerNameInput")?.value.trim() || "",
    customerPhone: document.getElementById("invoiceCustomerPhoneInput")?.value.trim() || "",
    customerAddress: document.getElementById("invoiceCustomerAddressInput")?.value.trim() || "",
    paymentMethod: document.getElementById("invoicePaymentMethodInput")?.value || "",
    notes: document.getElementById("invoiceNotesInput")?.value.trim() || ""
  };
}

function validateInvoiceFormData(invoice) {
  const errors = [];
  const selectedBike = getSelectedInvoiceBike();
  const stockQty = Number(selectedBike?.stockQty || 0);

  if (!invoice.bikeId) {
    errors.push("Sepeda wajib dipilih.");
  }

  if (!invoice.customerName) {
    errors.push("Nama customer wajib diisi.");
  }

  if (invoice.quantity < 1) {
    errors.push("Jumlah minimal 1.");
  }

  if (invoice.unitPrice < 0) {
    errors.push("Harga jual tidak boleh negatif.");
  }

  if (selectedBike && stockQty < invoice.quantity) {
    errors.push(`Stok tidak cukup. Stok tersedia: ${stockQty}.`);
  }

  return errors;
}

function setInvoiceFormNote(message, type = "") {
  const note = document.getElementById("adminInvoiceFormNote");

  if (!note) {
    return;
  }

  note.textContent = message;
  note.classList.remove("is-error", "is-success");

  if (type) {
    note.classList.add(type);
  }
}

async function fetchInvoices() {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/invoices?limit=50", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal memuat invoice.");
  }

  return data.invoices || [];
}

async function createInvoice(invoice) {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(invoice)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const apiErrors = Array.isArray(data?.errors)
      ? ` ${data.errors.join(" ")}`
      : "";

    throw new Error((data?.error || "Gagal membuat invoice.") + apiErrors);
  }

  return data.invoice;
}

function renderInvoices(invoices) {
  const list = document.getElementById("adminInvoiceList");
  window.adminInvoicesCache = invoices;
  if (!list) {
    return;
  }

  if (!invoices.length) {
    list.innerHTML = `
      <div class="admin-empty-state">
        Belum ada invoice.
      </div>
    `;
    return;
  }

  list.innerHTML = invoices
    .map((invoice) => `
      <article class="admin-invoice-card">
        <div class="admin-invoice-card-main">
          <div>
            <p class="admin-invoice-number">
              ${escapeHtml(invoice.invoiceNumber)}
            </p>

            <h3>
              ${escapeHtml(invoice.customerName)}
            </h3>
          </div>

          <strong class="admin-invoice-total">
            ${formatRupiah(invoice.totalPrice)}
          </strong>
        </div>

        <div class="admin-invoice-meta">
          <span>
            <strong>Sepeda:</strong>
            ${escapeHtml(invoice.bikeBrand)} ${escapeHtml(invoice.bikeName)}
          </span>

          <span>
            <strong>Jumlah:</strong>
            ${Number(invoice.quantity || 1)} unit × ${formatRupiah(invoice.unitPrice)}
          </span>

          <span>
            <strong>Pembayaran:</strong>
            ${escapeHtml(invoice.paymentMethod || "-")}
          </span>

          <span>
            <strong>Dibuat oleh:</strong>
            ${escapeHtml(invoice.createdByUsername || "-")} (${escapeHtml(invoice.createdByRole || "-")})
          </span>

          <span>
            <strong>Tanggal:</strong>
            ${escapeHtml(formatAuditDate(invoice.createdAt))}
          </span>
        </div>
                <div class="admin-card-actions">
          <button
            type="button"
            class="admin-action-btn"
            data-open-invoice="${escapeHtml(invoice.id)}"
          >
            Lihat / Print
          </button>
        </div>
      </article>
      </article>
    `)
    .join("");
}

async function loadInvoices() {
  const list = document.getElementById("adminInvoiceList");

  if (list) {
    list.innerHTML = `
      <div class="admin-empty-state">
        Memuat invoice...
      </div>
    `;
  }

  try {
    const invoices = await fetchInvoices();
    renderInvoices(invoices);
  } catch (error) {
    if (list) {
      list.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }
}

async function loadInvoicePage() {
  await loadAdminBikes();
  populateInvoiceBikeOptions();
  updateInvoicePreview();
  loadInvoices();
}

function setupInvoiceForm() {
  const form = document.getElementById("adminInvoiceForm");
  const bikeInput = document.getElementById("invoiceBikeInput");
  const quantityInput = document.getElementById("invoiceQuantityInput");
  const unitPriceInput = document.getElementById("invoiceUnitPriceInput");
  const refreshButton = document.getElementById("refreshInvoicesBtn");
  const createButton = document.getElementById("createInvoiceBtn");

  if (bikeInput) {
    bikeInput.addEventListener("change", () => {
      const selectedBike = getSelectedInvoiceBike();

      if (selectedBike && unitPriceInput) {
        unitPriceInput.value = Number(selectedBike.price || 0);
      }

      updateInvoicePreview();
    });
  }

  if (quantityInput) {
    quantityInput.addEventListener("input", updateInvoicePreview);
  }

  if (unitPriceInput) {
    unitPriceInput.addEventListener("input", updateInvoicePreview);
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", loadInvoices);
  }

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const invoice = getInvoiceFormData();
    const errors = validateInvoiceFormData(invoice);

    if (errors.length) {
      setInvoiceFormNote(errors.join(" "), "is-error");
      return;
    }

    if (createButton) {
      createButton.disabled = true;
      createButton.textContent = "Membuat...";
    }

    setInvoiceFormNote("Membuat invoice dan mengurangi stok...");

    try {
      await createInvoice(invoice);

      setInvoiceFormNote("Invoice berhasil dibuat dan stok sudah dikurangi.", "is-success");
      resetInvoiceForm();

      await loadAdminBikes();
      populateInvoiceBikeOptions();
      await loadInvoices();

      if (isCurrentUserAdmin()) {
        loadAuditLogs();
      }
    } catch (error) {
      setInvoiceFormNote(error.message, "is-error");
    } finally {
      if (createButton) {
        createButton.disabled = false;
        createButton.textContent = "Buat Invoice";
      }
    }
  });
}
/* =========================
   SERVICES
========================= */
function getServiceStatusLabel(status) {
  const labels = {
    received: "Diterima",
    in_progress: "Dikerjakan",
    completed: "Selesai",
    cancelled: "Dibatalkan"
  };

  return labels[status] || status || "-";
}

function getServiceStatusClass(status) {
  const classes = {
    received: "is-received",
    in_progress: "is-in-progress",
    completed: "is-completed",
    cancelled: "is-cancelled"
  };

  return classes[status] || "is-received";
}

function setServiceFormNote(message, type = "") {
  const note = document.getElementById("adminServiceFormNote");

  if (!note) {
    return;
  }

  note.textContent = message;
  note.classList.remove("is-error", "is-success");

  if (type) {
    note.classList.add(type);
  }
}

function resetServiceForm() {
  const form = document.getElementById("adminServiceForm");
  const saveButton = document.getElementById("saveServiceBtn");

  if (form) {
    form.reset();
  }

  const serviceIdInput = document.getElementById("serviceIdInput");
  const statusInput = document.getElementById("serviceStatusInput");

  if (serviceIdInput) {
    serviceIdInput.value = "";
  }

  if (statusInput) {
    statusInput.value = "received";
  }

  if (saveButton) {
    saveButton.textContent = "Simpan Service";
  }

  setServiceFormNote("Service tidak mengurangi stok. Stok sparepart bisa ditambahkan nanti.");
}

function getServiceFormData() {
  return {
    id: document.getElementById("serviceIdInput")?.value.trim() || "",
    customerName: document.getElementById("serviceCustomerNameInput")?.value.trim() || "",
    customerPhone: document.getElementById("serviceCustomerPhoneInput")?.value.trim() || "",
    customerAddress: document.getElementById("serviceCustomerAddressInput")?.value.trim() || "",
    bikeLabel: document.getElementById("serviceBikeLabelInput")?.value.trim() || "",
    serviceType: document.getElementById("serviceTypeInput")?.value || "",
    serviceStatus: document.getElementById("serviceStatusInput")?.value || "received",
    serviceCost: Number(document.getElementById("serviceCostInput")?.value || 0),
    notes: document.getElementById("serviceNotesInput")?.value.trim() || ""
  };
}

function validateServiceFormData(service) {
  const errors = [];

  if (!service.customerName) {
    errors.push("Nama customer wajib diisi.");
  }

  if (!service.bikeLabel) {
    errors.push("Data sepeda/unit wajib diisi.");
  }

  if (!service.serviceType) {
    errors.push("Jenis service wajib dipilih.");
  }

  if (service.serviceCost < 0) {
    errors.push("Biaya service tidak boleh negatif.");
  }

  return errors;
}

async function fetchServices() {
  const token = getStoredAdminToken();
  const statusFilter = document.getElementById("serviceStatusFilter")?.value || "all";

  const response = await fetch(`/api/admin/services?limit=50&status=${encodeURIComponent(statusFilter)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal memuat service.");
  }

  return data.services || [];
}

async function saveService(service) {
  const token = getStoredAdminToken();
  const isEditing = Boolean(service.id);

  const response = await fetch("/api/admin/services", {
    method: isEditing ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(service)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const apiErrors = Array.isArray(data?.errors)
      ? ` ${data.errors.join(" ")}`
      : "";

    throw new Error((data?.error || "Gagal menyimpan service.") + apiErrors);
  }

  return data.service;
}

function renderServices(services) {
  const list = document.getElementById("adminServiceList");

  if (!list) {
    return;
  }

  adminServicesCache = services;

  if (!services.length) {
    list.innerHTML = `
      <div class="admin-empty-state">
        Belum ada service.
      </div>
    `;
    return;
  }

  list.innerHTML = services
    .map((service) => `
      <article class="admin-service-card">
        <div class="admin-service-card-main">
          <div>
            <p class="admin-service-number">
              ${escapeHtml(service.serviceNumber)}
            </p>

            <h3>
              ${escapeHtml(service.customerName)}
            </h3>
          </div>

          <strong class="admin-service-cost">
            ${formatRupiah(service.serviceCost)}
          </strong>
        </div>

        <div class="admin-service-meta">
          <span class="admin-service-status ${getServiceStatusClass(service.serviceStatus)}">
            ${escapeHtml(getServiceStatusLabel(service.serviceStatus))}
          </span>

          <span>
            <strong>Sepeda/unit:</strong>
            ${escapeHtml(service.bikeLabel)}
          </span>

          <span>
            <strong>Jenis service:</strong>
            ${escapeHtml(service.serviceType)}
          </span>

          <span>
            <strong>No. HP:</strong>
            ${escapeHtml(service.customerPhone || "-")}
          </span>

          <span>
            <strong>Dibuat oleh:</strong>
            ${escapeHtml(service.createdByUsername || "-")} (${escapeHtml(service.createdByRole || "-")})
          </span>

          <span>
            <strong>Tanggal masuk:</strong>
            ${escapeHtml(formatAuditDate(service.createdAt))}
          </span>

          ${
            service.completedAt
              ? `
                <span>
                  <strong>Selesai:</strong>
                  ${escapeHtml(formatAuditDate(service.completedAt))}
                </span>
              `
              : ""
          }

          ${
            service.notes
              ? `
                <span>
                  <strong>Catatan:</strong>
                  ${escapeHtml(service.notes)}
                </span>
              `
              : ""
          }
        </div>

        <div class="admin-card-actions">
          <button
            type="button"
            class="admin-action-btn"
            data-edit-service="${escapeHtml(service.id)}"
          >
            Edit Service
          </button>
        </div>
      </article>
    `)
    .join("");
}

async function loadServices() {
  const list = document.getElementById("adminServiceList");

  if (list) {
    list.innerHTML = `
      <div class="admin-empty-state">
        Memuat service...
      </div>
    `;
  }

  try {
    const services = await fetchServices();
    renderServices(services);
  } catch (error) {
    if (list) {
      list.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }
}

function loadServicePage() {
  loadServices();
}

function fillServiceForm(service) {
  const setValue = (id, value) => {
    const input = document.getElementById(id);

    if (input) {
      input.value = value ?? "";
    }
  };

  setValue("serviceIdInput", service.id);
  setValue("serviceCustomerNameInput", service.customerName);
  setValue("serviceCustomerPhoneInput", service.customerPhone);
  setValue("serviceCustomerAddressInput", service.customerAddress);
  setValue("serviceBikeLabelInput", service.bikeLabel);
  setValue("serviceTypeInput", service.serviceType);
  setValue("serviceStatusInput", service.serviceStatus);
  setValue("serviceCostInput", service.serviceCost);
  setValue("serviceNotesInput", service.notes);

  const saveButton = document.getElementById("saveServiceBtn");

  if (saveButton) {
    saveButton.textContent = "Update Service";
  }

  setServiceFormNote(`Mengedit ${service.serviceNumber}.`, "is-success");
}

function setupServiceForm() {
  const form = document.getElementById("adminServiceForm");
  const saveButton = document.getElementById("saveServiceBtn");
  const resetButton = document.getElementById("resetServiceFormBtn");
  const refreshButton = document.getElementById("refreshServicesBtn");
  const statusFilter = document.getElementById("serviceStatusFilter");
  const serviceList = document.getElementById("adminServiceList");

  if (resetButton) {
    resetButton.addEventListener("click", resetServiceForm);
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", loadServices);
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", loadServices);
  }

  if (serviceList) {
    serviceList.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-edit-service]");

      if (!editButton) {
        return;
      }

      const service = adminServicesCache.find((item) => item.id === editButton.dataset.editService);

      if (!service) {
        window.alert("Data service tidak ditemukan. Coba refresh service.");
        return;
      }

      fillServiceForm(service);
    });
  }

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const service = getServiceFormData();
    const errors = validateServiceFormData(service);

    if (errors.length) {
      setServiceFormNote(errors.join(" "), "is-error");
      return;
    }

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = service.id ? "Mengupdate..." : "Menyimpan...";
    }

    setServiceFormNote("Menyimpan data service...");

    try {
      await saveService(service);

      setServiceFormNote(
        service.id ? "Service berhasil diupdate." : "Service berhasil disimpan.",
        "is-success"
      );

      resetServiceForm();
      await loadServices();

      if (isCurrentUserAdmin()) {
        loadAuditLogs();
      }
    } catch (error) {
      setServiceFormNote(error.message, "is-error");
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = document.getElementById("serviceIdInput")?.value
          ? "Update Service"
          : "Simpan Service";
      }
    }
  });
}
/* =========================
   AUDIT LOGS
========================= */
function getAuditActionLabel(action) {
  const labels = {
    bike_create: "Tambah Sepeda",
    bike_update: "Edit Sepeda",
    bike_deactivate: "Nonaktifkan Sepeda",
    bike_reactivate: "Aktifkan Sepeda",
    bike_hard_delete: "Hapus Permanen",
    user_create: "Tambah User",
    user_update: "Edit User",
    invoice_create: "Buat Invoice",
    service_create: "Tambah Service",
    service_update: "Update Service"
  };

  return labels[action] || action || "Aktivitas";
}

function getAuditActionClass(action) {
  const actionText = String(action || "");

  if (actionText.includes("create") || actionText.includes("reactivate")) {
    return "is-create";
  }

  if (actionText.includes("delete") || actionText.includes("deactivate")) {
    return "is-delete";
  }

  if (actionText.includes("update")) {
    return "is-update";
  }

  return "";
}

function formatAuditDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function createAuditDetailsText(log) {
  const details = log.details || {};

  if (Array.isArray(details.changedFields) && details.changedFields.length) {
    return `Field berubah: ${details.changedFields.join(", ")}`;
  }

  if (details.customerName && details.bikeName) {
    return `${details.customerName} membeli ${details.bikeName}. Total: Rp ${Number(details.totalPrice || 0).toLocaleString("id-ID")}`;
  }

  if (details.username && details.role) {
    return `User ${details.username} dibuat sebagai ${details.role}.`;
  }
if (details.serviceType && details.bikeLabel) {
  return `${details.customerName || "Customer"} - ${details.bikeLabel}. Status: ${getServiceStatusLabel(details.serviceStatus || details.previousStatus)}.`;
}
  if (details.brand && details.name) {
    return `${details.brand} ${details.name}`;
  }

  if (details.previousInStock !== undefined || details.newInStock !== undefined) {
    return "Status katalog berubah.";
  }

  return "";
}

async function fetchAuditLogs() {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/audit-logs?limit=50", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal memuat audit log.");
  }

  return data.logs || [];
}

function renderAuditLogs(logs) {
  const auditList = document.getElementById("adminAuditList");

  if (!auditList) {
    return;
  }

  if (!logs.length) {
    auditList.innerHTML = `
      <div class="admin-empty-state">
        Belum ada aktivitas.
      </div>
    `;
    return;
  }

  auditList.innerHTML = logs
    .map((log) => {
      const actionClass = getAuditActionClass(log.action);
      const detailsText = createAuditDetailsText(log);

      return `
        <article class="admin-audit-card">
          <div class="admin-audit-main">
            <div>
              <h3>${escapeHtml(log.targetLabel || log.targetId || "Target tidak diketahui")}</h3>

              <div class="admin-audit-meta">
                <span class="admin-audit-action ${actionClass}">
                  ${escapeHtml(getAuditActionLabel(log.action))}
                </span>

                <span>
                  Oleh ${escapeHtml(log.actorUsername)} (${escapeHtml(log.actorRole)})
                </span>

                <span>
                  ${escapeHtml(formatAuditDate(log.createdAt))}
                </span>
              </div>
            </div>
          </div>

          ${
            detailsText
              ? `
                <p class="admin-audit-details">
                  ${escapeHtml(detailsText)}
                </p>
              `
              : ""
          }
        </article>
      `;
    })
    .join("");
}

async function loadAuditLogs() {
  const auditList = document.getElementById("adminAuditList");

  if (!isCurrentUserAdmin()) {
    return;
  }

  if (auditList) {
    auditList.innerHTML = `
      <div class="admin-empty-state">
        Memuat aktivitas...
      </div>
    `;
  }

  try {
    const logs = await fetchAuditLogs();
    renderAuditLogs(logs);
  } catch (error) {
    if (auditList) {
      auditList.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }
}

function setupAuditLogs() {
  const refreshButton = document.getElementById("refreshAuditLogsBtn");

  if (refreshButton) {
    refreshButton.addEventListener("click", loadAuditLogs);
  }
}
/* =========================
   PRINTABLE INVOICE MODAL
========================= */
function getInvoiceByIdFromCache(invoiceId) {
  return window.adminInvoicesCache?.find((invoice) => invoice.id === invoiceId) || null;
}

function setPrintText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value || "-";
  }
}

function openInvoiceModal(invoice) {
  const modal = document.getElementById("adminInvoiceModal");

  if (!modal || !invoice) {
    return;
  }

  const itemName = `${invoice.bikeBrand || ""} ${invoice.bikeName || ""}`.trim();
  const quantity = Number(invoice.quantity || 1);
  const unitPrice = Number(invoice.unitPrice || 0);
  const totalPrice = Number(invoice.totalPrice || 0);

  setPrintText("printInvoiceNumber", invoice.invoiceNumber);
  setPrintText("printInvoiceDate", formatAuditDate(invoice.createdAt));
  setPrintText(
    "printInvoiceCreatedBy",
    `${invoice.createdByUsername || "-"}`
  );
  setPrintText("printInvoicePayment", invoice.paymentMethod || "-");

  setPrintText("printCustomerName", invoice.customerName);
  setPrintText("printCustomerPhone", invoice.customerPhone || "-");
  setPrintText("printCustomerAddress", invoice.customerAddress || "-");

  setPrintText("printInvoiceItem", itemName);
  setPrintText("printInvoiceQuantity", `${quantity} unit`);
  setPrintText("printInvoiceUnitPrice", formatRupiah(unitPrice));
  setPrintText("printInvoiceLineTotal", formatRupiah(totalPrice));
  setPrintText("printInvoiceTotal", formatRupiah(totalPrice));

  setPrintText("printInvoiceNotes", invoice.notes || "-");
  setPrintText("printInvoiceCustomerSignature", invoice.customerName || "-");
  setPrintText("printInvoiceStaffSignature", invoice.createdByUsername || "-");

  const notesSection = document.getElementById("printInvoiceNotesSection");

  if (notesSection) {
    notesSection.classList.toggle("is-hidden", !invoice.notes);
  }

  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeInvoiceModal() {
  const modal = document.getElementById("adminInvoiceModal");

  if (!modal) {
    return;
  }

  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
}

function printCurrentInvoice() {
  window.print();
}

function setupInvoiceModal() {
  const closeButton = document.getElementById("closeInvoiceModalBtn");
  const overlay = document.getElementById("adminInvoiceModalOverlay");
  const printButton = document.getElementById("printInvoiceBtn");
  const invoiceList = document.getElementById("adminInvoiceList");

  if (closeButton) {
    closeButton.addEventListener("click", closeInvoiceModal);
  }

  if (overlay) {
    overlay.addEventListener("click", closeInvoiceModal);
  }

  if (printButton) {
    printButton.addEventListener("click", printCurrentInvoice);
  }

  if (invoiceList) {
    invoiceList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-open-invoice]");

      if (!button) {
        return;
      }

      const invoice = getInvoiceByIdFromCache(button.dataset.openInvoice);

      if (!invoice) {
        window.alert("Data invoice tidak ditemukan. Coba refresh invoice.");
        return;
      }

      openInvoiceModal(invoice);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInvoiceModal();
    }
  });
}
/* =========================
   INIT
========================= */
setupAdminLogin();
setupAdminLogout();
setupAdminViewNavigation();
setupBikeRefresh();
setupImagePreviewInputs();
setupColorVariantEditor();
setupBikeEditor();
setupBikeFormSave();
setupAdminBikeFilters();
setupAdminUserManagement();
setupAuditLogs();
setupInvoiceForm();
setupInvoiceModal();
setupServiceForm();
restoreAdminSession();