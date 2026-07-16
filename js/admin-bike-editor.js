/* =========================
   ADMIN BIKE EDITOR
========================= */
function getBikeFormData() {
  const existingId = document.getElementById("bikeIdInput")?.value.trim();
  const brandId = document.getElementById("bikeBrandInput")?.value.trim() || "";
  const selectedBrand = getAdminBrandById(brandId);
  const brand = selectedBrand?.name || "";
  const name = document.getElementById("bikeNameInput")?.value.trim();
  const generatedId = `${createSlugFromName(brand)}-${createSlugFromName(name)}`;
  const colors = getColorVariantsFromForm();
  const primaryColorName = getPrimaryColorNameFromColors(colors);
  const primaryColorImage = colors[0]?.image || "";

  return {
    id: existingId || generatedId,
    brandId,
    brand,
    name,
    battery: document.getElementById("bikeBatteryInput")?.value.trim() || "",
    motor: document.getElementById("bikeMotorInput")?.value.trim() || "",
    topSpeed: document.getElementById("bikeTopSpeedInput")?.value.trim() || "",
    range: document.getElementById("bikeRangeInput")?.value.trim() || "",
    maxWeight: document.getElementById("bikeMaxWeightInput")?.value.trim() || "",
    safety: document.getElementById("bikeSafetyInput")?.value.trim() || "",
    image: normalizeBikeImagePath(
      document.getElementById("bikeImageInput")?.value.trim() || primaryColorImage,
      "bikes"
    ),
    alt: `Sepeda listrik ${name} di showroom Lumajang`,
    comfort: document.getElementById("bikeComfortInput")?.value || "medium",
    price: Number(document.getElementById("bikePriceInput")?.value || 0),
    colorName: primaryColorName,
    colors,
    description: document.getElementById("bikeDescriptionInput")?.value.trim() || "",
    featured: Boolean(document.getElementById("bikeFeaturedInput")?.checked),
    inStock: Boolean(document.getElementById("bikeInStockInput")?.checked),
    stockQty: colors.reduce((total, color) => {
      return total + Math.max(0, Number(color.stockQty || 0));
    }, 0)
  };
}

function validateBikeFormData(bike) {
  const errors = [];
  const mainImageFile = document.getElementById("bikeMainImageUploadInput")?.files?.[0];
  const hasPendingMainImage = Boolean(mainImageFile);
  const hasFallbackImage = Boolean(bike.image || hasPendingMainImage);
  const hasColorImage = bike.colors.some((color) => Boolean(color.image));

 if (!bike.brandId || !bike.brand) {
  errors.push("Brand wajib dipilih.");
}
  if (!bike.name) errors.push("Nama model wajib diisi.");
  if (!bike.id) errors.push("ID sepeda gagal dibuat.");
  if (!bike.description) errors.push("Deskripsi wajib diisi.");
  if (bike.price < 0) errors.push("Harga tidak boleh negatif.");
  if (bike.stockQty < 0) errors.push("Total stok tidak boleh negatif.");

  if (!bike.colors.length) {
    errors.push("Tambahkan minimal satu warna unit.");
  }

  if (!hasColorImage && !hasFallbackImage) {
    errors.push("Upload minimal satu gambar warna.");
  }

  bike.colors.forEach((color, index) => {
    if (!color.name && color.image) {
      errors.push(`Nama warna ke-${index + 1} wajib diisi jika gambar warna ada.`);
    }

    if (color.stockQty < 0) {
      errors.push(`Stok warna ke-${index + 1} tidak boleh negatif.`);
    }

    if (color.stockQty > 0 && !color.name) {
      errors.push(`Nama warna ke-${index + 1} wajib diisi jika stok warna lebih dari 0.`);
    }
  });

  return errors;
}

/* =========================
   BIKE EDITOR UI
========================= */
function showBikeEditor() {
  const modal = document.getElementById("adminBikeEditorModal");
  const panel = document.getElementById("adminBikeEditorPanel");

  if (!modal || !panel) {
    return;
  }

  modal.classList.remove("is-hidden");
  panel.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-bike-editor-open");

  window.setTimeout(() => {
    panel.scrollTop = 0;
  }, 50);
}

function hideBikeEditor() {
  const modal = document.getElementById("adminBikeEditorModal");
  const panel = document.getElementById("adminBikeEditorPanel");

  if (!modal || !panel) {
    return;
  }

  modal.classList.add("is-hidden");
  panel.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-bike-editor-open");
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
  populateBikeBrandSelect();
setBikeFormValue("bikeBrandInput", "");
  setBikeFormValue("bikeComfortInput", "medium");
  setBikeFormValue("bikePriceInput", "0");
  setBikeFormValue("bikeColorNameInput", "");
  setBikeFormChecked("bikeFeaturedInput", false);
  setBikeFormChecked("bikeInStockInput", true);
  setBikeFormValue("bikeStockQtyInput", "0");

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
  const selectedBrandId = bike.brandId || bike.brand_id || getAdminBrandByName(bike.brand)?.id || "";

populateBikeBrandSelect(selectedBrandId);
setBikeFormValue("bikeBrandInput", selectedBrandId);
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
  setBikeFormValue(
  "bikeColorNameInput",
  getPrimaryColorNameFromColors(bike.colors || []) || bike.colorName || ""
);
  setBikeFormValue("bikeDescriptionInput", bike.description);
  setBikeFormChecked("bikeFeaturedInput", bike.featured);
  setBikeFormChecked("bikeInStockInput", bike.inStock);
  setBikeFormValue("bikeStockQtyInput", bike.stockQty ?? 0);

  renderColorVariants(bike.colors);
  syncDefaultColorNameFromColors();
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
const modalOverlay = document.getElementById("adminBikeEditorModalOverlay");
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
if (modalOverlay && !modalOverlay.dataset.bikeEditorOverlayBound) {
  modalOverlay.dataset.bikeEditorOverlayBound = "true";
  modalOverlay.addEventListener("click", hideBikeEditor);
}

if (!document.body.dataset.bikeEditorEscapeBound) {
  document.body.dataset.bikeEditorEscapeBound = "true";

  document.addEventListener("keydown", (event) => {
    const modal = document.getElementById("adminBikeEditorModal");

    if (
      event.key === "Escape" &&
      modal &&
      !modal.classList.contains("is-hidden")
    ) {
      hideBikeEditor();
    }
  });
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