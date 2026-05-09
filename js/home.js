function renderFeaturedBikes() {
  const featuredBikeGrid = document.getElementById("featuredBikeGrid");

  if (!featuredBikeGrid) {
    return;
  }

const featuredBikes = getFeaturedBikes(3);
  featuredBikeGrid.innerHTML = featuredBikes
  .map((bike) => createBikeCard(bike))
  .join("");
}
function setupBikeFinderForm() {
  const form = document.getElementById("bikeFinderForm");
  const result = document.getElementById("bikeFinderResult");

  if (!form || !result) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const usage = document.getElementById("usageInput").value;
    const budget = document.getElementById("budgetInput").value.trim();

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
          budget: budget || "",
          bikes
        })
      });

      if (!response.ok) {
        throw new Error("Failed to get recommendation");
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

  if (!heroFeaturedBike || !bikes.length) {
    return;
  }

  const featuredBikes = bikes.filter((bike) => bike.featured);
  const bikePool = featuredBikes.length ? featuredBikes : bikes;

  const randomIndex = Math.floor(Math.random() * bikePool.length);
  const selectedBike = bikePool[randomIndex];

  heroFeaturedBike.innerHTML = `
    <div class="hero-bike-card" data-bike-id="${selectedBike.id}" tabindex="0" role="button">
      <img src="${selectedBike.image}" alt="${selectedBike.alt}">

      <div class="hero-bike-info">
        <p class="hero-bike-label">Rekomendasi Hari Ini</p>
        <p class="hero-bike-brand">${selectedBike.brand}</p>
        <h3>${selectedBike.name}</h3>
        <p>Jarak tempuh ${selectedBike.range || "-"}</p>

        <a 
  href="${getWhatsAppLink(selectedBike)}" 
  class="btn-primary hero-whatsapp-btn"
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

if (heroCard) {
  heroCard.addEventListener("click", () => {
    openBikeModal(selectedBike.id);
  });

  heroCard.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openBikeModal(selectedBike.id);
    }
  });
}
}
function getBikeScore(bike, preferences) {
  let score = 0;

  if (bike.price <= preferences.budget) {
    score += 3;
  }

  if (bike.terrain === preferences.terrain) {
    score += 3;
  } else if (
    preferences.terrain === "mixed" &&
    (bike.terrain === "city" || bike.terrain === "rough")
  ) {
    score += 1;
  }

  if (bike.comfort === preferences.comfort) {
    score += 2;
  }

  score += getNumericRange(bike) / 100;

  return score;
}

function getRecommendedBike(preferences) {
  const affordableBikes = bikes.filter((bike) => bike.price <= preferences.budget);

  const candidateBikes = affordableBikes.length ? affordableBikes : [...bikes];

  const scoredBikes = candidateBikes.map((bike) => ({
    bike,
    score: getBikeScore(bike, preferences)
  }));

  scoredBikes.sort((a, b) => b.score - a.score);

  return scoredBikes[0].bike;
}

function getTerrainLabel(terrain) {
  switch (terrain) {
    case "city":
      return "city riding";
    case "mixed":
      return "mixed-road riding";
    case "rough":
      return "rougher terrain";
    default:
      return terrain;
  }
}

function getComfortLabel(comfort) {
  switch (comfort) {
    case "high":
      return "higher comfort";
    case "medium":
      return "balanced comfort";
    default:
      return comfort;
  }
}
whenBikesLoaded(() => {
  renderHeroFeaturedBike();
  setupBikeFinderForm();
  setupBikeModalControls();
});
