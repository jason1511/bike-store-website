/* =========================
   ADMIN BRAND MANAGER
========================= */
let editingBrandId = "";
let adminBrandManagerInitialized = false;

function getBrandFormValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function setBrandFormValue(id, value) {
  const input = document.getElementById(id);

  if (input) {
    input.value = value ?? "";
  }
}

function setBrandFormNote(message, type = "") {
  const note = document.getElementById("brandFormNote");

  if (!note) {
    return;
  }

  note.textContent = message || "";
  note.className = `admin-form-note ${type ? `is-${type}` : ""}`;
}

function setBrandLogoUploadNote(message, type = "") {
  const note = document.getElementById("brandLogoUploadNote");

  if (!note) {
    return;
  }

  note.textContent = message || "";
  note.className = `admin-form-note ${type ? `is-${type}` : ""}`;
}

function getBrandFormData() {
  const name = getBrandFormValue("brandNameInput");
  const slug = createSlugFromName(name);
  const themeMain = getBrandFormValue("brandThemeMainInput") || "#203333";
  const themeSecond = getBrandFormValue("brandThemeSecondInput") || "#2f4f4f";

  return {
    name,
    slug,
    logoPath: getBrandFormValue("brandLogoPathInput"),
    themeMain,
    themeSecond,
    sortOrder: null,
    isActive: getBrandFormValue("brandActiveInput") !== "0"
  };
}

function validateBrandFormData(brand) {
  const errors = [];

  if (!brand.name) {
    errors.push("Nama brand wajib diisi.");
  }

  if (!brand.slug) {
    errors.push("Slug brand gagal dibuat dari nama brand.");
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(brand.themeMain)) {
    errors.push("Warna utama tidak valid.");
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(brand.themeSecond)) {
    errors.push("Warna kedua tidak valid.");
  }

  return errors;
}

/* =========================
   BRAND LOGO UPLOAD
========================= */


function buildBrandLogoBaseName(brandName, fileName = "") {
  return [
    "brand",
    brandName || fileName || "logo"
  ]
    .filter(Boolean)
    .map(createSlugFromName)
    .filter(Boolean)
    .join("-");
}

async function uploadBrandLogoToR2(file, brandName) {
  if (!file || !(file instanceof File)) {
    return "";
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Logo brand harus JPG, PNG, atau WEBP.");
  }

  setBrandLogoUploadNote("Membaca file logo...");

  const imageBase64 = await readFileAsDataUrl(file);

  setBrandLogoUploadNote("Mengupload logo ke R2...");

  const data = await fetchAdminJson("/api/admin/upload-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      imageBase64,
      fileName: file.name,
      fileType: file.type,
      folder: "brands",
      fileBaseName: buildBrandLogoBaseName(brandName, file.name)
    })
  });

  if (!data?.imagePath) {
    throw new Error("Upload logo berhasil, tetapi path logo tidak dikembalikan.");
  }

  setBrandLogoUploadNote("Logo brand berhasil diupload.", "success");

  return data.imagePath;
}

/* =========================
   BRAND API
========================= */
async function createAdminBrand(brand) {
  const data = await fetchAdminJson("/api/admin/brands", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(brand)
  });

  return data.brand;
}

async function updateAdminBrand(brand) {
  const data = await fetchAdminJson("/api/admin/brands", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(brand)
  });

  return data.brand;
}

async function toggleAdminBrandStatus(brandId, isActive) {
  const data = await fetchAdminJson("/api/admin/brands", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: brandId,
      isActive
    })
  });

  return data.brand;
}

async function fetchAllAdminBrandsForManager() {
  const data = await fetchAdminJson("/api/admin/brands?includeInactive=1", {
    method: "GET"
  });

  return data.brands || [];
}

function getAdminBrandByIdFromManager(brandId) {
  return adminBrandOptions.find((brand) => brand.id === brandId) || null;
}

/* =========================
   BRAND PREVIEW
========================= */
function renderBrandPreview() {
  const preview = document.getElementById("brandPreviewCard");
  const logoPreview = document.getElementById("brandPreviewLogo");
  const namePreview = document.getElementById("brandPreviewName");

  if (!preview || !logoPreview || !namePreview) {
    return;
  }

  const brand = getBrandFormData();
  const logoFile = document.getElementById("brandLogoUploadInput")?.files?.[0];

  preview.style.setProperty("--brand-preview-main", brand.themeMain);
  preview.style.setProperty("--brand-preview-second", brand.themeSecond);

  namePreview.textContent = brand.name || "Preview Brand";

  if (logoFile) {
    logoPreview.innerHTML = `
      <img
        src="${URL.createObjectURL(logoFile)}"
        alt="${escapeHtml(brand.name || "Brand")} logo"
      >
    `;
    return;
  }

  if (brand.logoPath) {
    logoPreview.innerHTML = `
      <img
        src="${escapeHtml(brand.logoPath)}"
        alt="${escapeHtml(brand.name || "Brand")} logo"
      >
    `;
    return;
  }

  logoPreview.textContent = "Logo";
}

/* =========================
   BRAND LIST
========================= */
function renderAdminBrandList() {
  const brandList = document.getElementById("brandList");

  if (!brandList) {
    return;
  }

  if (!adminBrandOptions.length) {
    brandList.innerHTML = `
      <div class="admin-empty-state">
        Brand belum tersedia.
      </div>
    `;
    return;
  }

  brandList.innerHTML = adminBrandOptions
    .map((brand) => {
      const mainColor = brand.themeMain || brand.theme?.main || "#203333";
      const secondColor = brand.themeSecond || brand.theme?.second || "#2f4f4f";
      const statusText = brand.isActive ? "Aktif" : "Nonaktif";
      const statusActionText = brand.isActive ? "Nonaktifkan" : "Aktifkan";
      const statusActionClass = brand.isActive ? "is-danger" : "is-success";

      return `
        <div class="admin-brand-item" data-brand-id="${escapeHtml(brand.id)}">
          <button
            type="button"
            class="admin-brand-item-main"
            data-brand-edit="${escapeHtml(brand.id)}"
            title="Edit ${escapeHtml(brand.name)}"
          >
            <div class="admin-brand-item-logo">
              ${
                brand.logoPath
                  ? `
                    <img
                      src="${escapeHtml(brand.logoPath)}"
                      alt="${escapeHtml(brand.name)} logo"
                    >
                  `
                  : "Logo"
              }
            </div>

            <div>
              <p class="admin-brand-item-name">
                ${escapeHtml(brand.name)}
              </p>

              <p class="admin-brand-item-meta">
                ${escapeHtml(statusText)}
              </p>
            </div>
          </button>

          <div class="admin-brand-item-side">
            <div class="admin-brand-theme-dots">
              <span
                class="admin-brand-theme-dot"
                style="background-color: ${escapeHtml(mainColor)};"
                title="Warna utama"
              ></span>

              <span
                class="admin-brand-theme-dot"
                style="background-color: ${escapeHtml(secondColor)};"
                title="Warna kedua"
              ></span>
            </div>

            <div class="admin-brand-actions">
              <button
                type="button"
                class="admin-small-btn"
                data-brand-edit="${escapeHtml(brand.id)}"
              >
                Edit
              </button>

              <button
                type="button"
                class="admin-small-btn ${statusActionClass}"
                data-brand-toggle="${escapeHtml(brand.id)}"
                data-next-active="${brand.isActive ? "0" : "1"}"
              >
                ${escapeHtml(statusActionText)}
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

async function refreshAdminBrands() {
  adminBrandOptions = await fetchAllAdminBrandsForManager();
  renderAdminBrandList();
}

async function refreshBikeBrandDropdown() {
  if (typeof loadAdminBrands === "function") {
    await loadAdminBrands();
  }

  if (typeof populateBikeBrandSelect === "function") {
    populateBikeBrandSelect();
  }
}

/* =========================
   BRAND FORM
========================= */
function resetBrandForm() {
  editingBrandId = "";

  const brandForm = document.getElementById("brandForm");

  if (brandForm) {
    brandForm.reset();
    brandForm.dataset.isSubmitting = "false";
  }

  setBrandFormValue("brandLogoPathInput", "");
  setBrandFormValue("brandThemeMainInput", "#203333");
  setBrandFormValue("brandThemeSecondInput", "#2f4f4f");
  setBrandFormValue("brandActiveInput", "1");

  const logoInput = document.getElementById("brandLogoUploadInput");

  if (logoInput) {
    logoInput.value = "";
  }

  const submitButton = document.querySelector("#brandForm button[type='submit']");

  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = "Simpan Brand";
  }

  setBrandFormNote("");
  setBrandLogoUploadNote("Logo akan diupload ke R2 saat tombol Simpan Brand ditekan.");
  renderBrandPreview();
}

function fillBrandForm(brand) {
  editingBrandId = brand.id || "";

  setBrandFormValue("brandNameInput", brand.name || "");
  setBrandFormValue("brandLogoPathInput", brand.logoPath || "");
  setBrandFormValue("brandThemeMainInput", brand.themeMain || brand.theme?.main || "#203333");
  setBrandFormValue("brandThemeSecondInput", brand.themeSecond || brand.theme?.second || "#2f4f4f");
  setBrandFormValue("brandActiveInput", brand.isActive ? "1" : "0");

  const logoInput = document.getElementById("brandLogoUploadInput");

  if (logoInput) {
    logoInput.value = "";
  }

  const submitButton = document.querySelector("#brandForm button[type='submit']");

  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = "Simpan Perubahan";
  }

  setBrandFormNote(`Mengedit brand ${brand.name}.`, "success");
  setBrandLogoUploadNote("Pilih logo baru hanya jika ingin mengganti logo lama.");
  renderBrandPreview();

  document.getElementById("brandForm")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

/* =========================
   BRAND ACTION HANDLERS
========================= */
async function handleBrandToggle(button) {
  const brandId = button.dataset.brandToggle;
  const nextActive = button.dataset.nextActive === "1";
  const brand = getAdminBrandByIdFromManager(brandId);

  if (!brand || button.disabled) {
    return;
  }

  button.disabled = true;
  button.textContent = "Memproses...";

  try {
    await toggleAdminBrandStatus(brandId, nextActive);
    await refreshAdminBrands();
    await refreshBikeBrandDropdown();

    setBrandFormNote(
      `Brand ${brand.name} berhasil ${nextActive ? "diaktifkan" : "dinonaktifkan"}.`,
      "success"
    );
  } catch (error) {
    console.error("Failed to toggle brand:", error);

    if (handleAdminAuthError(error)) {
      return;
    }

    setBrandFormNote(error.message || "Gagal mengubah status brand.", "error");
  } finally {
    button.disabled = false;
  }
}

async function handleBrandFormSubmit(event) {
  event.preventDefault();

  const brandForm = event.currentTarget;
  const submitButton = brandForm.querySelector("button[type='submit']");

  if (brandForm.dataset.isSubmitting === "true") {
    return;
  }

  const brand = getBrandFormData();
  const errors = validateBrandFormData(brand);

  if (errors.length) {
    setBrandFormNote(errors.join(" "), "error");
    return;
  }

  brandForm.dataset.isSubmitting = "true";

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Menyimpan...";
  }

  setBrandFormNote("Menyimpan brand...");

  try {
    const logoFile = document.getElementById("brandLogoUploadInput")?.files?.[0];

    if (logoFile) {
      const logoPath = await uploadBrandLogoToR2(logoFile, brand.name);

      brand.logoPath = logoPath;
      setBrandFormValue("brandLogoPathInput", logoPath);
    }

    const successMessage = editingBrandId
      ? "Perubahan brand berhasil disimpan."
      : "Brand berhasil disimpan.";

    if (editingBrandId) {
      await updateAdminBrand({
        ...brand,
        id: editingBrandId
      });
    } else {
      await createAdminBrand(brand);
    }

    await refreshAdminBrands();
    await refreshBikeBrandDropdown();

    resetBrandForm();
    setBrandFormNote(successMessage, "success");
  } catch (error) {
    console.error("Failed to save brand:", error);

    if (handleAdminAuthError(error)) {
      return;
    }

    setBrandFormNote(error.message || "Gagal menyimpan brand.", "error");
  } finally {
    brandForm.dataset.isSubmitting = "false";

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = editingBrandId ? "Simpan Perubahan" : "Simpan Brand";
    }
  }
}

/* =========================
   SETUP
========================= */
function setupBrandPreviewInputs() {
  [
    "brandNameInput",
    "brandLogoUploadInput",
    "brandThemeMainInput",
    "brandThemeSecondInput",
    "brandActiveInput"
  ].forEach((id) => {
    const input = document.getElementById(id);

    if (!input || input.dataset.brandPreviewBound) {
      return;
    }

    input.dataset.brandPreviewBound = "true";
    input.addEventListener("input", renderBrandPreview);
    input.addEventListener("change", renderBrandPreview);
  });
}

function setupBrandRefreshButton() {
  const refreshButton = document.getElementById("refreshBrandListBtn");

  if (!refreshButton || refreshButton.dataset.brandRefreshBound) {
    return;
  }

  refreshButton.dataset.brandRefreshBound = "true";

  refreshButton.addEventListener("click", async () => {
    if (refreshButton.disabled) {
      return;
    }

    try {
      refreshButton.disabled = true;
      await refreshAdminBrands();
    } catch (error) {
      console.error("Failed to refresh brands:", error);

      if (handleAdminAuthError(error)) {
        return;
      }

      setBrandFormNote(error.message || "Gagal refresh brand.", "error");
    } finally {
      refreshButton.disabled = false;
    }
  });
}

function setupBrandResetButton() {
  const resetButton = document.getElementById("resetBrandFormBtn");

  if (!resetButton || resetButton.dataset.brandResetBound) {
    return;
  }

  resetButton.dataset.brandResetBound = "true";
  resetButton.addEventListener("click", resetBrandForm);
}

function setupBrandForm() {
  const brandForm = document.getElementById("brandForm");

  if (!brandForm || brandForm.dataset.brandFormBound) {
    return;
  }

  brandForm.dataset.brandFormBound = "true";
  brandForm.addEventListener("submit", handleBrandFormSubmit);
}

function setupBrandListActions() {
  const brandList = document.getElementById("brandList");

  if (!brandList || brandList.dataset.brandListActionsBound) {
    return;
  }

  brandList.dataset.brandListActionsBound = "true";

  brandList.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-brand-edit]");
    const toggleButton = event.target.closest("[data-brand-toggle]");

    if (editButton) {
      const brandId = editButton.dataset.brandEdit;
      const brand = getAdminBrandByIdFromManager(brandId);

      if (brand) {
        fillBrandForm(brand);
      }

      return;
    }

    if (toggleButton) {
      handleBrandToggle(toggleButton);
    }
  });
}

async function setupAdminBrandManager() {
  const token = typeof getStoredAdminToken === "function"
    ? getStoredAdminToken()
    : "";

  if (!token || adminBrandManagerInitialized) {
    return;
  }

  setupBrandPreviewInputs();
  setupBrandRefreshButton();
  setupBrandResetButton();
  setupBrandForm();
  setupBrandListActions();

  adminBrandManagerInitialized = true;

  resetBrandForm();

  try {
    await refreshAdminBrands();
  } catch (error) {
    console.error("Failed to load brand manager:", error);
    handleAdminAuthError(error);
  }
}