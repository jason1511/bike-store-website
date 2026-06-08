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

function getNumericRange(bike) {
  const match = String(bike.range || "").match(/\d+/);
  return match ? Number(match[1] || match[0]) : 0;
}

function getHighlights(bike) {
  const highlights = [];

  const batteryAh = getBatteryAh(bike);
  const motorWatts = getMotorWatts(bike);
  const rangeKm = getNumberFromText(bike.range);
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

  const battery = bike.battery.toLowerCase();

  if (battery.includes("24ah")) return "± 7–9 jam";
  if (battery.includes("20ah")) return "± 6–8 jam";
  if (battery.includes("12ah")) return "± 4–5 jam";

  return "± 4–6 jam";
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
  return [...new Set(bikes.map((bike) => bike.category).filter(Boolean))];
}

function getRecommendedUses(bike) {
  const uses = [];

  const batteryAh = getBatteryAh(bike);
  const motorWatts = getMotorWatts(bike);
  const rangeKm = getNumberFromText(bike.range);
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
  const {
    brand = "all",
    search = "",
    sort = "default"
  } = options;

  let result = [...bikes];

  if (brand !== "all") {
    result = result.filter((bike) => bike.brand === brand);
  }

  if (search.trim()) {
    const searchTerm = search.toLowerCase();

    result = result.filter((bike) => {
      const searchableText = [
        bike.brand,
        bike.name,
        bike.description,
        bike.motor,
        bike.battery,
        bike.safety
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
      break;
  }

  return result;
}
function getBikeThemeStyle(bike) {
  const brandThemeColors = {
    Exotic: ["#d71920", "#111111"],
    Pacific: ["#ed1c24", "#111111"],
    Larizz: ["#27245f", "#e31b23"],
    Saige: ["#66bd45", "#2f6f2e"],
    Uwinfly: ["#ed1c24", "#b91319"],
    Nuv: ["#27bfc3", "#0f777b"]
  };

  const fallbackColors = brandThemeColors[bike.brand] || ["#203333", "#2f4f4f"];

  const mainColor = bike.themeColor || fallbackColors[0];
  const secondColor = bike.themeColorSecond || fallbackColors[1];

  return `
    --card-brand-main: ${mainColor};
    --card-brand-second: ${secondColor};
    --bike-theme-main: ${mainColor};
    --bike-theme-second: ${secondColor};
    --bike-theme-soft: ${mainColor}24;
    --bike-theme-glow: ${mainColor}33;
  `;
}
function getBrandTheme(brand) {
  const themes = {
    Exotic: {
      className: "brand-exotic",
      logo: "images/brands/exotic.jpeg"
    },
    Pacific: {
      className: "brand-pacific",
      logo: "images/brands/pacific.jpeg"
    },
    Nuv: {
      className: "brand-nuv",
      logo: "images/brands/nuv.jpeg"
    },
    Saige: {
      className: "brand-saige",
      logo: "images/brands/saige.jpeg"
    },
    Uwinfly: {
      className: "brand-uwinfly",
      logo: "images/brands/uwinfly.jpeg"
    },
    Larizz: {
      className: "brand-larizz",
      logo: "images/brands/laris.jpeg"
    }
  };

  return themes[brand] || {
    className: "brand-default",
    logo: ""
  };
}

function getBrandLogo(brand) {
  const logos = {
    Exotic: "images/brands/exotic.jpeg",
    Pacific: "images/brands/pacific.jpeg",
    Nuv: "images/brands/nuv.jpeg",
    Saige: "images/brands/saige.jpeg",
    Uwinfly: "images/brands/uwinfly.jpeg",
    Larizz: "images/brands/laris.jpeg"
  };

  return logos[brand] || "";
}