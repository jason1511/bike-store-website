function getAllBikes() {
  return [...bikes];
}

function getFeaturedBikes(limit = 3) {
  return bikes
    .filter((bike) => bike.featured && isBikeAvailable(bike))
    .slice(0, limit);
}

function getNumberFromText(text) {
  const match = String(text || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}
function parseBikeColors(colors) {
  if (Array.isArray(colors)) {
    return colors;
  }

  if (typeof colors === "string") {
    try {
      const parsedColors = JSON.parse(colors);
      return Array.isArray(parsedColors) ? parsedColors : [];
    } catch (error) {
      return [];
    }
  }

  return [];
}

function getBikeColors(bike) {
  if (!bike) {
    return [];
  }

  return parseBikeColors(bike.colors)
    .map((color) => ({
      name: String(color.name || "").trim(),
      hex: String(color.hex || "#cccccc").trim(),
      image: String(color.image || "").trim(),
      stockQty: Math.max(0, Number(color.stockQty || 0))
    }))
    .filter((color) => color.name || color.image || color.stockQty > 0);
}

function getBikeColorStockTotal(bike) {
  return getBikeColors(bike).reduce((total, color) => {
    return total + Math.max(0, Number(color.stockQty || 0));
  }, 0);
}

function getBikeTotalStock(bike) {
  const colorStockTotal = getBikeColorStockTotal(bike);

  return colorStockTotal > 0
    ? colorStockTotal
    : Math.max(0, Number(bike?.stockQty || 0));
}

function isBikeAvailable(bike) {
  return Boolean(bike?.inStock) && getBikeTotalStock(bike) > 0;
}

function getBikePrimaryColor(bike) {
  const colors = getBikeColors(bike);

  return colors.find((color) => color.stockQty > 0 && color.image)
    || colors.find((color) => color.image)
    || colors.find((color) => color.stockQty > 0)
    || colors[0]
    || null;
}

function getBikeDisplayImage(bike) {
  const primaryColor = getBikePrimaryColor(bike);

  return primaryColor?.image || bike?.image || "images/logo.jpeg";
}

function getBikeStockLabel(bike) {
  if (!bike?.inStock) {
    return "Tidak aktif";
  }

  const totalStock = getBikeTotalStock(bike);

  if (totalStock <= 0) {
    return "Stok habis";
  }

  return `Stok ${totalStock}`;
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
  return bikes.filter(isBikeAvailable);
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
function getBikeThemeStyle(bike) {
  const brandTheme = getBrandTheme(bike);

  return `
    --card-brand-main: ${brandTheme.main};
    --card-brand-second: ${brandTheme.second};
    --card-brand-soft: ${brandTheme.soft};
    --card-brand-glow: ${brandTheme.glow};
    --bike-theme-main: ${brandTheme.main};
    --bike-theme-second: ${brandTheme.second};
    --bike-theme-soft: ${brandTheme.soft};
    --bike-theme-glow: ${brandTheme.glow};
  `;
}
function normalizeBrandSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function getBrandTheme(bikeOrBrand) {
  if (bikeOrBrand && typeof bikeOrBrand === "object") {
    const bike = bikeOrBrand;
    const theme = bike.brandTheme || {};
    const slug = theme.slug || normalizeBrandSlug(bike.brand);

    return {
      className: theme.className || (slug ? `brand-${slug}` : "brand-default"),
      logo: theme.logo || "",
      main: theme.main || "#203333",
      second: theme.second || "#2f4f4f",
      soft: theme.soft || "rgba(159, 184, 182, 0.18)",
      glow: theme.glow || "rgba(0, 0, 0, 0.12)"
    };
  }

  const slug = normalizeBrandSlug(bikeOrBrand);

  const fallbackThemes = {
    exotic: {
      className: "brand-exotic",
      logo: "images/brands/exotic.jpeg",
      main: "#ed1c24",
      second: "#111111",
      soft: "rgba(237, 28, 36, 0.18)",
      glow: "rgba(237, 28, 36, 0.18)"
    },
    pacific: {
      className: "brand-pacific",
      logo: "images/brands/pacific.jpeg",
      main: "#ed1c24",
      second: "#111111",
      soft: "rgba(237, 28, 36, 0.18)",
      glow: "rgba(237, 28, 36, 0.18)"
    },
    pasifik: {
      className: "brand-pacific",
      logo: "images/brands/pacific.jpeg",
      main: "#ed1c24",
      second: "#111111",
      soft: "rgba(237, 28, 36, 0.18)",
      glow: "rgba(237, 28, 36, 0.18)"
    },
    pasific: {
      className: "brand-pacific",
      logo: "images/brands/pacific.jpeg",
      main: "#ed1c24",
      second: "#111111",
      soft: "rgba(237, 28, 36, 0.18)",
      glow: "rgba(237, 28, 36, 0.18)"
    },
    larizz: {
      className: "brand-larizz",
      logo: "images/brands/laris.jpeg",
      main: "#27245f",
      second: "#e31b23",
      soft: "rgba(39, 36, 95, 0.18)",
      glow: "rgba(39, 36, 95, 0.18)"
    },
    saige: {
      className: "brand-saige",
      logo: "images/brands/saige.jpeg",
      main: "#66bd45",
      second: "#2f6f2e",
      soft: "rgba(102, 189, 69, 0.18)",
      glow: "rgba(102, 189, 69, 0.18)"
    },
    uwinfly: {
      className: "brand-uwinfly",
      logo: "images/brands/uwinfly.jpeg",
      main: "#ed1c24",
      second: "#b91319",
      soft: "rgba(237, 28, 36, 0.18)",
      glow: "rgba(237, 28, 36, 0.18)"
    },
    nuv: {
      className: "brand-nuv",
      logo: "images/brands/nuv.jpeg",
      main: "#27bfc3",
      second: "#0f777b",
      soft: "rgba(39, 191, 195, 0.2)",
      glow: "rgba(39, 191, 195, 0.18)"
    }
  };

  return fallbackThemes[slug] || {
    className: "brand-default",
    logo: "",
    main: "#203333",
    second: "#2f4f4f",
    soft: "rgba(159, 184, 182, 0.18)",
    glow: "rgba(0, 0, 0, 0.12)"
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