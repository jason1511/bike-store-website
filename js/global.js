function formatPrice(price) {
  return `$${price.toLocaleString()}`;
}

function getStockLabel(bike) {
  if (!bike.inStock || bike.stockQty <= 0) {
    return "Sold Out";
  }

  if (bike.stockQty <= 2) {
    return `Low Stock (${bike.stockQty})`;
  }

  return `In Stock (${bike.stockQty})`;
}

function getStockClass(bike) {
  if (!bike.inStock || bike.stockQty <= 0) {
    return "sold-out";
  }

  if (bike.stockQty <= 2) {
    return "low-stock";
  }

  return "in-stock";
}

function createBikeCard(bike) {
  return `
    <div class="bike-card ${getStockClass(bike)}" data-bike-id="${bike.id}" tabindex="0" role="button" aria-label="View details for ${bike.name}">
      <img src="${bike.image}" alt="${bike.alt}">
      <div class="bike-info">
  <p class="bike-stock ${getStockClass(bike)}">${getStockLabel(bike)}</p>
  <p class="bike-brand">${bike.brand}</p>
  <h3>${bike.name}</h3>
  <p class="bike-spec">Range up to ${bike.range} km</p>
  <p class="bike-price">${formatPrice(bike.price)}</p>
</div>
    </div>
  `;
}