let homeBrandOptions = [];

function getHomeBrandFallbacks() {
  if (!Array.isArray(bikes)) {
    return [];
  }

  const names = [...new Set(bikes.map((bike) => bike.brand).filter(Boolean))];

  return names
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const fallbackTheme = getBrandTheme(name);

      return {
        id: normalizeBrandSlug(name),
        name,
        slug: normalizeBrandSlug(name),
        logoPath: fallbackTheme.logo || "",
        className: fallbackTheme.className,
        theme: {
          main: fallbackTheme.main,
          second: fallbackTheme.second,
          soft: fallbackTheme.soft,
          glow: fallbackTheme.glow
        }
      };
    });
}

function getSafeBrandThemeValue(value, fallback) {
  const candidate = String(value || "").trim();

  if (!candidate || !/^[#(),.%\sa-zA-Z0-9-]+$/.test(candidate)) {
    return fallback;
  }

  return candidate;
}

function getHomeBrandPresentation(brand) {
  const fallbackTheme = getBrandTheme(brand.name);
  const theme = brand.theme || {};
  const slug = normalizeBrandSlug(brand.slug || brand.name);
  const name = String(brand.name || "Brand");
  const logoPath = String(brand.logoPath || fallbackTheme.logo || "");

  return {
    name,
    slug,
    logoPath,
    className: brand.className || (slug ? `brand-${slug}` : "brand-default"),
    style: [
      `--brand-main: ${getSafeBrandThemeValue(theme.main, fallbackTheme.main)}`,
      `--brand-second: ${getSafeBrandThemeValue(theme.second, fallbackTheme.second)}`,
      `--brand-soft: ${getSafeBrandThemeValue(theme.soft, fallbackTheme.soft)}`,
      `--brand-glow: ${getSafeBrandThemeValue(theme.glow, fallbackTheme.glow)}`
    ].join("; ")
  };
}

function createHomeBrandLogo(brand, decorative = false) {
  if (!brand.logoPath) {
    return `<span class="brand-logo-fallback" aria-hidden="true">${escapeHtml(brand.name.slice(0, 2).toUpperCase())}</span>`;
  }

  return `
    <img
      src="${escapeHtml(brand.logoPath)}"
      alt="${decorative ? "" : `${escapeHtml(brand.name)} logo`}"
      loading="lazy"
    >
  `;
}

function createBrandMarqueeGroup(brands, groupIndex) {
  return `
    <div class="brand-marquee-group"${groupIndex > 0 ? ' aria-hidden="true"' : ""}>
      ${brands
        .map((rawBrand) => {
          const brand = getHomeBrandPresentation(rawBrand);

          return `
            <a
              href="/bikes?brand=${encodeURIComponent(brand.slug || brand.name)}"
              class="brand-marquee-item ${escapeHtml(brand.className)}"
              style="${escapeHtml(brand.style)}"
              ${groupIndex > 0 ? 'tabindex="-1"' : ""}
            >
              ${createHomeBrandLogo(brand, groupIndex > 0)}
              <span>${escapeHtml(brand.name)}</span>
            </a>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderHomeBrands() {
  const marquee = document.getElementById("brandMarquee");
  const marqueeTrack = document.getElementById("brandMarqueeTrack");
  const brandGrid = document.getElementById("homeBrandGrid");

  if (!marquee || !marqueeTrack || !brandGrid) {
    return;
  }

  if (!homeBrandOptions.length) {
    marquee.hidden = true;
    brandGrid.innerHTML = `
      <div class="brand-empty-state">
        <strong>Brand sedang diperbarui</strong>
        <span>Silakan lihat katalog atau hubungi showroom untuk pilihan terbaru.</span>
      </div>
    `;
    return;
  }

  marquee.hidden = false;
  marqueeTrack.innerHTML = Array.from(
    { length: 4 },
    (_, index) => createBrandMarqueeGroup(homeBrandOptions, index)
  ).join("");

  brandGrid.innerHTML = homeBrandOptions
    .map((rawBrand) => {
      const brand = getHomeBrandPresentation(rawBrand);

      return `
        <a
          href="/bikes?brand=${encodeURIComponent(brand.slug || brand.name)}"
          class="brand-logo-card ${escapeHtml(brand.className)}"
          style="${escapeHtml(brand.style)}"
          aria-label="Lihat sepeda ${escapeHtml(brand.name)}"
        >
          ${createHomeBrandLogo(brand)}
          <span>${escapeHtml(brand.name)}</span>
          <small>Lihat koleksi</small>
        </a>
      `;
    })
    .join("");

  document.querySelectorAll("#brandMarqueeTrack img, #homeBrandGrid img").forEach((image) => {
    image.addEventListener("error", () => {
      const fallback = document.createElement("span");
      const brandName = image.closest("a")?.querySelector("span:last-of-type")?.textContent || "BR";

      fallback.className = "brand-logo-fallback";
      fallback.setAttribute("aria-hidden", "true");
      fallback.textContent = brandName.slice(0, 2).toUpperCase();
      image.replaceWith(fallback);
    }, { once: true });
  });
}

async function loadHomeBrands() {
  try {
    const response = await fetch("/api/brands");
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || "Gagal memuat brand aktif.");
    }

    homeBrandOptions = Array.isArray(data?.brands) ? data.brands : [];
  } catch (error) {
    console.error("Failed to load active homepage brands:", error);
    homeBrandOptions = getHomeBrandFallbacks();
  }

  renderHomeBrands();
}

function setupBikeFinderForm() {
  const form = document.getElementById("bikeFinderForm");
  const result = document.getElementById("bikeFinderResult");
  const usageInput = document.getElementById("usageInput");

  if (!form || !result || !usageInput) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const usage = usageInput.value;

    result.innerHTML = `
      <h3>Mencari rekomendasi...</h3>
      <p>Sedang mencocokkan kebutuhan Anda dengan katalog sepeda listrik.</p>
    `;

    try {
      const response = await fetch("/api/recommend-bike", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          usage,
          bikes
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("API error response:", errorData);
        throw new Error(errorData?.error || "Failed to get recommendation");
      }

      const data = await response.json();
      const bike = getBikeById(data.bikeId);

      if (!bike) {
        throw new Error("Recommended bike not found");
      }

      const brandTheme = getBrandTheme(bike.brand);

result.innerHTML = `
  <div class="ai-recommend-card ${brandTheme.className}">
    <div class="ai-recommend-image">
      <img src="${bike.image}" alt="${bike.alt}">
    </div>

    <div class="ai-recommend-info">
      <p class="hero-bike-label">Rekomendasi Cerdas</p>
      <p class="hero-bike-brand">${bike.brand}</p>
      <h3>${bike.name}</h3>

      <p class="ai-recommend-reason">
        ${data.reason}
      </p>

      <div class="ai-recommend-specs">
        <span>Jarak tempuh ${bike.range || "-"}</span>
        <span>${bike.motor || "Motor belum tersedia"}</span>
        <span>${bike.safety || "Fitur keamanan standar"}</span>
      </div>

      <div class="ai-result-actions">
        <button type="button" class="btn-secondary" id="openAiBikeModal">
          Lihat Detail
        </button>

        <a 
          href="${getWhatsAppLink(bike)}" 
          class="btn-primary"
          target="_blank"
          rel="noopener"
        >
          Tanya WhatsApp
        </a>
      </div>
    </div>
  </div>
`;

      const openButton = document.getElementById("openAiBikeModal");

      if (openButton) {
        openButton.addEventListener("click", () => {
          openBikeModal(bike.id);
        });
      }
    } catch (error) {
      console.error(error);

      result.innerHTML = `
        <h3>Rekomendasi belum tersedia</h3>
        <p>Silakan coba lagi, atau hubungi toko melalui WhatsApp untuk konsultasi langsung.</p>
      `;
    }
  });
}

function renderHeroFeaturedBike() {
  const heroFeaturedBike = document.getElementById("heroFeaturedBike");

  if (!heroFeaturedBike || !Array.isArray(bikes) || bikes.length === 0) {
    return;
  }

  const featuredBikes = bikes.filter((bike) => bike.featured);
  const pool = featuredBikes.length > 0 ? featuredBikes : bikes;
  const randomBike = pool[Math.floor(Math.random() * pool.length)];
  const brandTheme = getBrandTheme(randomBike.brand);
  const heroSection = document.querySelector(".hero");

  if (heroSection) {
    heroSection.classList.remove(
      "hero-brand-exotic",
      "hero-brand-pacific",
      "hero-brand-larizz",
      "hero-brand-saige",
      "hero-brand-uwinfly",
      "hero-brand-nuv"
    );

    heroSection.classList.add(`hero-${brandTheme.className}`);
  }

  heroFeaturedBike.innerHTML = `
    <div class="hero-bike-card ${brandTheme.className}" data-bike-id="${randomBike.id}" tabindex="0" role="button">
      <img src="${randomBike.image}" alt="${randomBike.alt}">

      <div class="hero-bike-info">
        <p class="hero-bike-label">Pilihan Hari Ini</p>
        <p class="hero-bike-brand">${randomBike.brand}</p>
        <h3>${randomBike.name}</h3>
        <p>Jarak tempuh ${randomBike.range || "-"}</p>

        <a 
          href="${getWhatsAppLink(randomBike)}" 
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

  const heroCard = heroFeaturedBike.querySelector(".hero-bike-card");

  if (!heroCard) {
    return;
  }

  heroCard.addEventListener("click", () => {
    openBikeModal(randomBike.id);
  });

  heroCard.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openBikeModal(randomBike.id);
    }
  });
}

async function initializeHomePage() {
  if (typeof loadBikes === "function" && !bikesLoaded) {
    await loadBikes();
  }

  await loadHomeBrands();
  renderHeroFeaturedBike();
  setupBikeFinderForm();
}

document.addEventListener("DOMContentLoaded", initializeHomePage);