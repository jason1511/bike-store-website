/* =========================
   BIKE UTILS
   Shared helpers for public catalogue, admin, cards, and comparison
========================= */

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

function normalizeBikeColors(colors) {
  return parseBikeColors(colors)
    .map((color) => ({
      name: String(color.name || "").trim(),
      hex: String(color.hex || "#cccccc").trim(),
      image: String(color.image || "").trim(),
      stockQty: Math.max(0, Number(color.stockQty || 0))
    }))
    .filter((color) => color.name || color.image || color.stockQty > 0);
}

function getBikeColors(bike) {
  if (!bike) {
    return [];
  }

  return normalizeBikeColors(bike.colors);
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

function getNumberFromText(text) {
  const match = String(text || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function getMaxNumberFromText(text) {
  const numbers = String(text || "").match(/\d+/g);

  if (!numbers) {
    return 0;
  }

  return Math.max(...numbers.map(Number));
}

function getBatteryAh(bike) {
  return getMaxNumberFromText(bike?.battery);
}

function getMotorWatts(bike) {
  return getMaxNumberFromText(bike?.motor);
}

function getNumericRange(bike) {
  return getMaxNumberFromText(bike?.range);
}

function getNumericTopSpeed(bike) {
  return getMaxNumberFromText(bike?.topSpeed);
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

function getBrandLogo(brand) {
  const brandTheme = getBrandTheme(brand);
  return brandTheme.logo || "";
}