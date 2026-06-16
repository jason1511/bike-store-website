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

function isBikeUnavailable(bike) {
  return Boolean(bike?.inStock) && Number(bike?.stockQty || 0) <= 0;
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
  if (Array.isArray(bike.colors)) {
    return bike.colors;
  }

  if (typeof bike.colors === "string") {
    try {
      const parsedColors = JSON.parse(bike.colors);
      return Array.isArray(parsedColors) ? parsedColors : [];
    } catch (error) {
      return [];
    }
  }

  return [];
}

/* =========================
   BIKE CARD COLOR SWITCHER
========================= */
function switchBikeCardColor(button) {
  const card = button.closest(".bike-card");

  if (!card) {
    return;
  }

  const bikeImage = card.querySelector(".bike-card-image");
  const colorLabel = card.querySelector(".bike-color-label");
  const newImage = button.dataset.bikeColorImage;
  const newColorName = button.dataset.bikeColorName;

  if (bikeImage && newImage) {
    bikeImage.src = newImage;
  }

  if (colorLabel && newColorName) {
    colorLabel.textContent = `Warna: ${newColorName}`;
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
  const defaultColor = colorVariants[0] || null;
  const imageSrc = defaultColor?.image || bike.image || "images/logo.jpeg";
  const colorName = defaultColor?.name || bike.colorName || "";
  const imageAlt = bike.alt || `Sepeda listrik ${bike.name || bike.brand || ""}`;
  const isUnavailable = isBikeUnavailable(bike);
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

        ${
          isUnavailable
            ? `
              <span class="bike-stock-badge">
                Stok Habis
              </span>
            `
            : ""
        }
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
                  .map((color, index) => `
                    <button
                      type="button"
                      class="bike-color-dot ${index === 0 ? "is-active" : ""}"
                      style="--bike-color-dot: ${escapeHtml(color.hex || "#cccccc")};"
                      data-bike-color-image="${escapeHtml(color.image || bike.image || "")}"
                      data-bike-color-name="${escapeHtml(color.name || "")}"
                      onclick="event.stopPropagation(); switchBikeCardColor(this);"
                      aria-label="Warna ${escapeHtml(color.name || "unit")}"
                      title="${escapeHtml(color.name || "Warna")}"
                    ></button>
                  `)
                  .join("")}
              </div>
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

        <a
          href="${getWhatsAppLink(bike)}"
          class="bike-whatsapp-btn"
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
  document.querySelectorAll("[data-admin-navbar-item]").forEach((element) => {
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

  if (!navLinks || !isValidSiteAdminUser(user)) {
    removeAdminNavbarItem();
    return;
  }

  removeAdminNavbarItem();
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

  if (!token || !isValidSiteAdminUser(storedUser)) {
    removeAdminNavbarItem();
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