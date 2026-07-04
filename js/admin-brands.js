/* =========================
   ADMIN BRAND MANAGER
========================= */
let editingBrandId = "";
let adminBrandManagerInitialized = false;

function slugifyBrand(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
  const slug = slugifyBrand(name);
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

async function uploadBrandLogoToR2(file, brandName) {
  if (!file || !(file instanceof File)) {
    return "";
  }

  const token = getStoredAdminToken();
  const formData = new FormData();

  formData.append("image", file);
  formData.append("folder", "brands");
  formData.append("fileBaseName", `brand-${slugifyBrand(brandName || file.name)}`);

  const response = await fetch("/api/admin/upload-image", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal upload logo brand.");
  }

  return data.imagePath;
}

async function createAdminBrand(brand) {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/brands", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(brand)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data?.errors?.length
      ? data.errors.join(" ")
      : data?.error;

    throw new Error(detail || "Gagal menyimpan brand.");
  }

  return data.brand;
}

async function updateAdminBrand(brand) {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/brands", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(brand)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data?.errors?.length
      ? data.errors.join(" ")
      : data?.error;

    throw new Error(detail || "Gagal mengupdate brand.");
  }

  return data.brand;
}

async function toggleAdminBrandStatus(brandId, isActive) {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/brands", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      id: brandId,
      isActive
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal mengubah status brand.");
  }

  return data.brand;
}
async function fetchAllAdminBrandsForManager() {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/brands?includeInactive=1", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal memuat semua data brand.");
  }

  return data.brands || [];
}
function getAdminBrandByIdFromManager(brandId) {
  return adminBrandOptions.find((brand) => brand.id === brandId) || null;
}

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
                ${statusText}
              </p>
            </div>
          </button>

          <div class="admin-brand-item-side">
            <div class="admin-brand-theme-dots">
              <span
                class="admin-brand-theme-dot"
                style="--brand-dot-color: ${escapeHtml(mainColor)}; background-color: ${escapeHtml(mainColor)};"
                title="Warna utama"
              ></span>

              <span
                class="admin-brand-theme-dot"
                style="--brand-dot-color: ${escapeHtml(secondColor)}; background-color: ${escapeHtml(secondColor)};"
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
                ${statusActionText}
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  setupBrandListActions();
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
function resetBrandForm() {
  editingBrandId = "";

  const brandForm = document.getElementById("brandForm");

  if (brandForm) {
    brandForm.reset();
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

function setupBrandListActions() {
  document.querySelectorAll("[data-brand-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const brandId = button.dataset.brandEdit;
      const brand = getAdminBrandByIdFromManager(brandId);

      if (brand) {
        fillBrandForm(brand);
      }
    });
  });

  document.querySelectorAll("[data-brand-toggle]").forEach((button) => {
    button.addEventListener("click", async () => {
      const brandId = button.dataset.brandToggle;
      const nextActive = button.dataset.nextActive === "1";
      const brand = getAdminBrandByIdFromManager(brandId);

      if (!brand) {
        return;
      }

      const confirmed = window.confirm(
        `${nextActive ? "Aktifkan" : "Nonaktifkan"} brand ${brand.name}?`
      );

      if (!confirmed) {
        return;
      }

      try {
        button.disabled = true;
        button.textContent = "Memproses...";

        await toggleAdminBrandStatus(brandId, nextActive);
await refreshAdminBrands();
await refreshBikeBrandDropdown();

        setBrandFormNote(
          `Brand ${brand.name} berhasil ${nextActive ? "diaktifkan" : "dinonaktifkan"}.`,
          "success"
        );
      } catch (error) {
        console.error("Failed to toggle brand:", error);
        setBrandFormNote(error.message || "Gagal mengubah status brand.", "error");
      } finally {
        button.disabled = false;
      }
    });
  });
}

function setupBrandPreviewInputs() {
  [
    "brandNameInput",
    "brandLogoUploadInput",
    "brandThemeMainInput",
    "brandThemeSecondInput",
    "brandActiveInput"
  ].forEach((id) => {
    const input = document.getElementById(id);

    if (input) {
      input.addEventListener("input", renderBrandPreview);
      input.addEventListener("change", renderBrandPreview);
    }
  });
}

function setupBrandRefreshButton() {
  const refreshButton = document.getElementById("refreshBrandListBtn");

  if (!refreshButton) {
    return;
  }

  refreshButton.addEventListener("click", async () => {
    try {
      refreshButton.disabled = true;
      await refreshAdminBrands();
    } catch (error) {
      console.error("Failed to refresh brands:", error);
      setBrandFormNote(error.message || "Gagal refresh brand.", "error");
    } finally {
      refreshButton.disabled = false;
    }
  });
}

function setupBrandResetButton() {
  const resetButton = document.getElementById("resetBrandFormBtn");

  if (!resetButton) {
    return;
  }

  resetButton.addEventListener("click", resetBrandForm);
}

function setupBrandForm() {
  const brandForm = document.getElementById("brandForm");

  if (!brandForm) {
    return;
  }

  brandForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = brandForm.querySelector("button[type='submit']");
    const brand = getBrandFormData();
    const errors = validateBrandFormData(brand);

    if (errors.length) {
      setBrandFormNote(errors.join(" "), "error");
      return;
    }

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Menyimpan...";
      }

      const logoFile = document.getElementById("brandLogoUploadInput")?.files?.[0];

      if (logoFile) {
        setBrandLogoUploadNote("Mengupload logo ke R2...");

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
      setBrandFormNote(error.message || "Gagal menyimpan brand.", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = editingBrandId ? "Simpan Perubahan" : "Simpan Brand";
      }
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

  adminBrandManagerInitialized = true;

  resetBrandForm();

  try {
    await refreshAdminBrands();
  } catch (error) {
    console.error("Failed to load brand manager:", error);
  }
}