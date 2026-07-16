import {
  jsonResponse
} from "../_shared/auth.js";

import {
  rowToPublicBike
} from "../_shared/bike-utils.js";

export async function onRequestGet(context) {
  const { env } = context;

  try {
    if (!env.BIKE_DB) {
      return jsonResponse(
        {
          error: "D1 binding BIKE_DB is missing"
        },
        500
      );
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

        WHERE bikes.inStock = 1

        ORDER BY
          COALESCE(brands.sort_order, 999) ASC,
          bikes.brand ASC,
          bikes.name ASC
      `)
      .all();

    return jsonResponse({
      bikes: (result.results || []).map(rowToPublicBike)
    });
  } catch (error) {
    console.error("Public bikes API error:", error);

    return jsonResponse(
      {
        error: "Failed to load bikes"
      },
      500
    );
  }
}