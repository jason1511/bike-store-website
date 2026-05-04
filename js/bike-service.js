function getAllBikes() {
  return [...bikes];
}

function getFeaturedBikes(limit = 3) {
  return bikes
    .filter((bike) => bike.featured && bike.inStock && bike.stockQty > 0)
    .slice(0, limit);
}

function getNumberFromText(text) {
  const match = String(text || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function getBatteryAh(bike) {
  const match = String(bike.battery || "").match(/(\d+)\s*ah/i);
  return match ? Number(match[1]) : 0;
}

function getMotorWatts(bike) {
  const match = String(bike.motor || "").match(/(\d+)\s*watt/i);
  return match ? Number(match[1]) : 0;
}

function getHighlights(bike) {
  const highlights = [];

  const batteryAh = getBatteryAh(bike);
  const motorWatts = getMotorWatts(bike);
  const rangeKm = getNumberFromText(bike.range);

  if (batteryAh >= 20) {
    highlights.push("🔋 Baterai Besar");
  }

  if (motorWatts >= 800) {
    highlights.push("⚡ Motor Kuat");
  } else if (motorWatts >= 600) {
    highlights.push("⚡ Motor Bertenaga");
  }

  if (rangeKm >= 42) {
    highlights.push("🚀 Jarak Lebih Jauh");
  }

  return highlights;
}
function getChargeTime(bike) {
  if (!bike.battery) return "± 4–6 jam";

  const battery = bike.battery.toLowerCase();

  if (battery.includes("24ah")) return "± 7–9 jam";
  if (battery.includes("20ah")) return "± 6–8 jam";
  if (battery.includes("12ah")) return "± 4–5 jam";

  return "± 4–6 jam"; // fallback
}
function getBikeById(id) {
  return bikes.find((bike) => bike.id === id) || null;
}

function getBikeByIndex(index) {
  return bikes[index] || null;
}

function getAvailableBikes() {
  return bikes.filter((bike) => bike.inStock && bike.stockQty > 0);
}

function getUniqueCategories() {
  return [...new Set(bikes.map((bike) => bike.category))];
}
function getNumericRange(bike) {
  const match = String(bike.range || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}
function getRecommendedUses(bike) {
  const uses = [];

  const batteryAh = getBatteryAh(bike);
  const motorWatts = getMotorWatts(bike);
  const rangeKm = getNumberFromText(bike.range);

  uses.push("Mobilitas harian");

  if (batteryAh >= 20 || rangeKm >= 42) {
    uses.push("Jarak lebih jauh");
  }

  if (motorWatts >= 800) {
    uses.push("Pengguna yang butuh tenaga lebih");
  }

  if (bike.comfort === "high") {
    uses.push("Kenyamanan berkendara");
  }

  if (bike.safety) {
    uses.push("Pengguna yang butuh fitur keamanan tambahan");
  }

  return uses;
}
function getFilteredAndSortedBikes(options = {}) {
  const {
    brand = "all",
    search = "",
    sort = "default"
  } = options;

  let result = [...bikes];

  if (brand !== "all") {
    result = result.filter(bike => bike.brand === brand);
  }

  if (search.trim()) {
    const searchTerm = search.toLowerCase();
    result = result.filter(bike =>
      bike.name.toLowerCase().includes(searchTerm)
    );
  }

  switch (sort) {
    case "price-low":
      result.sort((a, b) => a.price - b.price);
      break;
    case "price-high":
      result.sort((a, b) => b.price - a.price);
      break;
    default:
      break;
  }

  return result;
}