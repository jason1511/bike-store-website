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

      result.innerHTML = `
        <p class="hero-bike-label">Rekomendasi AI</p>
        <h3>${bike.name}</h3>
        <p>${data.reason}</p>

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
        <p class="hero-bike-label">Rekomendasi Hari Ini</p>
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

whenBikesLoaded(() => {
  renderHeroFeaturedBike();
  setupBikeFinderForm();
  setupBikeModalControls();
});