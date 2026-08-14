import {
  jsonResponse,
  requireRole
} from "../../../_shared/auth.js";

function rowToDailyMovement(row) {
  return {
    date: row.date,
    stockIn: Number(row.stock_in || 0),
    sale: Number(row.sale || 0),
    adjustment: Number(row.adjustment || 0),
    netChange: Number(row.net_change || 0)
  };
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
      stockIn: 0,
      sale: 0,
      adjustment: 0,
      netChange: 0
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

    const { rangeDays, granularity } =
      getAnalyticsRange(request);
    const dateBucket = getDateBucketExpression(
      "created_at",
      granularity
    );
    const rangeModifier = `-${rangeDays - 1} days`;
    const rangeStartExpression = granularity === "month"
      ? "date('now', '+7 hours', 'start of month', '-11 months')"
      : `date('now', '+7 hours', '${rangeModifier}')`;

    const summary = await env.BIKE_DB
      .prepare(`
        SELECT
          COALESCE(SUM(stockQty), 0) AS total_stock,
          COUNT(*) AS total_bikes,
          SUM(CASE WHEN inStock = 1 THEN 1 ELSE 0 END) AS active_bikes,
          SUM(CASE WHEN stockQty <= 0 THEN 1 ELSE 0 END) AS out_of_stock_bikes,
          SUM(CASE WHEN stockQty > 0 AND stockQty <= 3 THEN 1 ELSE 0 END) AS low_stock_bikes
        FROM bikes
      `)
      .first();

    const movementResult = await env.BIKE_DB
      .prepare(`
        SELECT
          ${dateBucket} AS date,

          SUM(
            CASE
              WHEN movement_type = 'stock_in'
              THEN quantity_change
              ELSE 0
            END
          ) AS stock_in,

          SUM(
            CASE
              WHEN movement_type = 'sale'
              THEN ABS(quantity_change)
              ELSE 0
            END
          ) AS sale,

          SUM(
            CASE
              WHEN movement_type = 'adjustment'
              THEN quantity_change
              ELSE 0
            END
          ) AS adjustment,

          SUM(quantity_change) AS net_change
        FROM stock_movements
        WHERE
          date(datetime(created_at), '+7 hours') >=
          ${rangeStartExpression}
        GROUP BY ${dateBucket}
        ORDER BY date ASC
      `)
      .all();

    return jsonResponse({
      success: true,
      summary: {
        totalStock: Number(summary?.total_stock || 0),
        totalBikes: Number(summary?.total_bikes || 0),
        activeBikes: Number(summary?.active_bikes || 0),
        outOfStockBikes: Number(summary?.out_of_stock_bikes || 0),
        lowStockBikes: Number(summary?.low_stock_bikes || 0)
      },
      rangeDays,
      granularity,
      dailyMovements: fillAnalyticsPeriods(
        (movementResult.results || []).map(
          rowToDailyMovement
        ),
        rangeDays,
        granularity
      )
    });
  } catch (error) {
    console.error("Stock analytics GET error:", error);

    return jsonResponse(
      { error: "Failed to load stock analytics" },
      500
    );
  }
}
