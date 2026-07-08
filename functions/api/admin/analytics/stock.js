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
          date(datetime(created_at), '+7 hours') AS date,

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
        WHERE datetime(created_at) >= datetime('now', '-14 days')
        GROUP BY date(datetime(created_at), '+7 hours')
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
      dailyMovements: (movementResult.results || []).map(rowToDailyMovement)
    });
  } catch (error) {
    console.error("Stock analytics GET error:", error);

    return jsonResponse(
      { error: "Failed to load stock analytics" },
      500
    );
  }
}