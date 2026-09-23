import { jsonResponse, requireRole } from "../../_shared/auth.js";
import { normalizeBikeColors } from "../../_shared/bike-utils.js";

const MOVEMENT_LABELS = {
  stock_in: "Stok Masuk",
  sale: "Penjualan",
  adjustment: "Penyesuaian"
};

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function tableHasColumn(db, table, column) {
  const result = await db.prepare(`PRAGMA table_info(${table})`).all();
  return (result.results || []).some((row) => row.name === column);
}

async function getSalesReport(db, from, to) {
  const hasPaymentBank = await tableHasColumn(db, "invoices", "payment_bank");
  const bankSelect = hasPaymentBank ? "i.payment_bank" : "''";
  const hasVoidReason = await tableHasColumn(db, "invoices", "void_reason");
  const voidReasonSelect = hasVoidReason ? "i.void_reason" : "''";
  const hasVoidedBy = await tableHasColumn(db, "invoices", "voided_by_username");
  const voidedBySelect = hasVoidedBy ? "i.voided_by_username" : "''";
  const result = await db.prepare(`
    SELECT
      date(datetime(i.created_at), '+7 hours') AS report_date,
      i.invoice_number,
      i.customer_name,
      i.payment_method,
      ${bankSelect} AS payment_bank,
      COALESCE(i.status, 'active') AS status,
      ${voidReasonSelect} AS void_reason,
      ${voidedBySelect} AS voided_by_username,
      i.created_by_username,
      COALESCE(ii.bike_brand, i.bike_brand) AS bike_brand,
      COALESCE(ii.bike_name, i.bike_name) AS bike_name,
      COALESCE(ii.bike_color_name, i.bike_color_name) AS bike_color_name,
      COALESCE(ii.quantity, i.quantity) AS quantity,
      COALESCE(ii.unit_price, i.unit_price) AS unit_price,
      COALESCE(ii.line_total, i.total_price) AS line_total
    FROM invoices i
    LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
    WHERE date(datetime(i.created_at), '+7 hours') BETWEEN ? AND ?
    ORDER BY datetime(i.created_at) ASC, ii.created_at ASC
    LIMIT 5000
  `).bind(from, to).all();

  return (result.results || []).map((row) => ({
    date: row.report_date,
    invoiceNumber: row.invoice_number,
    customerName: row.customer_name,
    bike: `${row.bike_brand || ""} ${row.bike_name || ""}`.trim() || "-",
    color: row.bike_color_name || "-",
    quantity: Number(row.quantity || 0),
    unitPrice: Number(row.unit_price || 0),
    lineTotal: Number(row.line_total || 0),
    payment: [row.payment_method, row.payment_bank].filter(Boolean).join(" — ") || "-",
    statusLabel: row.status === "voided" ? "Dibatalkan" : "Aktif",
    voidReason: row.void_reason || "-",
    voidedBy: row.voided_by_username || "-",
    createdBy: row.created_by_username || "-"
  }));
}

async function getStockReport(db, from, to) {
  const result = await db.prepare(`
    SELECT *
    FROM stock_movements
    WHERE date(datetime(created_at), '+7 hours') BETWEEN ? AND ?
    ORDER BY datetime(created_at) ASC
    LIMIT 5000
  `).bind(from, to).all();

  return (result.results || []).map((row) => ({
    date: row.created_at,
    bike: `${row.bike_brand || ""} ${row.bike_name || ""}`.trim() || "-",
    color: row.bike_color_name || "-",
    movementLabel: MOVEMENT_LABELS[row.movement_type] || row.movement_type,
    quantityChange: Number(row.quantity_change || 0),
    quantityBefore: Number(row.quantity_before || 0),
    quantityAfter: Number(row.quantity_after || 0),
    createdBy: row.created_by_username || "-",
    note: row.note || "-"
  }));
}

async function getCurrentStockReport(db) {
  const result = await db.prepare(`
    SELECT
      bikes.id,
      bikes.brand,
      bikes.name,
      bikes.colors,
      bikes.stockQty,
      bikes.inStock,
      COALESCE(brands.name, bikes.brand) AS brand_name,
      COALESCE(brands.sort_order, 999) AS brand_sort_order
    FROM bikes
    LEFT JOIN brands
      ON brands.id = bikes.brand_id
    ORDER BY
      brand_sort_order ASC,
      brand_name ASC,
      bikes.name ASC
  `).all();

  return (result.results || []).flatMap((row) => {
    const bike = `${row.brand_name || row.brand || ""} ${row.name || ""}`
      .trim() || "-";
    const colors = normalizeBikeColors(row.colors);

    if (!colors.length) {
      const quantity = Math.max(0, Number(row.stockQty || 0));

      return [{
        bikeId: row.id,
        bike,
        color: "-",
        quantity,
        statusLabel: quantity <= 0
          ? "Habis"
          : quantity <= 3
            ? "Stok Rendah"
            : "Tersedia"
      }];
    }

    return colors.map((color) => {
      const quantity = Math.max(0, Number(color.stockQty || 0));

      return {
        bikeId: row.id,
        bike,
        color: color.name || "-",
        quantity,
        statusLabel: quantity <= 0
          ? "Habis"
          : quantity <= 3
            ? "Stok Rendah"
            : "Tersedia"
      };
    });
  });
}
async function getReportAvailableRange(
  db,
  type
) {
  const table =
    type === "sales"
      ? "invoices"
      : "stock_movements";

  const result = await db
    .prepare(`
      SELECT
        MIN(
          date(
            datetime(created_at),
            '+7 hours'
          )
        ) AS first_date,

        MAX(
          date(
            datetime(created_at),
            '+7 hours'
          )
        ) AS last_date
      FROM ${table}
    `)
    .first();

  return {
    firstDate:
      result?.first_date || "",

    lastDate:
      result?.last_date || ""
  };
}
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin"]);
    if (!auth.ok) return auth.response;
    if (!env.BIKE_DB) return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);

    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "sales";
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";

    if (!["sales", "stock", "current_stock"].includes(type)) {
      return jsonResponse({ error: "Jenis laporan tidak valid." }, 400);
    }
    const metadataOnly =
  url.searchParams.get("meta") === "1";

if (metadataOnly) {
  if (type === "current_stock") {
    return jsonResponse({
      success: true,
      type,
      range: {
        firstDate: "",
        lastDate: ""
      }
    });
  }

  const range =
    await getReportAvailableRange(
      env.BIKE_DB,
      type
    );

  return jsonResponse({
    success: true,
    type,
    range
  });
}
    if (
      type !== "current_stock" &&
      (!isValidDate(from) || !isValidDate(to) || from > to)
    ) {
      return jsonResponse({ error: "Rentang tanggal laporan tidak valid." }, 400);
    }

    const rows = type === "sales"
      ? await getSalesReport(env.BIKE_DB, from, to)
      : type === "stock"
        ? await getStockReport(env.BIKE_DB, from, to)
        : await getCurrentStockReport(env.BIKE_DB);

    const generatedAt = new Date().toISOString();

    return jsonResponse({
      success: true,
      type,
      title: type === "sales"
        ? "Laporan Penjualan"
        : type === "stock"
          ? "Laporan Pergerakan Stok"
          : "Laporan Posisi Stok Saat Ini",
      from: type === "current_stock" ? "" : from,
      to: type === "current_stock" ? "" : to,
      generatedAt,
      rows
    });
  } catch (error) {
    console.error("Report generation GET error:", error);
    return jsonResponse({ error: "Gagal membuat laporan.", detail: error.message }, 500);
  }
}
