let bikes = [];

async function loadBikes() {
  try {
    const response = await fetch("data/bikes.json");

    if (!response.ok) {
      throw new Error("Failed to load bikes.json");
    }

    bikes = await response.json();

    document.dispatchEvent(new Event("bikesLoaded"));
  } catch (error) {
    console.error("Error loading bikes:", error);
  }
}

loadBikes();