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
    current.netRevenue = current.grossRevenue;
  });

  return Array.from(byDate.values()).sort((a, b) => {
    return String(a.date).localeCompare(String(b.date));
  });
}

function formatAnalyticsDateKey(date, granularity) {
  const year = date.getUTCFullYear();
  const month = String(
    date.getUTCMonth() + 1
  ).padStart(2, "0");

  if (granularity === "month") {
    return `${year}-${month}`;
  }

  const day = String(date.getUTCDate()).padStart(
    2,
    "0"
  );

  return `${year}-${month}-${day}`;
}

function fillAnalyticsPeriods(
  rows,
  rangeDays,
  granularity
) {
  const byDate = new Map(
    rows.map((row) => [row.date, row])
  );
  const jakartaNow = new Date(
    Date.now() + 7 * 60 * 60 * 1000
  );
  const end = new Date(Date.UTC(
    jakartaNow.getUTCFullYear(),
    jakartaNow.getUTCMonth(),
    jakartaNow.getUTCDate()
  ));
  const start = new Date(end);

  start.setUTCDate(
    start.getUTCDate() - (rangeDays - 1)
  );

  if (granularity === "week") {
    const mondayOffset =
      (start.getUTCDay() + 6) % 7;

    start.setUTCDate(
      start.getUTCDate() - mondayOffset
    );
  } else if (granularity === "month") {
    start.setUTCFullYear(
      end.getUTCFullYear(),
      end.getUTCMonth() - 11,
      1
    );
  }

  const periods = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const date = formatAnalyticsDateKey(
      cursor,
      granularity
    );

    periods.push(byDate.get(date) || {
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

    if (granularity === "month") {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    } else {
      cursor.setUTCDate(
        cursor.getUTCDate() +
          (granularity === "week" ? 7 : 1)
      );
    }
  }

  return periods;
}

function getAnalyticsRange(request) {
  const requestedDays = Number(
    new URL(request.url).searchParams.get("days") || 14
  );
  const rangeDays = [14, 30, 90, 365].includes(
    requestedDays
  )
    ? requestedDays
    : 14;
  const granularity = rangeDays > 120
    ? "month"
    : rangeDays > 31
      ? "week"
      : "day";

  return { rangeDays, granularity };
}

function getDateBucketExpression(
  columnName,
  granularity
) {
  const localDateTime =
    `datetime(${columnName}, '+7 hours')`;

  if (granularity === "month") {
    return `strftime('%Y-%m', ${localDateTime})`;
  }

  if (granularity === "week") {
    return `date(
      ${localDateTime},
      '-' || (
        (
          CAST(strftime('%w', ${localDateTime}) AS INTEGER) + 6
        ) % 7
      ) || ' days'
    )`;
  }

  return `date(${localDateTime})`;
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
    const { rangeDays, granularity } =
      getAnalyticsRange(request);
    const rangeModifier = `-${rangeDays - 1} days`;
    const rangeStartExpression = granularity === "month"
      ? "date('now', '+7 hours', 'start of month', '-11 months')"
      : `date('now', '+7 hours', '${rangeModifier}')`;

    const cogsExpression = hasUnitCost
      ? "COALESCE(SUM(ii.unit_cost * ii.quantity), 0)"
      : "0";

    const voidedDateExpression = hasVoidedAt
      ? "voided_at"
      : hasUpdatedAt
        ? "updated_at"
        : "created_at";
    const salesDateBucket = getDateBucketExpression(
      "i.created_at",
      granularity
    );
    const voidedDateBucket = getDateBucketExpression(
      voidedDateExpression,
      granularity
    );

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
        WHERE
          COALESCE(i.status, 'active') != 'voided'
          AND date(datetime(i.created_at), '+7 hours') >=
            ${rangeStartExpression}
      `)
      .first();

    const voidedSummary = await env.BIKE_DB
      .prepare(`
        SELECT
          COUNT(*) AS voided_invoices,
          COALESCE(SUM(total_price), 0) AS voided_revenue
        FROM invoices
        WHERE
          status = 'voided'
          AND date(datetime(${voidedDateExpression}), '+7 hours') >=
            ${rangeStartExpression}
      `)
      .first();

    const grossDailyResult = await env.BIKE_DB
      .prepare(`
        SELECT
          ${salesDateBucket} AS date,
          COALESCE(SUM(ii.line_total), 0) AS gross_revenue,
          0 AS voided_revenue,
          COUNT(DISTINCT i.id) AS invoices_created,
          0 AS invoices_voided,
          COALESCE(SUM(ii.quantity), 0) AS units_sold
        FROM invoices i
        LEFT JOIN invoice_items ii
          ON ii.invoice_id = i.id
        WHERE
          COALESCE(i.status, 'active') != 'voided'
          AND date(datetime(i.created_at), '+7 hours') >=
            ${rangeStartExpression}
        GROUP BY ${salesDateBucket}
      `)
      .all();

    const voidedDailyResult = await env.BIKE_DB
      .prepare(`
        SELECT
          ${voidedDateBucket} AS date,
          0 AS gross_revenue,
          COALESCE(SUM(total_price), 0) AS voided_revenue,
          0 AS invoices_created,
          COUNT(*) AS invoices_voided,
          0 AS units_sold
        FROM invoices
        WHERE
          status = 'voided'
          AND date(datetime(${voidedDateExpression}), '+7 hours') >=
            ${rangeStartExpression}
        GROUP BY ${voidedDateBucket}
      `)
      .all();

    const dailySales = fillAnalyticsPeriods(
      normalizeDailyRows([
        ...(grossDailyResult.results || []),
        ...(voidedDailyResult.results || [])
      ]),
      rangeDays,
      granularity
    );

    const revenue = Number(summary?.revenue || 0);
    const cogs = Number(summary?.cogs || 0);

    return jsonResponse({
      success: true,
      hasCostData: hasUnitCost,
      rangeDays,
      granularity,
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
