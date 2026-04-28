const bikes = [
  {
    name: "Urban Commuter",
    range: 60,
    price: 1899,
    image: "images/bike-1.jpg",
    alt: "Urban electric bike",
    category: "commuter",
    terrain: "city",
    comfort: "medium"
  },
  {
    name: "Explorer X",
    range: 75,
    price: 2499,
    image: "images/bike-2.jpg",
    alt: "Fat tire electric bike",
    category: "adventure",
    terrain: "mixed",
    comfort: "high"
  },
  {
    name: "City Glide",
    range: 55,
    price: 1699,
    image: "images/bike-3.jpg",
    alt: "Step-through electric bike",
    category: "city",
    terrain: "city",
    comfort: "high"
  },
  {
    name: "Trail Master",
    range: 80,
    price: 2899,
    image: "images/bike-4.jpg",
    alt: "Mountain electric bike",
    category: "mountain",
    terrain: "rough",
    comfort: "medium"
  },
  {
    name: "Metro Fold",
    range: 45,
    price: 1499,
    image: "images/bike-5.jpg",
    alt: "Compact electric bike",
    category: "folding",
    terrain: "city",
    comfort: "medium"
  },
  {
    name: "Volt Pro",
    range: 90,
    price: 3199,
    image: "images/bike-6.jpg",
    alt: "Premium electric bike",
    category: "premium",
    terrain: "mixed",
    comfort: "high"
  }
];
function formatPrice(price) {
  return `$${price.toLocaleString()}`;
}

function createBikeCard(bike) {
  return `
    <div class="bike-card">
      <img src="${bike.image}" alt="${bike.alt}">
      <div class="bike-info">
        <h3>${bike.name}</h3>
        <p class="bike-spec">Range up to ${bike.range} km</p>
        <p class="bike-price">${formatPrice(bike.price)}</p>
      </div>
    </div>
  `;
}

function renderBikes() {
  const bikeGrid = document.getElementById("bikeGrid");

  if (!bikeGrid) {
    return;
  }

  bikeGrid.innerHTML = bikes.map(createBikeCard).join("");
}

renderBikes();
function renderFeaturedBikes() {
  const featuredBikeGrid = document.getElementById("featuredBikeGrid");

  if (!featuredBikeGrid) {
    return;
  }

  const featuredBikes = bikes.slice(0, 3);
  featuredBikeGrid.innerHTML = featuredBikes.map(createBikeCard).join("");
}

renderFeaturedBikes();