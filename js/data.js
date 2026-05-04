let bikes = [];
let bikesLoaded = false;

async function loadBikes() {
  try {
    const response = await fetch("data/bikes.json");

    if (!response.ok) {
      throw new Error("Failed to load bikes.json");
    }

    bikes = await response.json();
    bikesLoaded = true;

    document.dispatchEvent(new Event("bikesLoaded"));
  } catch (error) {
    console.error("Error loading bikes:", error);
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