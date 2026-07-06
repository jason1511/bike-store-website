import {
  jsonResponse,
  requireRole,
  writeAuditLog
} from "../../_shared/auth.js";

import {
  getColorStockTotal,
  normalizeBikeColors
} from "../../_shared/bike-utils.js";
function createInvoiceId() {
  return `invoice_${Date.now()}_${crypto.randomUUID()}`;
}

function createStockMovementId() {
  return `stock_${Date.now()}_${crypto.randomUUID()}`;
}
function createInvoiceItemId() {
  return `invoice_item_${Date.now()}_${crypto.randomUUID()}`;
}
function rowToInvoiceItem(row) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,

    bikeId: row.bike_id,
    bikeBrand: row.bike_brand,
    bikeName: row.bike_name,
    bikeColorName: row.bike_color_name,
    bikeColorHex: row.bike_color_hex,
    bikeColorImage: row.bike_color_image,

    quantity: Number(row.quantity || 0),
    unitPrice: Number(row.unit_price || 0),
    lineTotal: Number(row.line_total || 0),

    createdAt: row.created_at
  };
}
async function insertInvoiceItem(db, invoiceId, item) {
  const itemId = createInvoiceItemId();

  await db
    .prepare(`
      INSERT INTO invoice_items (
        id,
        invoice_id,

        bike_id,
        bike_brand,
        bike_name,
        bike_color_name,
        bike_color_hex,
        bike_color_image,

        quantity,
        unit_price,
        line_total
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      itemId,
      invoiceId,

      item.bikeId,
      item.bikeBrand,
      item.bikeName,
      item.bikeColorName,
      item.bikeColorHex || "",
      item.bikeColorImage || "",

      item.quantity,
      item.unitPrice,
      item.lineTotal
    )
    .run();

  return itemId;
}
async function getInvoiceItemsByInvoiceId(db, invoiceId) {
  const result = await db
    .prepare(`
      SELECT *
      FROM invoice_items
      WHERE invoice_id = ?
      ORDER BY created_at ASC, id ASC
    `)
    .bind(invoiceId)
    .all();

  return (result.results || []).map(rowToInvoiceItem);
}
async function getInvoiceItemsByInvoiceIds(db, invoiceIds) {
  if (!invoiceIds.length) {
    return new Map();
  }

  const placeholders = invoiceIds.map(() => "?").join(", ");

  const result = await db
    .prepare(`
      SELECT *
      FROM invoice_items
      WHERE invoice_id IN (${placeholders})
      ORDER BY created_at ASC, id ASC
    `)
    .bind(...invoiceIds)
    .all();

  const itemsByInvoiceId = new Map();

  for (const row of result.results || []) {
    const item = rowToInvoiceItem(row);

    if (!itemsByInvoiceId.has(item.invoiceId)) {
      itemsByInvoiceId.set(item.invoiceId, []);
    }

    itemsByInvoiceId.get(item.invoiceId).push(item);
  }

  return itemsByInvoiceId;
}
function getInvoiceDateCode(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "00";
  const day = parts.find((part) => part.type === "day")?.value || "00";

  return `${year}${month}${day}`;
}

function getInvoiceNumberPrefix(dateCode) {
  return `INV-${dateCode}`;
}

function getInvoiceSequenceFromNumber(invoiceNumber, prefix) {
  const value = String(invoiceNumber || "");

  if (!value.startsWith(`${prefix}-`)) {
    return 0;
  }

  const sequenceText = value.slice(`${prefix}-`.length);
  const sequence = Number(sequenceText);

  return Number.isInteger(sequence) && sequence > 0
    ? sequence
    : 0;
}

async function getHighestExistingInvoiceSequence(db, prefix) {
  const result = await db
    .prepare(`
      SELECT invoice_number
      FROM invoices
      WHERE invoice_number LIKE ?
    `)
    .bind(`${prefix}-%`)
    .all();

  return (result.results || []).reduce((highest, row) => {
    const sequence = getInvoiceSequenceFromNumber(row.invoice_number, prefix);
    return Math.max(highest, sequence);
  }, 0);
}

async function createInvoiceNumber(db) {
  const dateCode = getInvoiceDateCode();
  const prefix = getInvoiceNumberPrefix(dateCode);
  const highestExistingSequence = await getHighestExistingInvoiceSequence(db, prefix);

  await db
    .prepare(`
      INSERT INTO invoice_sequences (
        date_code,
        last_sequence,
        updated_at
      )
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(date_code) DO NOTHING
    `)
    .bind(dateCode, highestExistingSequence)
    .run();

  const sequenceRow = await db
    .prepare(`
      UPDATE invoice_sequences
      SET
        last_sequence = last_sequence + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE date_code = ?
      RETURNING last_sequence
    `)
    .bind(dateCode)
    .first();

  const sequence = Number(sequenceRow?.last_sequence || 1);
  const sequenceText = String(sequence).padStart(3, "0");

  return `${prefix}-${sequenceText}`;
}

function findBikeColor(colors, colorName) {
  const targetName = String(colorName || "").trim().toLowerCase();

  return colors.find((color) => {
    return String(color.name || "").trim().toLowerCase() === targetName;
  }) || null;
}

function deductColorStock(colors, colorName, quantity) {
  const targetName = String(colorName || "").trim().toLowerCase();

  let foundColor = null;

  const nextColors = colors.map((color) => {
    const colorNameText = String(color.name || "").trim().toLowerCase();

    if (colorNameText !== targetName) {
      return color;
    }

    foundColor = color;

    return {
      ...color,
      stockQty: Math.max(0, Number(color.stockQty || 0) - quantity)
    };
  });

  return {
    foundColor,
    nextColors,
    nextStockQty: getColorStockTotal(nextColors)
  };
}

function rowToInvoice(row) {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,

    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerAddress: row.customer_address,

    bikeId: row.bike_id,
    bikeBrand: row.bike_brand,
    bikeName: row.bike_name,
    bikeColorName: row.bike_color_name || "",
    bikeColorHex: row.bike_color_hex || "",
    bikeColorImage: row.bike_color_image || "",

    quantity: Number(row.quantity || 1),
    unitPrice: Number(row.unit_price || 0),
    totalPrice: Number(row.total_price || 0),

    paymentMethod: row.payment_method,
    notes: row.notes,

    createdById: row.created_by_id,
    createdByUsername: row.created_by_username,
    createdByRole: row.created_by_role,
    status: row.status || "active",
voidReason: row.void_reason || "",
voidedAt: row.voided_at || "",
voidedById: row.voided_by_id || "",
voidedByUsername: row.voided_by_username || "",
voidedByRole: row.voided_by_role || "",
    createdAt: row.created_at
  };
}
function restoreColorStock(colors, colorName, quantity) {
  const targetName = String(colorName || "").trim().toLowerCase();

  let foundColor = null;

  const nextColors = colors.map((color) => {
    const colorNameText = String(color.name || "").trim().toLowerCase();

    if (colorNameText !== targetName) {
      return color;
    }

    foundColor = color;

    return {
      ...color,
      stockQty: Math.max(0, Number(color.stockQty || 0) + quantity)
    };
  });

  return {
    foundColor,
    nextColors,
    nextStockQty: getColorStockTotal(nextColors)
  };
}
function normalizeInvoiceItemPayload(item) {
  const quantity = Number(item.quantity || 1);
  const unitPrice = Number(item.unitPrice || 0);

  return {
    bikeId: String(item.bikeId || "").trim(),
    bikeColorName: String(item.bikeColorName || "").trim(),
    quantity: quantity > 0 ? quantity : 1,
    unitPrice: unitPrice >= 0 ? unitPrice : 0
  };
}

function normalizeInvoicePayload(payload) {
  const rawItems = Array.isArray(payload.items) && payload.items.length
    ? payload.items
    : [payload];

  return {
    customerName: String(payload.customerName || "").trim(),
    customerPhone: String(payload.customerPhone || "").trim(),
    customerAddress: String(payload.customerAddress || "").trim(),

    paymentMethod: String(payload.paymentMethod || "").trim(),
    notes: String(payload.notes || "").trim(),

    items: rawItems.map(normalizeInvoiceItemPayload)
  };
}
async function cleanupInvoiceCreateFailure(db, invoiceId) {
  try {
    await db
      .prepare("DELETE FROM invoice_items WHERE invoice_id = ?")
      .bind(invoiceId)
      .run();

    await db
      .prepare("DELETE FROM invoices WHERE id = ?")
      .bind(invoiceId)
      .run();
  } catch (error) {
    console.error("Failed to cleanup invoice create failure:", error);
  }
}
function validateInvoice(invoice) {
  const errors = [];

  if (!invoice.customerName) {
    errors.push("Nama customer wajib diisi.");
  }

  if (!invoice.items.length) {
    errors.push("Minimal 1 item invoice wajib diisi.");
  }

  invoice.items.forEach((item, index) => {
    const itemNumber = index + 1;

    if (!item.bikeId) {
      errors.push(`Item ${itemNumber}: sepeda wajib dipilih.`);
    }

    if (!item.bikeColorName) {
      errors.push(`Item ${itemNumber}: warna sepeda wajib dipilih.`);
    }

    if (item.quantity < 1) {
      errors.push(`Item ${itemNumber}: jumlah unit minimal 1.`);
    }

    if (item.unitPrice < 0) {
      errors.push(`Item ${itemNumber}: harga tidak boleh negatif.`);
    }
  });

  return errors;
}

async function getBikeById(db, id) {
  return db
    .prepare(`
      SELECT
        id,
        brand,
        name,
        price,
        inStock,
        stockQty,
        colors
      FROM bikes
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();
}

async function getInvoiceById(db, invoiceId) {
  const row = await db
    .prepare(`
      SELECT *
      FROM invoices
      WHERE id = ?
      LIMIT 1
    `)
    .bind(invoiceId)
    .first();

  if (!row) {
    return null;
  }

  const invoice = rowToInvoice(row);
  invoice.items = await getInvoiceItemsByInvoiceId(db, invoice.id);

  return invoice;
}
function getD1ChangeCount(result) {
  return Number(
    result?.meta?.changes ??
    result?.changes ??
    0
  );
}

function getOriginalColorsText(bike, colors) {
  if (typeof bike.colors === "string") {
    return bike.colors;
  }

  return JSON.stringify(colors);
}

async function updateBikeStockOptimistically(db, bike, colors, nextColors, nextStock) {
  const originalColorsText = getOriginalColorsText(bike, colors);
  const originalStockQty = Number(bike.stockQty || 0);
  const nextColorsText = JSON.stringify(nextColors);

  const result = await db
    .prepare(`
      UPDATE bikes
      SET
        colors = ?,
        stockQty = ?,
        inStock = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
        AND colors = ?
        AND stockQty = ?
    `)
    .bind(
      nextColorsText,
      nextStock,
      nextStock > 0 ? 1 : 0,
      bike.id,
      originalColorsText,
      originalStockQty
    )
    .run();

  return getD1ChangeCount(result) > 0;
}

async function restoreBikeStockAfterInvoiceFailure(db, bike, colors, nextColors, nextStock) {
  try {
    const originalColorsText = getOriginalColorsText(bike, colors);
    const originalStockQty = Number(bike.stockQty || 0);
    const nextColorsText = JSON.stringify(nextColors);

    await db
      .prepare(`
        UPDATE bikes
        SET
          colors = ?,
          stockQty = ?,
          inStock = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
          AND colors = ?
          AND stockQty = ?
      `)
      .bind(
        originalColorsText,
        originalStockQty,
        originalStockQty > 0 ? 1 : 0,
        bike.id,
        nextColorsText,
        nextStock
      )
      .run();
  } catch (error) {
    console.error("Failed to restore stock after invoice failure:", error);
  }
}
async function writeStockMovement(env, user, data) {
  await env.BIKE_DB
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
      data.bikeId,
      data.bikeBrand,
      data.bikeName,
      data.bikeColorName || "",
      data.movementType,
      data.quantityChange,
      data.quantityBefore,
      data.quantityAfter,
      data.note || "",
      user.id || "",
      user.username,
      user.role
    )
    .run();
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

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);

    const result = await env.BIKE_DB
      .prepare(`
        SELECT *
        FROM invoices
        ORDER BY datetime(created_at) DESC
        LIMIT ?
      `)
      .bind(limit)
      .all();

    const invoices = (result.results || []).map(rowToInvoice);
const invoiceIds = invoices.map((invoice) => invoice.id);
const itemsByInvoiceId = await getInvoiceItemsByInvoiceIds(
  env.BIKE_DB,
  invoiceIds
);

const invoicesWithItems = invoices.map((invoice) => ({
  ...invoice,
  items: itemsByInvoiceId.get(invoice.id) || []
}));

return jsonResponse({
  success: true,
  invoices: invoicesWithItems
});
  } catch (error) {
    console.error("Invoices GET error:", error);

    return jsonResponse(
      { error: "Failed to load invoices" },
      500
    );
  }
}
async function prepareInvoiceItemsAndStockUpdates(db, invoice) {
  const bikePlans = new Map();
  const preparedItems = [];

  for (const item of invoice.items) {
    let bikePlan = bikePlans.get(item.bikeId);

    if (!bikePlan) {
      const bike = await getBikeById(db, item.bikeId);

      if (!bike) {
        throw new Error("Sepeda tidak ditemukan.");
      }

      const originalColors = normalizeBikeColors(bike.colors);

      bikePlan = {
        bike,
        originalColors,
        workingColors: originalColors,
        stockBefore: getColorStockTotal(originalColors)
      };

      bikePlans.set(item.bikeId, bikePlan);
    }

    const selectedColor = findBikeColor(
      bikePlan.workingColors,
      item.bikeColorName
    );

    if (!selectedColor) {
      throw new Error(`Warna ${item.bikeColorName} tidak ditemukan.`);
    }

    const currentColorStock = Number(selectedColor.stockQty || 0);

    if (currentColorStock < item.quantity) {
      throw new Error(
        `Stok warna ${selectedColor.name} tidak cukup. Stok tersedia: ${currentColorStock}.`
      );
    }

    const stockResult = deductColorStock(
      bikePlan.workingColors,
      item.bikeColorName,
      item.quantity
    );

    bikePlan.workingColors = stockResult.nextColors;
    bikePlan.nextStock = stockResult.nextStockQty;

    preparedItems.push({
      bikeId: bikePlan.bike.id,
      bikeBrand: bikePlan.bike.brand,
      bikeName: bikePlan.bike.name,
      bikeColorName: selectedColor.name,
      bikeColorHex: selectedColor.hex || "",
      bikeColorImage: selectedColor.image || "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice
    });
  }

  const stockUpdates = Array.from(bikePlans.values()).map((plan) => ({
    bike: plan.bike,
    originalColors: plan.originalColors,
    nextColors: plan.workingColors,
    stockBefore: plan.stockBefore,
    stockAfter: getColorStockTotal(plan.workingColors)
  }));

  return {
    preparedItems,
    stockUpdates,
    totalPrice: preparedItems.reduce((total, item) => {
      return total + item.lineTotal;
    }, 0)
  };
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

    const payload = await request.json().catch(() => null);

    if (!payload) {
      return jsonResponse({ error: "Invalid invoice data" }, 400);
    }

    const invoice = normalizeInvoicePayload(payload);
    const errors = validateInvoice(invoice);

    if (errors.length) {
      return jsonResponse(
        { error: "Invalid invoice data", errors },
        400
      );
    }

    const invoicePlan = await prepareInvoiceItemsAndStockUpdates(
      env.BIKE_DB,
      invoice
    );

    const firstItem = invoicePlan.preparedItems[0];
    const invoiceId = createInvoiceId();
    const invoiceNumber = await createInvoiceNumber(env.BIKE_DB);
    const totalPrice = invoicePlan.totalPrice;

    try {
      await env.BIKE_DB
        .prepare(`
          INSERT INTO invoices (
            id,
            invoice_number,

            customer_name,
            customer_phone,
            customer_address,

            bike_id,
            bike_brand,
            bike_name,
            bike_color_name,
            bike_color_hex,
            bike_color_image,

            quantity,
            unit_price,
            total_price,

            payment_method,
            notes,

            created_by_id,
            created_by_username,
            created_by_role
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          invoiceId,
          invoiceNumber,

          invoice.customerName,
          invoice.customerPhone,
          invoice.customerAddress,

          firstItem.bikeId,
          firstItem.bikeBrand,
          firstItem.bikeName,
          firstItem.bikeColorName,
          firstItem.bikeColorHex,
          firstItem.bikeColorImage,

          firstItem.quantity,
          firstItem.unitPrice,
          totalPrice,

          invoice.paymentMethod,
          invoice.notes,

          auth.user.id || "",
          auth.user.username,
          auth.user.role
        )
        .run();

      for (const item of invoicePlan.preparedItems) {
        await insertInvoiceItem(env.BIKE_DB, invoiceId, item);
      }
    } catch (error) {
      await cleanupInvoiceCreateFailure(env.BIKE_DB, invoiceId);
      throw error;
    }

    const appliedStockUpdates = [];

    for (const stockUpdate of invoicePlan.stockUpdates) {
      const stockUpdated = await updateBikeStockOptimistically(
        env.BIKE_DB,
        stockUpdate.bike,
        stockUpdate.originalColors,
        stockUpdate.nextColors,
        stockUpdate.stockAfter
      );

      if (!stockUpdated) {
        for (const applied of appliedStockUpdates.reverse()) {
          await restoreBikeStockAfterInvoiceFailure(
            env.BIKE_DB,
            applied.bike,
            applied.originalColors,
            applied.nextColors,
            applied.stockAfter
          );
        }

        await cleanupInvoiceCreateFailure(env.BIKE_DB, invoiceId);

        return jsonResponse(
          {
            error: "Stok baru saja berubah. Refresh data invoice dan coba lagi."
          },
          409
        );
      }

      appliedStockUpdates.push(stockUpdate);
    }

    for (const item of invoicePlan.preparedItems) {
      const stockUpdate = invoicePlan.stockUpdates.find((update) => {
        return update.bike.id === item.bikeId;
      });

      await writeStockMovement(env, auth.user, {
        bikeId: item.bikeId,
        bikeBrand: item.bikeBrand,
        bikeName: item.bikeName,
        bikeColorName: item.bikeColorName,
        movementType: "sale",
        quantityChange: -item.quantity,
        quantityBefore: stockUpdate?.stockBefore ?? 0,
        quantityAfter: stockUpdate?.stockAfter ?? 0,
        note: `Invoice ${invoiceNumber} - Warna ${item.bikeColorName}`
      });
    }

    const createdInvoice = await getInvoiceById(env.BIKE_DB, invoiceId);

    await writeAuditLog(env, auth.user, {
      action: "invoice_create",
      targetType: "invoice",
      targetId: createdInvoice.id,
      targetLabel: createdInvoice.invoiceNumber,
      details: {
        customerName: createdInvoice.customerName,
        totalPrice: createdInvoice.totalPrice,
        itemCount: invoicePlan.preparedItems.length,
        items: invoicePlan.preparedItems.map((item) => ({
          bikeName: `${item.bikeBrand} ${item.bikeName}`,
          bikeColorName: item.bikeColorName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal
        }))
      }
    });

    return jsonResponse({
      success: true,
      invoice: createdInvoice,
      stock: invoicePlan.stockUpdates.map((update) => ({
        bikeId: update.bike.id,
        before: update.stockBefore,
        after: update.stockAfter
      }))
    });
  } catch (error) {
    console.error("Invoices POST error:", error);

    return jsonResponse(
      { error: error.message || "Failed to create invoice" },
      500
    );
  }
}
export async function onRequestPatch(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin", "staff"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);
    }

    const payload = await request.json().catch(() => null);

    if (!payload) {
      return jsonResponse({ error: "Invalid void request" }, 400);
    }

    const invoiceId = String(payload.id || "").trim();
    const reason = String(payload.reason || "").trim();

    if (!invoiceId) {
      return jsonResponse({ error: "Invoice ID wajib diisi." }, 400);
    }

    if (!reason) {
      return jsonResponse({ error: "Alasan pembatalan wajib diisi." }, 400);
    }

    const invoiceRow = await env.BIKE_DB
      .prepare("SELECT * FROM invoices WHERE id = ? LIMIT 1")
      .bind(invoiceId)
      .first();

    if (!invoiceRow) {
      return jsonResponse({ error: "Invoice tidak ditemukan." }, 404);
    }

    const invoice = rowToInvoice(invoiceRow);

    if (invoice.status === "voided") {
      return jsonResponse({ error: "Invoice sudah dibatalkan." }, 400);
    }

    const bike = await getBikeById(env.BIKE_DB, invoice.bikeId);

    if (!bike) {
      return jsonResponse({ error: "Sepeda pada invoice tidak ditemukan." }, 404);
    }

    const colors = normalizeBikeColors(bike.colors);
    const currentStock = getColorStockTotal(colors);

    const stockResult = restoreColorStock(
      colors,
      invoice.bikeColorName,
      invoice.quantity
    );

    if (!stockResult.foundColor) {
      return jsonResponse(
        { error: "Warna sepeda pada invoice tidak ditemukan di data stok." },
        400
      );
    }

    const nextColors = stockResult.nextColors;
    const nextStock = stockResult.nextStockQty;

    const stockUpdated = await updateBikeStockOptimistically(
      env.BIKE_DB,
      bike,
      colors,
      nextColors,
      nextStock
    );

    if (!stockUpdated) {
      return jsonResponse(
        {
          error: "Stok baru saja berubah. Refresh invoice dan coba lagi."
        },
        409
      );
    }

    try {
      await env.BIKE_DB
        .prepare(`
          UPDATE invoices
          SET
            status = 'voided',
            void_reason = ?,
            voided_at = CURRENT_TIMESTAMP,
            voided_by_id = ?,
            voided_by_username = ?,
            voided_by_role = ?
          WHERE id = ?
            AND status != 'voided'
        `)
        .bind(
          reason,
          auth.user.id || "",
          auth.user.username,
          auth.user.role,
          invoice.id
        )
        .run();
    } catch (error) {
      await restoreBikeStockAfterInvoiceFailure(
        env.BIKE_DB,
        bike,
        colors,
        nextColors,
        nextStock
      );

      throw error;
    }

   try {
  await writeStockMovement(env, auth.user, {
    bikeId: bike.id,
    bikeBrand: bike.brand,
    bikeName: bike.name,
    bikeColorName: invoice.bikeColorName,
    movementType: "adjustment",
    quantityChange: invoice.quantity,
    quantityBefore: currentStock,
    quantityAfter: nextStock,
    note: `Void invoice ${invoice.invoiceNumber} - ${reason}`
  });
} catch (error) {
  console.error("Failed to write invoice void stock movement:", error);
}

const updatedInvoice = await getInvoiceById(env.BIKE_DB, invoice.id);

try {
  await writeAuditLog(env, auth.user, {
    action: "invoice_void",
    targetType: "invoice",
    targetId: updatedInvoice.id,
    targetLabel: updatedInvoice.invoiceNumber,
    details: {
      reason,
      customerName: updatedInvoice.customerName,
      bikeName: `${updatedInvoice.bikeBrand} ${updatedInvoice.bikeName}`,
      bikeColorName: updatedInvoice.bikeColorName,
      quantity: updatedInvoice.quantity,
      stockBefore: currentStock,
      stockAfter: nextStock
    }
  });
} catch (error) {
  console.error("Failed to write invoice void audit log:", error);
}

    return jsonResponse({
      success: true,
      invoice: updatedInvoice,
      stock: {
        bikeId: bike.id,
        colorName: invoice.bikeColorName,
        before: currentStock,
        after: nextStock
      }
    });
  } catch (error) {
    console.error("Invoices PATCH error:", error);

    return jsonResponse(
      { error: "Failed to void invoice" },
      500
    );
  }
}