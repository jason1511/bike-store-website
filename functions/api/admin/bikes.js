import {
  jsonResponse,
  requireRole,
  writeAuditLog
} from "../../_shared/auth.js";

import {
  createBrandTheme,
  getColorStockTotal,
  normalizeBikeColors,
  parseBikeColors
} from "../../_shared/bike-utils.js";

function normalizeBikePayload(payload) {
  const normalizedColors = normalizeBikeColors(payload.colors);
  const normalizedColorsText = JSON.stringify(normalizedColors);

  const colorStockTotal = getColorStockTotal(normalizedColors);
  const fallbackStockQty = Math.max(
    0,
    Number(payload.stockQty || 0)
  );

  const stockQty = colorStockTotal > 0
    ? colorStockTotal
    : fallbackStockQty;

  return {
    id: String(payload.id || "").trim(),
    brandId: String(
      payload.brandId ||
      payload.brand_id ||
      ""
    ).trim(),
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
    comfort: String(
      payload.comfort || "medium"
    ).trim(),
    colorName: String(payload.colorName || "").trim(),
    colors: normalizedColorsText,
    description: String(
      payload.description || ""
    ).trim(),
    price: Number(payload.price || 0),
    featured: payload.featured ? 1 : 0,
    inStock: payload.inStock ? 1 : 0,
    stockQty
  };
}

function validateBike(bike) {
  const errors = [];
  const colors = parseBikeColors(bike.colors);

  if (!bike.id) errors.push("ID sepeda wajib diisi.");
  if (!bike.brandId) errors.push("ID brand wajib diisi.");
  if (!bike.name) errors.push("Nama model wajib diisi.");
  if (bike.price < 0) errors.push("Harga tidak boleh negatif.");
  if (bike.stockQty < 0) errors.push("Jumlah stok tidak boleh negatif.");

  if (!colors.length) {
    errors.push("Minimal satu warna unit wajib diisi.");
  }

  colors.forEach((color, index) => {
    if (color.stockQty < 0) {
      errors.push(`Stok warna ke-${index + 1} tidak boleh negatif.`);
    }

    if (color.stockQty > 0 && !color.name) {
      errors.push(`Nama warna ke-${index + 1} wajib diisi jika stok warna lebih dari 0.`);
    }

    if (color.image && !color.name) {
      errors.push(`Nama warna ke-${index + 1} wajib diisi jika gambar warna ada.`);
    }
  });

  return errors;
}

function rowToBike(row) {
  const colors = normalizeBikeColors(row.colors);
  const colorStockTotal = getColorStockTotal(colors);
  const stockQty = colorStockTotal > 0
    ? colorStockTotal
    : Number(row.stockQty || 0);

  const brandTheme = createBrandTheme(row);

  return {
    ...row,
    brandId: row.brand_id || "",
    brand: brandTheme.name || row.brand,
    brandSlug: brandTheme.slug,
    brandTheme,
    colors,
    price: Number(row.price || 0),
    featured: Boolean(row.featured),
    inStock: Boolean(row.inStock),
    stockQty
  };
}

function getBikeLabel(bike) {
  return `${bike.brand || ""} ${bike.name || ""}`.trim();
}

function getChangedBikeFields(beforeBike, afterBike) {
  if (!beforeBike || !afterBike) {
    return [];
  }

  const fields = [
    "brandId",
    "brand",
    "name",
    "battery",
    "motor",
    "topSpeed",
    "range",
    "maxWeight",
    "safety",
    "image",
    "alt",
    "comfort",
    "colorName",
    "colors",
    "description",
    "price",
    "featured",
    "inStock",
    "stockQty"
  ];

  return fields.filter((field) => {
    const beforeValue = beforeBike[field];
    const afterValue = afterBike[field];

    return String(beforeValue ?? "") !== String(afterValue ?? "");
  });
}

function createStockMovementId() {
  return `stock_${Date.now()}_${crypto.randomUUID()}`;
}

function getBikeStockEntries(bike) {
  const colors = normalizeBikeColors(
    bike?.colors
  );

  const colorStockTotal =
    getColorStockTotal(colors);

  const stockQty = Math.max(
    0,
    Number(bike?.stockQty || 0)
  );

  if (
    colors.length &&
    colorStockTotal === stockQty
  ) {
    return colors.map((color) => ({
      colorName: color.name || "",
      quantity: Math.max(
        0,
        Number(color.stockQty || 0)
      )
    }));
  }

  return [
    {
      colorName:
        String(
          bike?.colorName || ""
        ).trim(),
      quantity: stockQty
    }
  ];
}

function getStockEntryKey(colorName) {
  return String(colorName || "")
    .trim()
    .toLocaleLowerCase("id-ID");
}

function createInitialStockMovements(bike) {
  return getBikeStockEntries(bike)
    .filter((entry) => entry.quantity > 0)
    .map((entry) => ({
      bikeId: bike.id,
      bikeBrand: bike.brand,
      bikeName: bike.name,
      bikeColorName: entry.colorName,
      movementType: "stock_in",
      quantityChange: entry.quantity,
      quantityBefore: 0,
      quantityAfter: entry.quantity,
      note: entry.colorName
        ? `Stok awal sepeda baru - Warna ${entry.colorName}`
        : "Stok awal sepeda baru"
    }));
}

function createEditedStockMovements(
  existingBike,
  nextBike
) {
  const beforeEntries = getBikeStockEntries(existingBike)
    .map((entry) => ({
      ...entry,
      matched: false
    }));

  const afterEntries = getBikeStockEntries(nextBike)
    .map((entry) => ({
      ...entry,
      matched: false
    }));

  const comparedEntries = [];

  /*
   * Match unchanged color names first. This keeps
   * normal per-color stock edits tied to the correct
   * color even if the editor changes their order.
   */
  afterEntries.forEach((afterEntry) => {
    const afterKey = getStockEntryKey(
      afterEntry.colorName
    );

    const beforeEntry = beforeEntries.find((entry) => {
      return (
        !entry.matched &&
        getStockEntryKey(entry.colorName) === afterKey
      );
    });

    if (!beforeEntry) {
      return;
    }

    beforeEntry.matched = true;
    afterEntry.matched = true;

    comparedEntries.push({
      colorName:
        afterEntry.colorName ||
        beforeEntry.colorName,
      quantityBefore: beforeEntry.quantity,
      quantityAfter: afterEntry.quantity
    });
  });

  const unmatchedBefore = beforeEntries.filter(
    (entry) => !entry.matched
  );

  const unmatchedAfter = afterEntries.filter(
    (entry) => !entry.matched
  );

  /*
   * Remaining entries in the same position represent
   * renamed colors. Compare their quantities directly
   * so changing only "Red" to "Merah" does not create
   * a false stock-out and stock-in movement.
   */
  const renamedCount = Math.min(
    unmatchedBefore.length,
    unmatchedAfter.length
  );

  for (let index = 0; index < renamedCount; index += 1) {
    const beforeEntry = unmatchedBefore[index];
    const afterEntry = unmatchedAfter[index];

    beforeEntry.matched = true;
    afterEntry.matched = true;

    comparedEntries.push({
      colorName:
        afterEntry.colorName ||
        beforeEntry.colorName,
      quantityBefore: beforeEntry.quantity,
      quantityAfter: afterEntry.quantity
    });
  }

  beforeEntries
    .filter((entry) => !entry.matched)
    .forEach((entry) => {
      comparedEntries.push({
        colorName: entry.colorName,
        quantityBefore: entry.quantity,
        quantityAfter: 0
      });
    });

  afterEntries
    .filter((entry) => !entry.matched)
    .forEach((entry) => {
      comparedEntries.push({
        colorName: entry.colorName,
        quantityBefore: 0,
        quantityAfter: entry.quantity
      });
    });

  return comparedEntries
    .map((entry) => {
      const quantityChange =
        entry.quantityAfter -
        entry.quantityBefore;

      if (quantityChange === 0) {
        return null;
      }

      const isStockIncrease =
        quantityChange > 0;

      const actionLabel = isStockIncrease
        ? "Penambahan stok manual"
        : "Pengurangan stok manual";

      return {
        bikeId: nextBike.id,
        bikeBrand: nextBike.brand,
        bikeName: nextBike.name,
        bikeColorName: entry.colorName,
        movementType: isStockIncrease
          ? "stock_in"
          : "adjustment",
        quantityChange,
        quantityBefore:
          entry.quantityBefore,
        quantityAfter:
          entry.quantityAfter,
        note: entry.colorName
          ? `${actionLabel} - Warna ${entry.colorName}`
          : actionLabel
      };
    })
    .filter(Boolean);
}

function createStockMovementStatement(
  db,
  user,
  movement
) {
  return db
    .prepare(`
      INSERT INTO stock_movements (
        id,
        bike_id,
        bike_brand,
        bike_name,
        bike_color_name,
        movement_type,
        quantity_change,
        quantity_before,
        quantity_after,
        note,
        created_by_id,
        created_by_username,
        created_by_role
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      createStockMovementId(),
      movement.bikeId,
      movement.bikeBrand,
      movement.bikeName,
      movement.bikeColorName || "",
      movement.movementType,
      movement.quantityChange,
      movement.quantityBefore,
      movement.quantityAfter,
      movement.note || "",
      user.id || "",
      user.username,
      user.role
    );
}

async function getBikeById(db, id) {
  const row = await db
    .prepare(`
      SELECT
        bikes.*,

        brands.name AS brand_name,
        brands.slug AS brand_slug,
        brands.logo_path AS brand_logo_path,
        brands.theme_main AS brand_theme_main,
        brands.theme_second AS brand_theme_second,
        brands.theme_soft AS brand_theme_soft,
        brands.theme_glow AS brand_theme_glow
      FROM bikes
      LEFT JOIN brands
        ON brands.id = bikes.brand_id
      WHERE bikes.id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();

  return row ? rowToBike(row) : null;
}
async function getBrandById(db, brandId) {
  if (!brandId) {
    return null;
  }

  return db
    .prepare(`
      SELECT
        id,
        name,
        slug
      FROM brands
      WHERE id = ?
        AND is_active = 1
      LIMIT 1
    `)
    .bind(brandId)
    .first();
}

async function applyBrandFromDatabase(db, bike) {
  if (!bike.brandId) {
    return bike;
  }

  const brand = await getBrandById(db, bike.brandId);

  if (!brand) {
    throw new Error("Brand tidak ditemukan atau tidak aktif.");
  }

  return {
    ...bike,
    brandId: brand.id,
    brand: brand.name
  };
}
async function deactivateBikeById(db, id) {
  await db
    .prepare(`
      UPDATE bikes
      SET
        inStock = 0,
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
    const auth = await requireRole(request, env, ["admin", "staff"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);
    }

    const result = await env.BIKE_DB
      .prepare(`
        SELECT
  bikes.*,

  brands.name AS brand_name,
  brands.slug AS brand_slug,
  brands.logo_path AS brand_logo_path,
  brands.theme_main AS brand_theme_main,
  brands.theme_second AS brand_theme_second,
  brands.theme_soft AS brand_theme_soft,
  brands.theme_glow AS brand_theme_glow
FROM bikes
LEFT JOIN brands
  ON brands.id = bikes.brand_id
ORDER BY
  COALESCE(brands.sort_order, 999) ASC,
  bikes.brand ASC,
  bikes.name ASC
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
    const auth = await requireRole(request, env, ["admin", "staff"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);
    }

    const payload = await request.json();
    const normalizedBike = normalizeBikePayload(payload);
let bike;

try {
  bike = await applyBrandFromDatabase(env.BIKE_DB, normalizedBike);
} catch (error) {
  return jsonResponse(
    { error: error.message || "Brand tidak valid." },
    400
  );
}

const errors = validateBike(bike);

    if (errors.length) {
      return jsonResponse({ error: "Invalid bike data", errors }, 400);
    }

    const existingBike = await getBikeById(env.BIKE_DB, bike.id);

    if (existingBike) {
      return jsonResponse({ error: "Bike ID already exists" }, 409);
    }

    const createBikeStatement =
      env.BIKE_DB.prepare(`
        INSERT INTO bikes (
          id,
          brand_id,
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        bike.id,
        bike.brandId,
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

    const initialStockMovements =
      createInitialStockMovements(bike);

    await env.BIKE_DB.batch([
      createBikeStatement,
      ...initialStockMovements.map(
        (movement) =>
          createStockMovementStatement(
            env.BIKE_DB,
            auth.user,
            movement
          )
      )
    ]);

    const createdBike = await getBikeById(env.BIKE_DB, bike.id);

    await writeAuditLog(env, auth.user, {
      action: "bike_create",
      targetType: "bike",
      targetId: createdBike.id,
      targetLabel: getBikeLabel(createdBike),
      details: {
        brand: createdBike.brand,
        name: createdBike.name,
        price: createdBike.price,
        inStock: createdBike.inStock,
        stockQty: createdBike.stockQty,
        stockChanges: initialStockMovements.map(
          (movement) => ({
            colorName:
              movement.bikeColorName || "",
            quantityBefore:
              movement.quantityBefore,
            quantityChange:
              movement.quantityChange,
            quantityAfter:
              movement.quantityAfter
          })
        )
      }
    });

    return jsonResponse({
      success: true,
      role: auth.user.role,
      bike: createdBike
    });
  } catch (error) {
    console.error("Admin bikes POST error:", error);
    return jsonResponse({ error: "Failed to create bike" }, 500);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin", "staff"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);
    }

    const payload = await request.json();
const normalizedBike = normalizeBikePayload(payload);
let bike;

try {
  bike = await applyBrandFromDatabase(env.BIKE_DB, normalizedBike);
} catch (error) {
  return jsonResponse(
    { error: error.message || "Brand tidak valid." },
    400
  );
}

const errors = validateBike(bike);

    if (errors.length) {
      return jsonResponse({ error: "Invalid bike data", errors }, 400);
    }

    const existingBike = await getBikeById(env.BIKE_DB, bike.id);

    if (!existingBike) {
      return jsonResponse({ error: "Bike not found" }, 404);
    }

    if (
      auth.user.role !== "admin" &&
      Boolean(existingBike.inStock) !== Boolean(bike.inStock)
    ) {
      return jsonResponse(
        { error: "Hanya admin yang bisa mengubah status katalog sepeda." },
        403
      );
    }

    const updateBikeStatement =
      env.BIKE_DB.prepare(`
        UPDATE bikes
        SET
          brand_id = ?,
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
      `).bind(
  bike.brandId,
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
);

    const editedStockMovements =
      createEditedStockMovements(
        existingBike,
        bike
      );

    await env.BIKE_DB.batch([
      updateBikeStatement,
      ...editedStockMovements.map(
        (movement) =>
          createStockMovementStatement(
            env.BIKE_DB,
            auth.user,
            movement
          )
      )
    ]);

    const updatedBike = await getBikeById(env.BIKE_DB, bike.id);
    const changedFields = getChangedBikeFields(existingBike, updatedBike);

    await writeAuditLog(env, auth.user, {
      action: "bike_update",
      targetType: "bike",
      targetId: updatedBike.id,
      targetLabel: getBikeLabel(updatedBike),
      details: {
        changedFields,
        before: {
          brand: existingBike.brand,
          name: existingBike.name,
          price: existingBike.price,
          inStock: existingBike.inStock,
          stockQty: existingBike.stockQty
        },
        after: {
          brand: updatedBike.brand,
          name: updatedBike.name,
          price: updatedBike.price,
          inStock: updatedBike.inStock,
          stockQty: updatedBike.stockQty
        },
        stockChanges: editedStockMovements.map(
          (movement) => ({
            colorName:
              movement.bikeColorName || "",
            quantityBefore:
              movement.quantityBefore,
            quantityChange:
              movement.quantityChange,
            quantityAfter:
              movement.quantityAfter
          })
        )
      }
    });

    return jsonResponse({
      success: true,
      role: auth.user.role,
      bike: updatedBike
    });
  } catch (error) {
    console.error("Admin bikes PUT error:", error);
    return jsonResponse({ error: "Failed to update bike" }, 500);
  }
}

function getD1ChangeCount(result) {
  return Number(
    result?.meta?.changes ??
    result?.changes ??
    0
  );
}

async function getBikeStockSnapshot(db, id) {
  return db
    .prepare(`
      SELECT
        id,
        brand,
        name,
        colorName,
        colors,
        image,
        inStock,
        stockQty,
        updatedAt
      FROM bikes
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();
}

function normalizeStockColorKey(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("id-ID");
}

function getStockReceiptColors(snapshot) {
  const colors = normalizeBikeColors(snapshot?.colors);

  if (colors.length) {
    return colors;
  }

  const legacyStock = Math.max(
    0,
    Number(snapshot?.stockQty || 0)
  );
  const legacyName = String(
    snapshot?.colorName || "Warna Utama"
  ).trim();

  if (!legacyName && legacyStock <= 0) {
    return [];
  }

  return [{
    name: legacyName || "Warna Utama",
    hex: "#cccccc",
    image: String(snapshot?.image || "").trim(),
    stockQty: legacyStock
  }];
}

export async function onRequestPatch(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(
      request,
      env,
      ["admin", "staff"]
    );

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse(
        { error: "D1 binding BIKE_DB is missing" },
        500
      );
    }

    const payload = await request.json();
    const bikeId = String(payload.bikeId || "").trim();
    const mode = String(payload.mode || "existing").trim();
    const requestedColorName = String(
      payload.colorName || ""
    ).trim();
    const quantity = Number(payload.quantity);
    const note = String(payload.note || "").trim().slice(0, 250);

    if (!bikeId) {
      return jsonResponse(
        { error: "Sepeda wajib dipilih." },
        400
      );
    }

    if (!["existing", "new"].includes(mode)) {
      return jsonResponse(
        { error: "Mode penambahan stok tidak valid." },
        400
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return jsonResponse(
        { error: "Jumlah stok masuk harus berupa bilangan bulat lebih dari 0." },
        400
      );
    }

    if (!requestedColorName) {
      return jsonResponse(
        { error: "Warna wajib dipilih atau diisi." },
        400
      );
    }

    const snapshot = await getBikeStockSnapshot(
      env.BIKE_DB,
      bikeId
    );

    if (!snapshot) {
      return jsonResponse(
        { error: "Sepeda tidak ditemukan." },
        404
      );
    }

    const originalColorsText = String(
      snapshot.colors || ""
    );
    const originalStockQty = Math.max(
      0,
      Number(snapshot.stockQty || 0)
    );
    const colors = getStockReceiptColors(snapshot);
    const requestedColorKey = normalizeStockColorKey(
      requestedColorName
    );
    let targetColor = colors.find((color) => {
      return normalizeStockColorKey(color.name) ===
        requestedColorKey;
    });

    if (mode === "existing") {
      if (!targetColor) {
        return jsonResponse(
          {
            error:
              "Warna tidak ditemukan. Refresh data stok lalu coba lagi."
          },
          409
        );
      }
    } else {
      if (targetColor) {
        return jsonResponse(
          {
            error:
              "Warna tersebut sudah ada. Pilih Warna Tersedia untuk menambah stoknya."
          },
          409
        );
      }

      const colorHex = String(
        payload.colorHex || "#cccccc"
      ).trim();

      if (!/^#[0-9a-f]{6}$/i.test(colorHex)) {
        return jsonResponse(
          { error: "Kode warna tidak valid." },
          400
        );
      }

      targetColor = {
        name: requestedColorName,
        hex: colorHex,
        image: String(payload.image || "").trim(),
        stockQty: 0
      };
      colors.push(targetColor);
    }

    const quantityBefore = Math.max(
      0,
      Number(targetColor.stockQty || 0)
    );
    targetColor.stockQty = quantityBefore + quantity;

    const nextColors = normalizeBikeColors(colors);
    const nextColorsText = JSON.stringify(nextColors);
    const nextStockQty = getColorStockTotal(nextColors);
    const primaryColorName = nextColors[0]?.name || "";
    const primaryColorImage = nextColors[0]?.image || "";
    const nextImage = String(snapshot.image || "").trim() ||
      primaryColorImage;

    const updateResult = await env.BIKE_DB
      .prepare(`
        UPDATE bikes
        SET
          colors = ?,
          colorName = ?,
          image = ?,
          stockQty = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
          AND COALESCE(colors, '') = ?
          AND stockQty = ?
      `)
      .bind(
        nextColorsText,
        primaryColorName,
        nextImage,
        nextStockQty,
        bikeId,
        originalColorsText,
        originalStockQty
      )
      .run();

    if (getD1ChangeCount(updateResult) <= 0) {
      return jsonResponse(
        {
          error:
            "Stok baru saja berubah. Data sudah diamankan; refresh lalu ulangi penambahan stok."
        },
        409
      );
    }

    const movement = {
      bikeId,
      bikeBrand: snapshot.brand,
      bikeName: snapshot.name,
      bikeColorName: targetColor.name,
      movementType: "stock_in",
      quantityChange: quantity,
      quantityBefore,
      quantityAfter: targetColor.stockQty,
      note: note || (
        mode === "new"
          ? `Stok awal warna baru - ${targetColor.name}`
          : `Penerimaan stok - Warna ${targetColor.name}`
      )
    };

    try {
      await createStockMovementStatement(
        env.BIKE_DB,
        auth.user,
        movement
      ).run();
    } catch (movementError) {
      await env.BIKE_DB
        .prepare(`
          UPDATE bikes
          SET
            colors = ?,
            colorName = ?,
            image = ?,
            stockQty = ?,
            updatedAt = ?
          WHERE id = ?
            AND colors = ?
            AND stockQty = ?
        `)
        .bind(
          originalColorsText,
          String(snapshot.colorName || ""),
          String(snapshot.image || ""),
          originalStockQty,
          snapshot.updatedAt,
          bikeId,
          nextColorsText,
          nextStockQty
        )
        .run();

      throw movementError;
    }

    const updatedBike = await getBikeById(
      env.BIKE_DB,
      bikeId
    );

    await writeAuditLog(env, auth.user, {
      action: "stock_receive",
      targetType: "bike",
      targetId: updatedBike.id,
      targetLabel: getBikeLabel(updatedBike),
      details: {
        mode,
        colorName: targetColor.name,
        quantityBefore,
        quantityAdded: quantity,
        quantityAfter: targetColor.stockQty,
        totalStockBefore: originalStockQty,
        totalStockAfter: nextStockQty,
        note
      }
    });

    return jsonResponse({
      success: true,
      role: auth.user.role,
      bike: updatedBike,
      stock: {
        colorName: targetColor.name,
        quantityBefore,
        quantityAdded: quantity,
        quantityAfter: targetColor.stockQty,
        totalStockAfter: nextStockQty
      }
    });
  } catch (error) {
    console.error("Admin bikes PATCH error:", error);
    return jsonResponse(
      {
        error:
          error.message ||
          "Gagal menambahkan stok."
      },
      500
    );
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
      if (auth.user.role !== "admin") {
        return jsonResponse(
          { error: "Only admin can hard delete bikes" },
          403
        );
      }

      await env.BIKE_DB
        .prepare("DELETE FROM bikes WHERE id = ?")
        .bind(id)
        .run();

      await writeAuditLog(env, auth.user, {
        action: "bike_hard_delete",
        targetType: "bike",
        targetId: existingBike.id,
        targetLabel: getBikeLabel(existingBike),
        details: {
          brand: existingBike.brand,
          name: existingBike.name,
          stockQty: existingBike.stockQty
        }
      });

      return jsonResponse({
        success: true,
        role: auth.user.role,
        mode: "hard-delete"
      });
    }

    if (mode === "reactivate") {
      const bike = await reactivateBikeById(env.BIKE_DB, id);

      await writeAuditLog(env, auth.user, {
        action: "bike_reactivate",
        targetType: "bike",
        targetId: bike.id,
        targetLabel: getBikeLabel(bike),
        details: {
          previousInStock: existingBike.inStock,
          newInStock: bike.inStock,
          stockQty: bike.stockQty
        }
      });

      return jsonResponse({
        success: true,
        role: auth.user.role,
        mode: "reactivate",
        bike
      });
    }

    const bike = await deactivateBikeById(env.BIKE_DB, id);

    await writeAuditLog(env, auth.user, {
      action: "bike_deactivate",
      targetType: "bike",
      targetId: bike.id,
      targetLabel: getBikeLabel(bike),
      details: {
        previousInStock: existingBike.inStock,
        newInStock: bike.inStock,
        stockQty: bike.stockQty
      }
    });

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
