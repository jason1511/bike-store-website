import {
  jsonResponse,
  requireRole
} from "../../_shared/auth.js";

function rowToBrand(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoPath: row.logo_path || "",

    themeMain: row.theme_main || "#203333",
    themeSecond: row.theme_second || "#2f4f4f",
    themeSoft: row.theme_soft || "rgba(159, 184, 182, 0.18)",
    themeGlow: row.theme_glow || "rgba(0, 0, 0, 0.12)",

    theme: {
      main: row.theme_main || "#203333",
      second: row.theme_second || "#2f4f4f",
      soft: row.theme_soft || "rgba(159, 184, 182, 0.18)",
      glow: row.theme_glow || "rgba(0, 0, 0, 0.12)"
    },

    className: `brand-${row.slug}`,
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order || 0),

    createdAt: row.created_at,
    updatedAt: row.updated_at
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
      return jsonResponse(
        { error: "D1 binding BIKE_DB is missing" },
        500
      );
    }

    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") === "1";

    const query = includeInactive
      ? `
        SELECT *
        FROM brands
        ORDER BY sort_order ASC, name ASC
      `
      : `
        SELECT *
        FROM brands
        WHERE is_active = 1
        ORDER BY sort_order ASC, name ASC
      `;

    const result = await env.BIKE_DB
      .prepare(query)
      .all();

    return jsonResponse({
      success: true,
      brands: (result.results || []).map(rowToBrand)
    });
  } catch (error) {
    console.error("Admin brands GET error:", error);

    return jsonResponse(
      { error: "Failed to load brands" },
      500
    );
  }
}