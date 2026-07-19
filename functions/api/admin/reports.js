import { jsonResponse, requireRole } from "../../_shared/auth.js";

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
  const result = await db.prepare(`
    SELECT
      date(datetime(i.created_at), '+7 hours') AS report_date,
      i.invoice_number,
      i.customer_name,
      i.payment_method,
      ${bankSelect} AS payment_bank,
      COALESCE(i.status, 'active') AS status,
      i.created_by_username,
      ii.bike_brand,
      ii.bike_name,
      ii.bike_color_name,
      ii.quantity,
      ii.unit_price,
      ii.line_total
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
    const auth = await requireRole(request, env, ["admin", "staff"]);
    if (!auth.ok) return auth.response;
    if (!env.BIKE_DB) return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);

    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "sales";
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";

    if (!["sales", "stock"].includes(type)) {
      return jsonResponse({ error: "Jenis laporan tidak valid." }, 400);
    }
    const metadataOnly =
  url.searchParams.get("meta") === "1";

if (metadataOnly) {
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
    if (!isValidDate(from) || !isValidDate(to) || from > to) {
      return jsonResponse({ error: "Rentang tanggal laporan tidak valid." }, 400);
    }

    const rows = type === "sales"
      ? await getSalesReport(env.BIKE_DB, from, to)
      : await getStockReport(env.BIKE_DB, from, to);

    return jsonResponse({
      success: true,
      type,
      title: type === "sales" ? "Laporan Penjualan" : "Laporan Pergerakan Stok",
      from,
      to,
      rows
    });
  } catch (error) {
    console.error("Report generation GET error:", error);
    return jsonResponse({ error: "Gagal membuat laporan.", detail: error.message }, 500);
  }
}