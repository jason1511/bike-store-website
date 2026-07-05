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

function createInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const shortId = crypto.randomUUID().slice(0, 8).toUpperCase();

  return `INV-${year}${month}${day}-${shortId}`;
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

    createdAt: row.created_at
  };
}

function normalizeInvoicePayload(payload) {
  const quantity = Number(payload.quantity || 1);
  const unitPrice = Number(payload.unitPrice || 0);

  return {
    customerName: String(payload.customerName || "").trim(),
    customerPhone: String(payload.customerPhone || "").trim(),
    customerAddress: String(payload.customerAddress || "").trim(),

    bikeId: String(payload.bikeId || "").trim(),
    bikeColorName: String(payload.bikeColorName || "").trim(),

    quantity: quantity > 0 ? quantity : 1,
    unitPrice: unitPrice >= 0 ? unitPrice : 0,

    paymentMethod: String(payload.paymentMethod || "").trim(),
    notes: String(payload.notes || "").trim()
  };
}

function validateInvoice(invoice) {
  const errors = [];

  if (!invoice.customerName) {
    errors.push("Nama customer wajib diisi.");
  }

  if (!invoice.bikeId) {
    errors.push("Sepeda wajib dipilih.");
  }

  if (!invoice.bikeColorName) {
    errors.push("Warna sepeda wajib dipilih.");
  }

  if (invoice.quantity < 1) {
    errors.push("Jumlah unit minimal 1.");
  }

  if (invoice.unitPrice < 0) {
    errors.push("Harga tidak boleh negatif.");
  }

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

async function getInvoiceById(db, id) {
  const row = await db
    .prepare("SELECT * FROM invoices WHERE id = ? LIMIT 1")
    .bind(id)
    .first();

  return row ? rowToInvoice(row) : null;
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

    return jsonResponse({
      success: true,
      invoices: (result.results || []).map(rowToInvoice)
    });
  } catch (error) {
    console.error("Invoices GET error:", error);

    return jsonResponse(
      { error: "Failed to load invoices" },
      500
    );
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

    const bike = await getBikeById(env.BIKE_DB, invoice.bikeId);

    if (!bike) {
      return jsonResponse({ error: "Sepeda tidak ditemukan." }, 404);
    }

    const colors = normalizeBikeColors(bike.colors);
    const selectedColor = findBikeColor(colors, invoice.bikeColorName);

    if (!selectedColor) {
      return jsonResponse(
        {
          error: "Warna sepeda tidak ditemukan.",
          selectedColor: invoice.bikeColorName
        },
        400
      );
    }

    const currentColorStock = Number(selectedColor.stockQty || 0);
    const currentStock = getColorStockTotal(colors);

    if (currentColorStock < invoice.quantity) {
      return jsonResponse(
        {
          error: "Stok warna tidak cukup.",
          selectedColor: selectedColor.name,
          availableStock: currentColorStock
        },
        400
      );
    }

    const stockResult = deductColorStock(
      colors,
      invoice.bikeColorName,
      invoice.quantity
    );

    const nextColors = stockResult.nextColors;
    const nextStock = stockResult.nextStockQty;

    const invoiceId = createInvoiceId();
    const invoiceNumber = createInvoiceNumber();
    const totalPrice = invoice.quantity * invoice.unitPrice;

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

        bike.id,
        bike.brand,
        bike.name,
        selectedColor.name,
        selectedColor.hex || "",
        selectedColor.image || "",

        invoice.quantity,
        invoice.unitPrice,
        totalPrice,

        invoice.paymentMethod,
        invoice.notes,

        auth.user.id || "",
        auth.user.username,
        auth.user.role
      )
      .run();

    await env.BIKE_DB
      .prepare(`
        UPDATE bikes
        SET
          colors = ?,
          stockQty = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(JSON.stringify(nextColors), nextStock, bike.id)
      .run();

    await writeStockMovement(env, auth.user, {
      bikeId: bike.id,
      bikeBrand: bike.brand,
      bikeName: bike.name,
      bikeColorName: selectedColor.name,
      movementType: "sale",
      quantityChange: -invoice.quantity,
      quantityBefore: currentStock,
      quantityAfter: nextStock,
      note: `Invoice ${invoiceNumber} - Warna ${selectedColor.name}`
    });

    const createdInvoice = await getInvoiceById(env.BIKE_DB, invoiceId);

    await writeAuditLog(env, auth.user, {
      action: "invoice_create",
      targetType: "invoice",
      targetId: createdInvoice.id,
      targetLabel: createdInvoice.invoiceNumber,
      details: {
        customerName: createdInvoice.customerName,
        bikeName: `${createdInvoice.bikeBrand} ${createdInvoice.bikeName}`,
        bikeColorName: selectedColor.name,
        quantity: createdInvoice.quantity,
        totalPrice: createdInvoice.totalPrice,
        stockBefore: currentStock,
        stockAfter: nextStock
      }
    });

    return jsonResponse({
      success: true,
      invoice: createdInvoice,
      stock: {
        bikeId: bike.id,
        colorName: selectedColor.name,
        before: currentStock,
        after: nextStock
      }
    });
  } catch (error) {
    console.error("Invoices POST error:", error);

    return jsonResponse(
      { error: "Failed to create invoice" },
      500
    );
  }
}