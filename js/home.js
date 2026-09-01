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

      const brandTheme = getBrandTheme(bike);

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

let heroDeckBikes = [];
let heroDeckActiveIndex = 0;
let heroDeckTimer = null;
let heroDeckSuppressOpen = false;

function getHeroDailySeed() {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  } catch (error) {
    return new Date().toISOString().slice(0, 10);
  }
}

function createSeededHeroRandom(seedText) {
  let seed = Array.from(String(seedText)).reduce(
    (total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0,
    2166136261
  );

  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleHeroBikes(items, random) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[targetIndex]] = [shuffled[targetIndex], shuffled[index]];
  }

  return shuffled;
}

function selectDailyHeroBikes(limit = 5) {
  const random = createSeededHeroRandom(getHeroDailySeed());
  const featured = shuffleHeroBikes(bikes.filter((bike) => bike.featured), random);
  const remaining = shuffleHeroBikes(bikes.filter((bike) => !bike.featured), random);
  const orderedPool = [...featured, ...remaining];
  const selected = [];
  const selectedIds = new Set();
  const selectedBrands = new Set();

  orderedPool.forEach((bike) => {
    const brandKey = String(bike.brand || "").toLowerCase();

    if (selected.length < limit && !selectedBrands.has(brandKey)) {
      selected.push(bike);
      selectedIds.add(bike.id);
      selectedBrands.add(brandKey);
    }
  });

  orderedPool.forEach((bike) => {
    if (selected.length < limit && !selectedIds.has(bike.id)) {
      selected.push(bike);
      selectedIds.add(bike.id);
    }
  });

  return selected;
}

function getHeroBikeReason(bike) {
  const range = Number.parseFloat(String(bike.range || "").replace(",", ".")) || 0;
  const motor = Number.parseFloat(String(bike.motor || "").replace(/[^0-9.]/g, "")) || 0;

  if (range >= 60) return "Pilihan perjalanan lebih jauh";
  if (motor >= 1000) return "Tenaga untuk kebutuhan lebih";
  if (bike.comfort === "high") return "Nyaman untuk aktivitas harian";
  return "Pilihan mobilitas harian";
}

function applyHeroBikeTheme(bike) {
  const brandTheme = getBrandTheme(bike);
  const heroSection = document.querySelector(".hero");

  if (!heroSection) {
    return brandTheme;
  }

  Array.from(heroSection.classList)
    .filter((className) => className.startsWith("hero-brand-"))
    .forEach((className) => heroSection.classList.remove(className));

  heroSection.classList.add(`hero-${brandTheme.className}`);
  heroSection.style.setProperty("--hero-brand-main", getSafeBrandThemeValue(brandTheme.main, "#6be9ff"));
  heroSection.style.setProperty("--hero-brand-second", getSafeBrandThemeValue(brandTheme.second, "#2a7c89"));
  heroSection.style.setProperty("--hero-brand-soft", getSafeBrandThemeValue(brandTheme.soft, "rgba(107, 233, 255, 0.12)"));
  heroSection.style.setProperty("--hero-brand-glow", getSafeBrandThemeValue(brandTheme.glow, "rgba(107, 233, 255, 0.16)"));

  return brandTheme;
}

function updateHeroDeck() {
  const heroFeaturedBike = document.getElementById("heroFeaturedBike");
  const activeBike = heroDeckBikes[heroDeckActiveIndex];

  if (!heroFeaturedBike || !activeBike) {
    return;
  }

  applyHeroBikeTheme(activeBike);
  const rangeValue = document.getElementById("heroRangeValue");
  const motorValue = document.getElementById("heroMotorValue");
  const priceValue = document.getElementById("heroPriceValue");
  const sequenceValue = document.getElementById("heroSequence");
  const total = heroDeckBikes.length;

  if (sequenceValue) {
    sequenceValue.textContent = `${heroDeckActiveIndex + 1}—${total}`;
  }

  if (rangeValue) {
    rangeValue.textContent = activeBike.range || "—";
  }

  if (motorValue) {
    motorValue.textContent = activeBike.motor || "—";
  }

  if (priceValue) {
    priceValue.textContent = Number(activeBike.price || 0)
      ? `Rp ${(Number(activeBike.price) / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`
      : "Hubungi";
  }

  heroFeaturedBike.querySelectorAll(".hero-deck-card").forEach((card, cardIndex) => {
    const depth = (cardIndex - heroDeckActiveIndex + total) % total;
    const isActive = depth === 0;

    card.dataset.depth = String(depth);
    card.classList.toggle("is-active", isActive);
    card.setAttribute("aria-hidden", isActive ? "false" : "true");
    card.tabIndex = isActive ? 0 : -1;
  });
}

function resetHeroDeckTimer() {
  window.clearTimeout(heroDeckTimer);

  if (heroDeckBikes.length > 1 && !document.hidden) {
    heroDeckTimer = window.setTimeout(() => moveHeroDeck(1, false), 9000);
  }
}

function moveHeroDeck(direction = 1, userInitiated = true) {
  const heroFeaturedBike = document.getElementById("heroFeaturedBike");
  const activeCard = heroFeaturedBike?.querySelector('.hero-deck-card[data-depth="0"]');

  if (!heroFeaturedBike || heroDeckBikes.length < 2 || heroFeaturedBike.classList.contains("is-moving")) {
    return;
  }

  heroFeaturedBike.classList.add("is-moving");
  activeCard?.classList.add(direction > 0 ? "is-discarding" : "is-returning");

  window.setTimeout(() => {
    heroDeckActiveIndex = (heroDeckActiveIndex + direction + heroDeckBikes.length) % heroDeckBikes.length;
    activeCard?.classList.remove("is-discarding", "is-returning");
    heroFeaturedBike.classList.remove("is-moving");
    updateHeroDeck();
    resetHeroDeckTimer();
  }, userInitiated ? 280 : 360);
}

function renderHeroFeaturedBike() {
  const heroFeaturedBike = document.getElementById("heroFeaturedBike");

  if (!heroFeaturedBike || !Array.isArray(bikes) || bikes.length === 0) {
    return;
  }

  heroDeckBikes = selectDailyHeroBikes(5);
  heroDeckActiveIndex = 0;
  const jitterRandom = createSeededHeroRandom(`${getHeroDailySeed()}-deck-position`);

  heroFeaturedBike.innerHTML = heroDeckBikes
    .map((bike, index) => {
      const brandTheme = getBrandTheme(bike);
      const jitterX = Math.round((jitterRandom() - 0.5) * 16);
      const jitterY = Math.round(jitterRandom() * 10);
      const jitterRotate = ((jitterRandom() - 0.5) * 2.4).toFixed(2);

      return `
        <div
          class="hero-bike-card hero-deck-card ${brandTheme.className}"
          data-bike-id="${escapeHtml(bike.id)}"
          data-depth="${index}"
          style="--deck-x: ${jitterX}px; --deck-y: ${jitterY}px; --deck-rotate: ${jitterRotate}deg; --deck-brand-main: ${getSafeBrandThemeValue(brandTheme.main, "#6be9ff")}; --deck-brand-soft: ${getSafeBrandThemeValue(brandTheme.soft, "rgba(107, 233, 255, 0.12)")};"
          tabindex="${index === 0 ? "0" : "-1"}"
          role="button"
          aria-hidden="${index === 0 ? "false" : "true"}"
          aria-label="Buka detail ${escapeHtml(bike.brand)} ${escapeHtml(bike.name)}"
        >
          <div class="hero-deck-image">
            <img src="${escapeHtml(getBikeDisplayImage(bike))}" alt="${escapeHtml(bike.alt || `Sepeda listrik ${bike.brand} ${bike.name}`)}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
          </div>

          <div class="hero-bike-info">
            <p class="hero-bike-label">${escapeHtml(bike.brand)} / Electric Series</p>
            <h3>${escapeHtml(bike.name)}</h3>
            <p class="hero-bike-reason">${escapeHtml(getHeroBikeReason(bike))}</p>
          </div>
        </div>
      `;
    })
    .join("");

  heroFeaturedBike.querySelectorAll(".hero-deck-card").forEach((card) => {
    card.addEventListener("click", () => {
      if (card.dataset.depth === "0" && !heroDeckSuppressOpen) {
        openBikeModal(card.dataset.bikeId);
      }
    });

    card.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && card.dataset.depth === "0") {
        event.preventDefault();
        openBikeModal(card.dataset.bikeId);
      }
    });
  });

  document.getElementById("heroDeckPrev")?.addEventListener("click", () => moveHeroDeck(-1));
  document.getElementById("heroDeckNext")?.addEventListener("click", () => moveHeroDeck(1));

  let pointerStartX = 0;
  let pointerStartY = 0;

  heroFeaturedBike.addEventListener("pointerdown", (event) => {
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    heroDeckSuppressOpen = false;
  });

  heroFeaturedBike.addEventListener("pointerup", (event) => {
    const distanceX = event.clientX - pointerStartX;
    const distanceY = event.clientY - pointerStartY;

    if (Math.abs(distanceX) > 44 && Math.abs(distanceX) > Math.abs(distanceY)) {
      heroDeckSuppressOpen = true;
      moveHeroDeck(distanceX < 0 ? 1 : -1);
      window.setTimeout(() => {
        heroDeckSuppressOpen = false;
      }, 400);
    }
  });

  document.addEventListener("visibilitychange", resetHeroDeckTimer);
  updateHeroDeck();
  resetHeroDeckTimer();
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
