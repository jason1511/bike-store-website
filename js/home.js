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

function getRecommendationReason(bike, preferences) {
  const reasons = [];

  if (bike.price <= preferences.budget) {
    reasons.push("it fits your budget");
  } else {
    reasons.push("it is the closest overall match");
  }

  if (bike.terrain === preferences.terrain) {
    reasons.push(`it suits ${getTerrainLabel(preferences.terrain)}`);
  }

  if (bike.comfort === preferences.comfort) {
    reasons.push(`it matches your preference for ${getComfortLabel(preferences.comfort)}`);
  }

  if (getNumericRange(bike) >= 75) {
    reasons.push("it offers strong battery range");
  } else if (getNumericRange(bike) >= 55) {
    reasons.push("it offers practical everyday range");
  }

  if (!reasons.length) {
    return "This bike is a solid overall match for your preferences.";
  }

  return `We picked this bike because ${reasons.join(", ")}.`;
}

function renderRecommendationResult(bike, preferences) {
  const resultCard = document.getElementById("recommendationResult");

  if (!resultCard || !bike) {
    return;
  }

  const budgetMessage =
    bike.price <= preferences.budget
      ? "Fits within your budget."
      : "Closest match above your selected budget.";

  const reasonText = getRecommendationReason(bike, preferences);

  resultCard.innerHTML = `
    <img src="${bike.image}" alt="${bike.alt}" class="recommendation-image">
    <h3>${bike.name}</h3>
    <p class="recommendation-text">
      Best for <strong>${preferences.terrain}</strong> riding with a
      <strong>${preferences.comfort}</strong> comfort preference.
    </p>
    <p class="recommendation-reason">${reasonText}</p>
    <p class="recommendation-meta">Range up to ${bike.range}</p>
    <p class="recommendation-meta">${formatPrice(bike.price)}</p>
    <p class="recommendation-note">${budgetMessage}</p>
    <a href="bikes.html?category=${bike.category}" class="btn-primary">See Matching Bikes</a>
  `;
}
function setupRecommendationForm() {
  const form = document.getElementById("recommendationForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const budget = Number(document.getElementById("budgetSelect").value);
    const terrain = document.getElementById("terrainSelect").value;
    const comfort = document.getElementById("comfortSelect").value;

    const preferences = { budget, terrain, comfort };
    const recommendedBike = getRecommendedBike(preferences);

    renderRecommendationResult(recommendedBike, preferences);
  });
}
document.addEventListener("bikesLoaded", () => {
  renderFeaturedBikes();
  setupRecommendationForm();
});