import {
  jsonResponse
} from "../_shared/auth.js";


function rowToBrand(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoPath: row.logo_path || "",

    theme: {
      main: row.theme_main || "#203333",
      second: row.theme_second || "#2f4f4f",
      soft: row.theme_soft || "rgba(159, 184, 182, 0.18)",
      glow: row.theme_glow || "rgba(0, 0, 0, 0.12)"
    },

    className: `brand-${row.slug}`,
    sortOrder: Number(row.sort_order || 0)
  };
}

export async function onRequestGet(context) {
  const { env } = context;

  try {
    if (!env.BIKE_DB) {
      return jsonResponse(
        { error: "D1 binding BIKE_DB is missing" },
        500
      );
    }

    const result = await env.BIKE_DB
      .prepare(`
        SELECT
          id,
          name,
          slug,
          logo_path,
          theme_main,
          theme_second,
          theme_soft,
          theme_glow,
          sort_order
        FROM brands
        WHERE is_active = 1
        ORDER BY sort_order ASC, name ASC
      `)
      .all();

    return jsonResponse({
      success: true,
      brands: (result.results || []).map(rowToBrand)
    });
  } catch (error) {
    console.error("Public brands API error:", error);

    return jsonResponse(
      { error: "Failed to load brands" },
      500
    );
  }
}