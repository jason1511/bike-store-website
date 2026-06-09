import {
  jsonResponse,
  requireRole
} from "../../_shared/auth.js";

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
  const parsedColors = parseBikeColors(colors);

  const cleanedColors = parsedColors
    .map((color) => ({
      name: String(color.name || "").trim(),
      hex: String(color.hex || "#cccccc").trim(),
      image: String(color.image || "").trim()
    }))
    .filter((color) => color.name || color.image);

  return JSON.stringify(cleanedColors);
}

function normalizeBikePayload(payload) {
  return {
    id: String(payload.id || "").trim(),
    brand: String(payload.brand || "").trim(),
    name: String(payload.name || "").trim(),
    battery: String(payload.battery || "").trim(),
    motor: String(payload.motor || "").trim(),
    topSpeed: String(payload.topSpeed || "").trim(),
    range: String(payload.range || "").trim(),
    maxWeight: String(payload.maxWeight || "").trim(),
    safety: String(payload.safety || "").trim(),
    image: String(payload.image || "").trim(),
    alt: String(payload.alt || "").trim(),
    comfort: String(payload.comfort || "medium").trim(),
    colorName: String(payload.colorName || "").trim(),
    colors: normalizeBikeColors(payload.colors),
    description: String(payload.description || "").trim(),
    price: Number(payload.price || 0),
    featured: payload.featured ? 1 : 0,
    inStock: payload.inStock ? 1 : 0,
    stockQty: Number(payload.stockQty || 0)
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);
    }

    const url = new URL(request.url);
    const bikesJsonUrl = `${url.origin}/data/bikes.json`;
    const response = await fetch(bikesJsonUrl);

    if (!response.ok) {
      return jsonResponse({ error: "Failed to load bikes.json" }, 500);
    }

    const bikes = await response.json();

    if (!Array.isArray(bikes)) {
      return jsonResponse({ error: "bikes.json is not an array" }, 500);
    }

    const statements = bikes.map((item) => {
      const bike = normalizeBikePayload(item);

      return env.BIKE_DB
        .prepare(`
          INSERT OR REPLACE INTO bikes (
            id,
            brand,
            name,
            battery,
            motor,
            topSpeed,
            range,
            maxWeight,
            safety,
            image,
            alt,
            comfort,
            colorName,
            colors,
            description,
            price,
            featured,
            inStock,
            stockQty,
            updatedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `)
        .bind(
          bike.id,
          bike.brand,
          bike.name,
          bike.battery,
          bike.motor,
          bike.topSpeed,
          bike.range,
          bike.maxWeight,
          bike.safety,
          bike.image,
          bike.alt,
          bike.comfort,
          bike.colorName,
          bike.colors,
          bike.description,
          bike.price,
          bike.featured,
          bike.inStock,
          bike.stockQty
        );
    });

    await env.BIKE_DB.batch(statements);

    return jsonResponse({
      success: true,
      imported: bikes.length,
      username: auth.user.username,
      role: auth.user.role
    });
  } catch (error) {
    console.error("Seed bikes error:", error);

    return jsonResponse(
      { error: "Failed to seed bikes into D1" },
      500
    );
  }
}