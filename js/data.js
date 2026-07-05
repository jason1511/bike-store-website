let bikes = [];
let bikesLoaded = false;

function normalizeLoadedBike(bike) {
  const colors = normalizeBikeColors(bike.colors);
  const stockQty = getBikeTotalStock({
    ...bike,
    colors
  });

  const primaryColor = getBikePrimaryColor({
    ...bike,
    colors
  });

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