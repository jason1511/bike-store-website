import {
  jsonResponse,
  requireRole,
  writeAuditLog
} from "../../_shared/auth.js";

function createBrandId(slug) {
  return `brand_${slug}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeHexColor(value, fallback) {
  const color = String(value || "").trim();

  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color.toLowerCase();
  }

  return fallback;
}

function normalizeActiveValue(value, fallback = 1) {
  if (value === true || value === 1 || value === "1") {
    return 1;
  }

  if (value === false || value === 0 || value === "0") {
    return 0;
  }

  return fallback;
}

function hexToRgba(hex, alpha = 0.18) {
  const safeHex = normalizeHexColor(hex, "#203333").replace("#", "");
  const r = parseInt(safeHex.slice(0, 2), 16);
  const g = parseInt(safeHex.slice(2, 4), 16);
  const b = parseInt(safeHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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

function normalizeBrandPayload(payload, existingBrand = null) {
  const name = String(payload.name || "").trim();
  const slug = slugify(payload.slug || name);
  const themeMain = normalizeHexColor(
    payload.themeMain || payload.theme_main || payload.theme?.main,
    existingBrand?.themeMain || "#203333"
  );
  const themeSecond = normalizeHexColor(
    payload.themeSecond || payload.theme_second || payload.theme?.second,
    existingBrand?.themeSecond || "#2f4f4f"
  );

  return {
    id: String(payload.id || payload.brandId || createBrandId(slug)).trim(),
    name,
    slug,
    logoPath: String(
      payload.logoPath ||
      payload.logo_path ||
      existingBrand?.logoPath ||
      ""
    ).trim(),

    themeMain,
    themeSecond,
    themeSoft: String(
      payload.themeSoft ||
      payload.theme_soft ||
      payload.theme?.soft ||
      hexToRgba(themeMain, 0.18)
    ).trim(),
    themeGlow: String(
      payload.themeGlow ||
      payload.theme_glow ||
      payload.theme?.glow ||
      hexToRgba(themeMain, 0.18)
    ).trim(),

    isActive: normalizeActiveValue(
      payload.isActive ?? payload.is_active,
      existingBrand?.isActive ? 1 : 1
    ),
    sortOrder: payload.sortOrder ?? payload.sort_order ?? existingBrand?.sortOrder ?? null
  };
}

function validateBrand(brand) {
  const errors = [];

  if (!brand.name) {
    errors.push("Nama brand wajib diisi.");
  }

  if (!brand.slug) {
    errors.push("Slug brand wajib diisi.");
  }

  if (!brand.id) {
    errors.push("ID brand wajib diisi.");
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(brand.themeMain)) {
    errors.push("Warna utama brand tidak valid.");
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(brand.themeSecond)) {
    errors.push("Warna kedua brand tidak valid.");
  }

  return errors;
}

async function getBrandById(db, id) {
  const row = await db
    .prepare(`
      SELECT *
      FROM brands
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();

  return row ? rowToBrand(row) : null;
}

async function getNextBrandSortOrder(db) {
  const row = await db
    .prepare(`
      SELECT COALESCE(MAX(sort_order), 0) + 10 AS next_sort_order
      FROM brands
    `)
    .first();

  return Number(row?.next_sort_order || 10);
}

async function findDuplicateBrand(db, brand) {
  return db
    .prepare(`
      SELECT id
      FROM brands
      WHERE id <> ?
        AND (
          lower(slug) = lower(?)
          OR lower(name) = lower(?)
        )
      LIMIT 1
    `)
    .bind(brand.id, brand.slug, brand.name)
    .first();
}

async function writeBrandAudit(env, user, payload) {
  if (typeof writeAuditLog !== "function") {
    return;
  }

  await writeAuditLog(env, user, payload);
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

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse(
        { error: "D1 binding BIKE_DB is missing" },
        500
      );
    }

    const payload = await request.json().catch(() => null);

    if (!payload) {
      return jsonResponse(
        { error: "Invalid brand data" },
        400
      );
    }

    const brand = normalizeBrandPayload(payload);

    if (brand.sortOrder === null || Number.isNaN(Number(brand.sortOrder))) {
      brand.sortOrder = await getNextBrandSortOrder(env.BIKE_DB);
    }

    const errors = validateBrand(brand);

    if (errors.length) {
      return jsonResponse(
        { error: "Invalid brand data", errors },
        400
      );
    }

    const existing = await env.BIKE_DB
      .prepare(`
        SELECT id
        FROM brands
        WHERE id = ?
          OR lower(slug) = lower(?)
          OR lower(name) = lower(?)
        LIMIT 1
      `)
      .bind(brand.id, brand.slug, brand.name)
      .first();

    if (existing) {
      return jsonResponse(
        { error: "Brand dengan nama atau slug ini sudah ada." },
        409
      );
    }

    await env.BIKE_DB
      .prepare(`
        INSERT INTO brands (
          id,
          name,
          slug,
          logo_path,
          theme_main,
          theme_second,
          theme_soft,
          theme_glow,
          is_active,
          sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        brand.id,
        brand.name,
        brand.slug,
        brand.logoPath,
        brand.themeMain,
        brand.themeSecond,
        brand.themeSoft,
        brand.themeGlow,
        brand.isActive,
        brand.sortOrder
      )
      .run();

    const createdBrand = await getBrandById(env.BIKE_DB, brand.id);

    await writeBrandAudit(env, auth.user, {
      action: "brand_create",
      targetType: "brand",
      targetId: createdBrand.id,
      targetLabel: createdBrand.name,
      details: {
        slug: createdBrand.slug,
        logoPath: createdBrand.logoPath,
        themeMain: createdBrand.themeMain,
        themeSecond: createdBrand.themeSecond,
        isActive: createdBrand.isActive
      }
    });

    return jsonResponse({
      success: true,
      brand: createdBrand
    });
  } catch (error) {
    console.error("Admin brands POST error:", error);

    return jsonResponse(
      { error: "Failed to create brand" },
      500
    );
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse(
        { error: "D1 binding BIKE_DB is missing" },
        500
      );
    }

    const payload = await request.json().catch(() => null);

    if (!payload) {
      return jsonResponse(
        { error: "Invalid brand data" },
        400
      );
    }

    const brandId = String(payload.id || payload.brandId || "").trim();

    if (!brandId) {
      return jsonResponse(
        { error: "Brand ID wajib diisi." },
        400
      );
    }

    const existingBrand = await getBrandById(env.BIKE_DB, brandId);

    if (!existingBrand) {
      return jsonResponse(
        { error: "Brand tidak ditemukan." },
        404
      );
    }

    const brand = normalizeBrandPayload(
      {
        ...payload,
        id: brandId
      },
      existingBrand
    );

    const errors = validateBrand(brand);

    if (errors.length) {
      return jsonResponse(
        { error: "Invalid brand data", errors },
        400
      );
    }

    const duplicate = await findDuplicateBrand(env.BIKE_DB, brand);

    if (duplicate) {
      return jsonResponse(
        { error: "Brand dengan nama atau slug ini sudah ada." },
        409
      );
    }

    await env.BIKE_DB
      .prepare(`
        UPDATE brands
        SET
          name = ?,
          slug = ?,
          logo_path = ?,
          theme_main = ?,
          theme_second = ?,
          theme_soft = ?,
          theme_glow = ?,
          is_active = ?,
          sort_order = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(
        brand.name,
        brand.slug,
        brand.logoPath,
        brand.themeMain,
        brand.themeSecond,
        brand.themeSoft,
        brand.themeGlow,
        brand.isActive,
        brand.sortOrder,
        brand.id
      )
      .run();

    const updatedBrand = await getBrandById(env.BIKE_DB, brand.id);

    await writeBrandAudit(env, auth.user, {
      action: "brand_update",
      targetType: "brand",
      targetId: updatedBrand.id,
      targetLabel: updatedBrand.name,
      details: {
        previousName: existingBrand.name,
        name: updatedBrand.name,
        slug: updatedBrand.slug,
        logoPath: updatedBrand.logoPath,
        themeMain: updatedBrand.themeMain,
        themeSecond: updatedBrand.themeSecond,
        isActive: updatedBrand.isActive
      }
    });

    return jsonResponse({
      success: true,
      brand: updatedBrand
    });
  } catch (error) {
    console.error("Admin brands PUT error:", error);

    return jsonResponse(
      { error: "Failed to update brand" },
      500
    );
  }
}

export async function onRequestPatch(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse(
        { error: "D1 binding BIKE_DB is missing" },
        500
      );
    }

    const payload = await request.json().catch(() => null);

    if (!payload) {
      return jsonResponse(
        { error: "Invalid brand data" },
        400
      );
    }

    const brandId = String(payload.id || payload.brandId || "").trim();

    if (!brandId) {
      return jsonResponse(
        { error: "Brand ID wajib diisi." },
        400
      );
    }

    const existingBrand = await getBrandById(env.BIKE_DB, brandId);

    if (!existingBrand) {
      return jsonResponse(
        { error: "Brand tidak ditemukan." },
        404
      );
    }

    const nextActiveState = normalizeActiveValue(payload.isActive, existingBrand.isActive ? 1 : 0);

    await env.BIKE_DB
      .prepare(`
        UPDATE brands
        SET
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(nextActiveState, brandId)
      .run();

    const updatedBrand = await getBrandById(env.BIKE_DB, brandId);

    await writeBrandAudit(env, auth.user, {
      action: nextActiveState ? "brand_activate" : "brand_deactivate",
      targetType: "brand",
      targetId: updatedBrand.id,
      targetLabel: updatedBrand.name,
      details: {
        previousIsActive: existingBrand.isActive,
        isActive: updatedBrand.isActive
      }
    });

    return jsonResponse({
      success: true,
      brand: updatedBrand
    });
  } catch (error) {
    console.error("Admin brands PATCH error:", error);

    return jsonResponse(
      { error: "Failed to update brand status" },
      500
    );
  }
}