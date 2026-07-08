import {
  jsonResponse,
  requireRole
} from "../../../_shared/auth.js";

async function tableHasColumn(db, tableName, columnName) {
  const result = await db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all();

  return (result.results || []).some((row) => {
    return row.name === columnName;
  });
}

function normalizeDailyRows(rows) {
  const byDate = new Map();

  rows.forEach((row) => {
    const date = row.date || "-";

    if (!byDate.has(date)) {
      byDate.set(date, {
        date,
        grossRevenue: 0,
        voidedRevenue: 0,
        netRevenue: 0,
        invoicesCreated: 0,
        invoicesVoided: 0,
        unitsSold: 0,
        cogs: null,
        grossProfit: null
      });
    }

    const current = byDate.get(date);

    current.grossRevenue += Number(row.gross_revenue || 0);
    current.voidedRevenue += Number(row.voided_revenue || 0);
    current.invoicesCreated += Number(row.invoices_created || 0);
    current.invoicesVoided += Number(row.invoices_voided || 0);
    current.unitsSold += Number(row.units_sold || 0);
    current.netRevenue = current.grossRevenue - current.voidedRevenue;
  });

  return Array.from(byDate.values()).sort((a, b) => {
    return String(a.date).localeCompare(String(b.date));
  });
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

    const hasUnitCost = await tableHasColumn(env.BIKE_DB, "invoice_items", "unit_cost");
    const hasVoidedAt = await tableHasColumn(env.BIKE_DB, "invoices", "voided_at");
    const hasUpdatedAt = await tableHasColumn(env.BIKE_DB, "invoices", "updated_at");

    const cogsExpression = hasUnitCost
      ? "COALESCE(SUM(ii.unit_cost * ii.quantity), 0)"
      : "0";

    const voidedDateExpression = hasVoidedAt
      ? "voided_at"
      : hasUpdatedAt
        ? "updated_at"
        : "created_at";

    const summary = await env.BIKE_DB
      .prepare(`
        SELECT
          COUNT(DISTINCT i.id) AS active_invoices,
          COALESCE(SUM(ii.quantity), 0) AS units_sold,
          COALESCE(SUM(ii.line_total), 0) AS revenue,
          ${cogsExpression} AS cogs
        FROM invoices i
        LEFT JOIN invoice_items ii
          ON ii.invoice_id = i.id
        WHERE COALESCE(i.status, 'active') != 'voided'
      `)
      .first();

    const voidedSummary = await env.BIKE_DB
      .prepare(`
        SELECT
          COUNT(*) AS voided_invoices,
          COALESCE(SUM(total_price), 0) AS voided_revenue
        FROM invoices
        WHERE status = 'voided'
      `)
      .first();

    const grossDailyResult = await env.BIKE_DB
      .prepare(`
        SELECT
          date(datetime(i.created_at), '+7 hours') AS date,
          COALESCE(SUM(ii.line_total), 0) AS gross_revenue,
          0 AS voided_revenue,
          COUNT(DISTINCT i.id) AS invoices_created,
          0 AS invoices_voided,
          COALESCE(SUM(ii.quantity), 0) AS units_sold
        FROM invoices i
        LEFT JOIN invoice_items ii
          ON ii.invoice_id = i.id
        WHERE datetime(i.created_at) >= datetime('now', '-14 days')
        GROUP BY date(datetime(i.created_at), '+7 hours')
      `)
      .all();

    const voidedDailyResult = await env.BIKE_DB
      .prepare(`
        SELECT
          date(datetime(${voidedDateExpression}), '+7 hours') AS date,
          0 AS gross_revenue,
          COALESCE(SUM(total_price), 0) AS voided_revenue,
          0 AS invoices_created,
          COUNT(*) AS invoices_voided,
          0 AS units_sold
        FROM invoices
        WHERE
          status = 'voided'
          AND datetime(${voidedDateExpression}) >= datetime('now', '-14 days')
        GROUP BY date(datetime(${voidedDateExpression}), '+7 hours')
      `)
      .all();

    const dailySales = normalizeDailyRows([
      ...(grossDailyResult.results || []),
      ...(voidedDailyResult.results || [])
    ]);

    const revenue = Number(summary?.revenue || 0);
    const cogs = Number(summary?.cogs || 0);

    return jsonResponse({
      success: true,
      hasCostData: hasUnitCost,
      summary: {
        activeInvoices: Number(summary?.active_invoices || 0),
        unitsSold: Number(summary?.units_sold || 0),
        revenue,
        cogs: hasUnitCost ? cogs : null,
        grossProfit: hasUnitCost ? revenue - cogs : null,
        voidedInvoices: Number(voidedSummary?.voided_invoices || 0),
        voidedRevenue: Number(voidedSummary?.voided_revenue || 0)
      },
      dailySales
    });
  } catch (error) {
    console.error("Invoice analytics GET error:", error);

    return jsonResponse(
      {
        error: "Failed to load invoice analytics",
        detail: error.message
      },
      500
    );
  }
}