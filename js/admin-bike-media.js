/* =========================
   ADMIN BIKE MEDIA
========================= */
function buildBikeImageBaseName(extra = "") {
  const brandId = document.getElementById("bikeBrandInput")?.value.trim() || "";
const brand = getAdminBrandById(brandId)?.name || "";
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
  const imageBase64 = await readFileAsDataUrl(file);

  const response = await fetch("/api/admin/upload-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      imageBase64,
      fileName: file.name,
      fileType: file.type,
      folder,
      fileBaseName
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal upload gambar.");
  }

  if (!data?.imagePath) {
    throw new Error("Upload berhasil, tetapi path gambar tidak dikembalikan.");
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