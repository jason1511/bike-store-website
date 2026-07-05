function getAllBikes() {
  return [...bikes];
}

function getFeaturedBikes(limit = 3) {
  return bikes
    .filter((bike) => bike.featured && isBikeAvailable(bike))
    .slice(0, limit);
}

function getHighlights(bike) {
  const highlights = [];

  const batteryAh = getBatteryAh(bike);
  const motorWatts = getMotorWatts(bike);
  const rangeKm = getNumericRange(bike);
  const safetyText = String(bike.safety || "").toLowerCase();
  const comfortText = String(bike.comfort || "").toLowerCase();

  if (batteryAh >= 20) {
    highlights.push("🔋 Baterai Besar");
  }

  if (motorWatts >= 800) {
    highlights.push("⚡ Motor Kuat");
  } else if (motorWatts >= 600) {
    highlights.push("⚡ Motor Bertenaga");
  }

  if (rangeKm >= 50) {
    highlights.push("🛣️ Jarak Lebih Jauh");
  } else if (rangeKm >= 42) {
    highlights.push("🚀 Jarak Lebih Jauh");
  }

  if (
    safetyText.includes("nfc") ||
    safetyText.includes("alarm") ||
    safetyText.includes("remote")
  ) {
    highlights.push("🔐 Fitur Keamanan");
  }

  if (comfortText === "high") {
    highlights.push("🛋️ Nyaman Harian");
  }

  if (!highlights.length) {
    highlights.push("🚲 Mobilitas Harian");
  }

  return highlights;
}

function getChargeTime(bike) {
  if (!bike.battery) {
    return "± 4–6 jam";
  }

  const batteryAh = getBatteryAh(bike);

  if (batteryAh >= 24) return "± 7–9 jam";
  if (batteryAh >= 20) return "± 6–8 jam";
  if (batteryAh >= 12) return "± 4–5 jam";

  return "± 4–6 jam";
}

function getBikeById(id) {
  return bikes.find((bike) => bike.id === id) || null;
}

function getBikeByIndex(index) {
  return bikes[index] || null;
}

function getAvailableBikes() {
  return bikes.filter(isBikeAvailable);
}

function getUniqueCategories() {
  return [...new Set(bikes.map((bike) => bike.category).filter(Boolean))];
}

function getRecommendedUses(bike) {
  const uses = [];

  const batteryAh = getBatteryAh(bike);
  const motorWatts = getMotorWatts(bike);
  const rangeKm = getNumericRange(bike);
  const safetyText = String(bike.safety || "").toLowerCase();

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

  if (
    safetyText.includes("nfc") ||
    safetyText.includes("alarm") ||
    safetyText.includes("remote") ||
    safetyText.includes("kunci")
  ) {
    uses.push("Pengguna yang butuh fitur keamanan tambahan");
  }

  return uses;
}

function getFilteredAndSortedBikes(options = {}) {
  const brand = String(options.brand || "all");
  const search = String(options.search || "");
  const sort = String(options.sort || "default");

  let result = [...bikes];

  if (brand !== "all") {
    result = result.filter((bike) => bike.brand === brand);
  }

  const searchTerm = search.trim().toLowerCase();

  if (searchTerm) {
    result = result.filter((bike) => {
      const colorNames = getBikeColors(bike)
        .map((color) => color.name)
        .join(" ");

      const searchableText = [
        bike.brand,
        bike.name,
        bike.description,
        bike.motor,
        bike.battery,
        bike.safety,
        colorNames
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(searchTerm);
    });
  }

  switch (sort) {
    case "range-high":
      result.sort((a, b) => getNumericRange(b) - getNumericRange(a));
      break;

    case "range-low":
      result.sort((a, b) => getNumericRange(a) - getNumericRange(b));
      break;

    case "motor-high":
      result.sort((a, b) => getMotorWatts(b) - getMotorWatts(a));
      break;

    case "battery-high":
      result.sort((a, b) => getBatteryAh(b) - getBatteryAh(a));
      break;

    default:
      result.sort((a, b) => {
        const brandCompare = String(a.brand || "").localeCompare(String(b.brand || ""));
        return brandCompare || String(a.name || "").localeCompare(String(b.name || ""));
      });
      break;
  }

  return result;
}