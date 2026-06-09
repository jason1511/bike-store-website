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

function validateBike(bike) {
  const errors = [];

  if (!bike.id) errors.push("ID sepeda wajib diisi.");
  if (!bike.brand) errors.push("Brand wajib diisi.");
  if (!bike.name) errors.push("Nama model wajib diisi.");
  if (bike.price < 0) errors.push("Harga tidak boleh negatif.");
  if (bike.stockQty < 0) errors.push("Jumlah stok tidak boleh negatif.");

  return errors;
}

function rowToBike(row) {
  return {
    ...row,
    colors: parseBikeColors(row.colors),
    price: Number(row.price || 0),
    featured: Boolean(row.featured),
    inStock: Boolean(row.inStock),
    stockQty: Number(row.stockQty || 0)
  };
}

async function getBikeById(db, id) {
  const row = await db
    .prepare("SELECT * FROM bikes WHERE id = ?")
    .bind(id)
    .first();

  return row ? rowToBike(row) : null;
}

async function deactivateBikeById(db, id) {
  await db
    .prepare(`
      UPDATE bikes
      SET
        inStock = 0,
        stockQty = 0,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(id)
    .run();

  return getBikeById(db, id);
}

async function reactivateBikeById(db, id) {
  await db
    .prepare(`
      UPDATE bikes
      SET
        inStock = 1,
        stockQty = CASE
          WHEN stockQty IS NULL OR stockQty < 1 THEN 1
          ELSE stockQty
        END,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(id)
    .run();

  return getBikeById(db, id);
}

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);
    }

    const result = await env.BIKE_DB
      .prepare(`
        SELECT *
        FROM bikes
        ORDER BY brand ASC, name ASC
      `)
      .all();

    return jsonResponse({
      role: auth.user.role,
      username: auth.user.username,
      bikes: (result.results || []).map(rowToBike)
    });
  } catch (error) {
    console.error("Admin bikes GET error:", error);
    return jsonResponse({ error: "Failed to load bikes from D1" }, 500);
  }
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

    const payload = await request.json();
    const bike = normalizeBikePayload(payload);
    const errors = validateBike(bike);

    if (errors.length) {
      return jsonResponse({ error: "Invalid bike data", errors }, 400);
    }

    const existingBike = await getBikeById(env.BIKE_DB, bike.id);

    if (existingBike) {
      return jsonResponse({ error: "Bike ID already exists" }, 409);
    }

    await env.BIKE_DB
      .prepare(`
        INSERT INTO bikes (
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
          stockQty
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      )
      .run();

    return jsonResponse({
      success: true,
      role: auth.user.role,
      bike: await getBikeById(env.BIKE_DB, bike.id)
    });
  } catch (error) {
    console.error("Admin bikes POST error:", error);
    return jsonResponse({ error: "Failed to create bike" }, 500);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);
    }

    const payload = await request.json();
    const bike = normalizeBikePayload(payload);
    const errors = validateBike(bike);

    if (errors.length) {
      return jsonResponse({ error: "Invalid bike data", errors }, 400);
    }

    const existingBike = await getBikeById(env.BIKE_DB, bike.id);

    if (!existingBike) {
      return jsonResponse({ error: "Bike not found" }, 404);
    }

    await env.BIKE_DB
      .prepare(`
        UPDATE bikes
        SET
          brand = ?,
          name = ?,
          battery = ?,
          motor = ?,
          topSpeed = ?,
          range = ?,
          maxWeight = ?,
          safety = ?,
          image = ?,
          alt = ?,
          comfort = ?,
          colorName = ?,
          colors = ?,
          description = ?,
          price = ?,
          featured = ?,
          inStock = ?,
          stockQty = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(
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
        bike.stockQty,
        bike.id
      )
      .run();

    return jsonResponse({
      success: true,
      role: auth.user.role,
      bike: await getBikeById(env.BIKE_DB, bike.id)
    });
  } catch (error) {
    console.error("Admin bikes PUT error:", error);
    return jsonResponse({ error: "Failed to update bike" }, 500);
  }
}

export async function onRequestDelete(context) {
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
    const id = url.searchParams.get("id");
    const mode = url.searchParams.get("mode") || "deactivate";

    if (!id) {
      return jsonResponse({ error: "Bike ID is required" }, 400);
    }

    const existingBike = await getBikeById(env.BIKE_DB, id);

    if (!existingBike) {
      return jsonResponse({ error: "Bike not found" }, 404);
    }

    if (mode === "hard-delete") {
      await env.BIKE_DB
        .prepare("DELETE FROM bikes WHERE id = ?")
        .bind(id)
        .run();

      return jsonResponse({
        success: true,
        role: auth.user.role,
        mode: "hard-delete"
      });
    }

    if (mode === "reactivate") {
      const bike = await reactivateBikeById(env.BIKE_DB, id);

      return jsonResponse({
        success: true,
        role: auth.user.role,
        mode: "reactivate",
        bike
      });
    }

    const bike = await deactivateBikeById(env.BIKE_DB, id);

    return jsonResponse({
      success: true,
      role: auth.user.role,
      mode: "deactivate",
      bike
    });
  } catch (error) {
    console.error("Admin bikes DELETE error:", error);
    return jsonResponse({ error: "Failed to deactivate bike" }, 500);
  }
}