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
whenBikesLoaded(() => {
  renderFeaturedBikes();
});