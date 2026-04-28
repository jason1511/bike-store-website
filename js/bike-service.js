function getAllBikes() {
  return [...bikes];
}

function getFeaturedBikes(limit = 3) {
  return bikes
    .filter((bike) => bike.featured && bike.inStock && bike.stockQty > 0)
    .slice(0, limit);
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
function getFilteredAndSortedBikes(options = {}) {
  const {
    category = "all",
    search = "",
    sort = "default",
    hideSoldOut = false
  } = options;

  let result = [...bikes];

  if (category !== "all") {
    result = result.filter((bike) => bike.category === category);
  }

  if (search.trim()) {
    const searchTerm = search.trim().toLowerCase();
    result = result.filter((bike) =>
      bike.name.toLowerCase().includes(searchTerm)
    );
  }

  if (hideSoldOut) {
    result = result.filter((bike) => bike.inStock && bike.stockQty > 0);
  }

  switch (sort) {
    case "price-low":
      result.sort((a, b) => a.price - b.price);
      break;
    case "price-high":
      result.sort((a, b) => b.price - a.price);
      break;
    case "range-high":
      result.sort((a, b) => getNumericRange(b) - getNumericRange(a));
      break;
    case "range-low":
      result.sort((a, b) => getNumericRange(a) - getNumericRange(b));
      break;
    default:
      break;
  }

  return result;
}