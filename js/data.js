let bikes = [];
let bikesLoaded = false;

function parseLoadedBikeColors(colors) {
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

function normalizeLoadedBikeColors(colors) {
  return parseLoadedBikeColors(colors)
    .map((color) => ({
      name: String(color.name || "").trim(),
      hex: String(color.hex || "#cccccc").trim(),
      image: String(color.image || "").trim(),
      stockQty: Math.max(0, Number(color.stockQty || 0))
    }))
    .filter((color) => color.name || color.image || color.stockQty > 0);
}

function getLoadedBikeStockTotal(bike) {
  const colorStockTotal = normalizeLoadedBikeColors(bike.colors).reduce((total, color) => {
    return total + Math.max(0, Number(color.stockQty || 0));
  }, 0);

  return colorStockTotal > 0
    ? colorStockTotal
    : Math.max(0, Number(bike.stockQty || 0));
}

function normalizeLoadedBike(bike) {
  const colors = normalizeLoadedBikeColors(bike.colors);
  const stockQty = getLoadedBikeStockTotal({
    ...bike,
    colors
  });

  const primaryColor = colors.find((color) => color.stockQty > 0 && color.image)
    || colors.find((color) => color.image)
    || colors.find((color) => color.stockQty > 0)
    || colors[0]
    || null;

  return {
    ...bike,

    brandId: bike.brandId || bike.brand_id || "",
    brandSlug: bike.brandSlug || bike.brand_slug || "",
    brandTheme: bike.brandTheme || null,

    colors,
    stockQty,
    image: primaryColor?.image || bike.image || "",
    inStock: Boolean(bike.inStock) && stockQty > 0
  };
}

function normalizeLoadedBikes(rawBikes) {
  return Array.isArray(rawBikes)
    ? rawBikes.map(normalizeLoadedBike)
    : [];
}

async function loadBikes() {
  try {
    const response = await fetch("/api/bikes");

    if (!response.ok) {
      throw new Error("Failed to load bikes from API");
    }

    const data = await response.json();

    bikes = normalizeLoadedBikes(data.bikes);
    bikesLoaded = true;

    document.dispatchEvent(new Event("bikesLoaded"));
  } catch (error) {
    console.error("Error loading bikes from API:", error);
    await loadBikesFromFallback();
  }
}

async function loadBikesFromFallback() {
  try {
    const response = await fetch("data/bikes.json");

    if (!response.ok) {
      throw new Error("Failed to load bikes.json");
    }

    const fallbackBikes = await response.json();

    bikes = normalizeLoadedBikes(fallbackBikes);
    bikesLoaded = true;

    document.dispatchEvent(new Event("bikesLoaded"));
  } catch (error) {
    console.error("Error loading fallback bikes:", error);
  }
}

function whenBikesLoaded(callback) {
  if (bikesLoaded) {
    callback();
    return;
  }

  document.addEventListener("bikesLoaded", callback);
}

loadBikes();