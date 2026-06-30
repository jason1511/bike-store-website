function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPrice(price) {
  const numericPrice = Number(price || 0);

  if (!numericPrice || Number.isNaN(numericPrice)) {
    return "Hubungi untuk harga";
  }

  return `Rp ${numericPrice.toLocaleString("id-ID")}`;
}

const STORE_WHATSAPP_NUMBER = "6282122065168";

function getBikeTotalStockForCard(bike) {
  if (typeof getBikeTotalStock === "function") {
    return getBikeTotalStock(bike);
  }

  const colors = getBikeColors(bike);
  const colorStockTotal = colors.reduce((total, color) => {
    return total + Math.max(0, Number(color.stockQty || 0));
  }, 0);

  return colorStockTotal > 0
    ? colorStockTotal
    : Math.max(0, Number(bike?.stockQty || 0));
}

function isBikeUnavailable(bike) {
  return !bike?.inStock || getBikeTotalStockForCard(bike) <= 0;
}

function getBikeAvailabilityLabel(bike) {
  if (!bike?.inStock) {
    return "Tidak aktif";
  }

  const totalStock = getBikeTotalStockForCard(bike);

  if (totalStock <= 0) {
    return "Stok Habis";
  }

  return `Stok ${totalStock}`;
}

function getWhatsAppLink(bike) {
  const bikeName = bike?.name || "sepeda listrik";
  const isUnavailable = isBikeUnavailable(bike);

  const message = isUnavailable
    ? `Halo, saya tertarik dengan ${bikeName}. Apakah unit ini bisa dipesan atau kapan tersedia kembali?`
    : `Halo, saya tertarik dengan ${bikeName}. Apakah unit ini tersedia?`;

  return `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function getBikeColors(bike) {
  if (!bike) {
    return [];
  }

  let colors = [];

  if (Array.isArray(bike.colors)) {
    colors = bike.colors;
  } else if (typeof bike.colors === "string") {
    try {
      const parsedColors = JSON.parse(bike.colors);
      colors = Array.isArray(parsedColors) ? parsedColors : [];
    } catch (error) {
      colors = [];
    }
  }

  return colors
    .map((color) => ({
      name: String(color.name || "").trim(),
      hex: String(color.hex || "#cccccc").trim(),
      image: String(color.image || "").trim(),
      stockQty: Math.max(0, Number(color.stockQty || 0))
    }))
    .filter((color) => color.name || color.image || color.stockQty > 0);
}

function getBikePrimaryColorForCard(bike) {
  const colors = getBikeColors(bike);

  return colors.find((color) => color.stockQty > 0 && color.image)
    || colors.find((color) => color.image)
    || colors.find((color) => color.stockQty > 0)
    || colors[0]
    || null;
}

function getBikeDisplayImageForCard(bike) {
  const primaryColor = getBikePrimaryColorForCard(bike);

  return primaryColor?.image || bike?.image || "images/logo.jpeg";
}

/* =========================
   BIKE CARD COLOR SWITCHER
========================= */
function switchBikeCardColor(button) {
  if (button.disabled) {
    return;
  }

  const card = button.closest(".bike-card");

  if (!card) {
    return;
  }

  const bikeImage = card.querySelector(".bike-card-image");
  const colorLabel = card.querySelector(".bike-color-label");
  const stockLabel = card.querySelector(".bike-card-selected-stock");
  const newImage = button.dataset.bikeColorImage;
  const newColorName = button.dataset.bikeColorName;
  const newStockQty = Number(button.dataset.bikeColorStock || 0);

  if (bikeImage && newImage) {
    bikeImage.src = newImage;
  }

  if (colorLabel && newColorName) {
    colorLabel.textContent = `Warna: ${newColorName}`;
  }

  if (stockLabel && newColorName) {
    stockLabel.textContent = `Stok ${newColorName}: ${newStockQty}`;
    stockLabel.classList.toggle("is-empty", newStockQty <= 0);
  }

  card.querySelectorAll(".bike-color-dot").forEach((dot) => {
    dot.classList.remove("is-active");
  });

  button.classList.add("is-active");
}

/* =========================
   BIKE CARD
========================= */
function createBikeCard(bike) {
  const brandTheme = getBrandTheme(bike.brand);
  const badges = getHighlights(bike).slice(0, 2);
  const colorVariants = getBikeColors(bike);
  const defaultColor = getBikePrimaryColorForCard(bike);

  const imageSrc = getBikeDisplayImageForCard(bike);
  const colorName = defaultColor?.name || bike.colorName || "";
  const selectedColorStock = defaultColor
    ? Number(defaultColor.stockQty || 0)
    : getBikeTotalStockForCard(bike);
  const imageAlt = bike.alt || `Sepeda listrik ${bike.name || bike.brand || ""}`;

  const isUnavailable = isBikeUnavailable(bike);
  const availabilityLabel = getBikeAvailabilityLabel(bike);
  const whatsappLabel = isUnavailable ? "Tanya Ketersediaan" : "Tanya WhatsApp";

  return `
    <div
      class="bike-card ${brandTheme.className} ${isUnavailable ? "is-unavailable" : ""}"
      data-bike-id="${escapeHtml(bike.id)}"
      tabindex="0"
      role="button"
    >
      <div class="bike-card-image-wrap">
        <img
          src="${escapeHtml(imageSrc)}"
          alt="${escapeHtml(imageAlt)}"
          class="bike-card-image"
          loading="lazy"
        >

        <span class="bike-availability-badge ${isUnavailable ? "is-unavailable" : "is-available"}">
          ${escapeHtml(availabilityLabel)}
        </span>
      </div>

      <div class="bike-info">
        <p class="bike-brand">${escapeHtml(bike.brand)}</p>
        <h3>${escapeHtml(bike.name)}</h3>

        ${
          colorName
            ? `
              <p class="bike-color-label">
                Warna: ${escapeHtml(colorName)}
              </p>
            `
            : ""
        }

        ${
          colorVariants.length
            ? `
              <div class="bike-color-options" aria-label="Pilihan warna ${escapeHtml(bike.name)}">
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
                        onclick="event.stopPropagation(); switchBikeCardColor(this);"
                        aria-label="Warna ${escapeHtml(color.name || "unit")} - ${stockQty} unit"
                        title="${escapeHtml(color.name || "Warna")} - stok ${stockQty}"
                        ${isColorAvailable ? "" : "disabled"}
                      ></button>
                    `;
                  })
                  .join("")}
              </div>

              <p class="bike-card-selected-stock ${selectedColorStock > 0 ? "is-available" : "is-empty"}">
                ${
                  colorName
                    ? `Stok ${escapeHtml(colorName)}: ${selectedColorStock}`
                    : `Stok tersedia: ${selectedColorStock}`
                }
              </p>
            `
            : ""
        }

        <p class="bike-spec">
          Jarak tempuh ${escapeHtml(bike.range || "-")}
        </p>

        <p class="bike-card-description">
          ${escapeHtml(bike.description || "Sepeda listrik untuk kebutuhan mobilitas harian.")}
        </p>

        ${
          badges.length
            ? `
              <div class="bike-card-badges">
                ${badges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join("")}
              </div>
            `
            : ""
        }

        <p class="bike-price">${formatPrice(bike.price)}</p>

        ${
          isUnavailable
            ? `
              <p class="bike-unavailable-note">
                Unit sedang kosong. Silakan hubungi showroom untuk jadwal restock atau pemesanan.
              </p>
            `
            : ""
        }

        <a
          href="${getWhatsAppLink(bike)}"
          class="bike-whatsapp-btn ${isUnavailable ? "is-unavailable" : ""}"
          target="_blank"
          rel="noopener"
          onclick="event.stopPropagation();"
        >
          <span class="wa-btn-content">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
              alt="WhatsApp"
              class="wa-icon"
            >
            <span>${escapeHtml(whatsappLabel)}</span>
          </span>
        </a>
      </div>
    </div>
  `;
}
/* =========================
   THEME TOGGLE
========================= */
function setupThemeToggle() {
  const themeToggle = document.getElementById("themeToggle");

  if (!themeToggle) {
    return;
  }

  const savedTheme = localStorage.getItem("siteTheme");
  const shouldUseDarkTheme = savedTheme === null || savedTheme === "dark";

  if (shouldUseDarkTheme) {
    document.body.classList.add("dark-theme");
    themeToggle.textContent = "Light";
  } else {
    document.body.classList.remove("dark-theme");
    themeToggle.textContent = "Dark";
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");

    const isDark = document.body.classList.contains("dark-theme");

    localStorage.setItem("siteTheme", isDark ? "dark" : "light");
    themeToggle.textContent = isDark ? "Light" : "Dark";
  });
}

/* =========================
   SHARED ADMIN NAV LINK
   Used by index.html, bikes.html, contact.html
========================= */
const SITE_ADMIN_SESSION_STORAGE_KEY = "nbaAdminSessionToken";
const SITE_ADMIN_USER_STORAGE_KEY = "nbaAdminUser";

function getStoredSiteAdminToken() {
  return sessionStorage.getItem(SITE_ADMIN_SESSION_STORAGE_KEY) || "";
}

function getStoredSiteAdminUser() {
  try {
    return JSON.parse(sessionStorage.getItem(SITE_ADMIN_USER_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function isValidSiteAdminUser(user) {
  return user && ["admin", "staff"].includes(user.role);
}

function removeAdminNavbarItem() {
  document
    .querySelectorAll("[data-admin-navbar-item], [data-admin-portal-link]")
    .forEach((element) => {
      element.remove();
    });
}

function createAdminNavbarItem(user) {
  const item = document.createElement("li");
  item.setAttribute("data-admin-navbar-item", "true");

  const username = user.username || "user";
  const role = user.role || "";

  item.innerHTML = `
    <a href="admin.html" class="admin-portal-link" title="Masuk ke dashboard admin">
      <span class="admin-portal-icon">Admin</span>
      <span class="admin-portal-identity">
        <strong>${escapeHtml(username)}</strong>
        <small>${escapeHtml(role)}</small>
      </span>
    </a>
  `;

  return item;
}

function renderAdminNavbarItem(user) {
  const navLinks = document.querySelector(".nav-links");

  removeAdminNavbarItem();

  if (!navLinks || !isValidSiteAdminUser(user)) {
    return;
  }

  navLinks.appendChild(createAdminNavbarItem(user));
}

async function verifySiteAdminSession(token) {
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

async function setupAdminNavbarItem() {
  const token = getStoredSiteAdminToken();
  const storedUser = getStoredSiteAdminUser();

  removeAdminNavbarItem();

  if (!token || !isValidSiteAdminUser(storedUser)) {
    return;
  }

  renderAdminNavbarItem(storedUser);

  try {
    const verifiedUser = await verifySiteAdminSession(token);

    const updatedUser = {
      username: verifiedUser.username,
      role: verifiedUser.role,
      permissions: verifiedUser.permissions
    };

    sessionStorage.setItem(
      SITE_ADMIN_USER_STORAGE_KEY,
      JSON.stringify(updatedUser)
    );

    renderAdminNavbarItem(updatedUser);
  } catch (error) {
    sessionStorage.removeItem(SITE_ADMIN_SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SITE_ADMIN_USER_STORAGE_KEY);
    removeAdminNavbarItem();
  }
}

/* =========================
   INIT
========================= */
setupThemeToggle();
setupAdminNavbarItem();