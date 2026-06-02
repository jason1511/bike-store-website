function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPrice(price) {
  if (price === undefined || price === null || price === "") {
    return "Hubungi untuk harga";
  }

  return `Rp ${Number(price).toLocaleString("id-ID")}`;
}

const STORE_WHATSAPP_NUMBER = "6282122065168";

function getWhatsAppLink(bike) {
  const message = `Halo, saya tertarik dengan ${bike.name}. Apakah unit ini tersedia?`;
  return `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function createBikeCard(bike) {
  const brandTheme = getBrandTheme(bike.brand);
  const badges = getHighlights(bike).slice(0, 2);

  return `
    <div class="bike-card ${brandTheme.className}" data-bike-id="${escapeHtml(bike.id)}" tabindex="0" role="button">
      <img src="${escapeHtml(bike.image)}" alt="${escapeHtml(bike.alt)}" loading="lazy">

      <div class="bike-info">
        <p class="bike-brand">${escapeHtml(bike.brand)}</p>
        <h3>${escapeHtml(bike.name)}</h3>

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
            <span>Tanya WhatsApp</span>
          </span>
        </a>
      </div>
    </div>
  `;
}

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

setupThemeToggle();