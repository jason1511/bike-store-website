function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function parseBikeColors(colors) {
  if (Array.isArray(colors)) {
    return colors;
  }

  if (typeof colors === "string") {
    try {
      const parsedColors = JSON.parse(colors);
      return Array.isArray(parsedColors) ? parsedColors : [];
    } catch (error) {
      return [];
    }
  }

  return [];
}

function normalizeBikeColors(colors) {
  return parseBikeColors(colors)
    .map((color) => ({
      name: String(color.name || "").trim(),
      hex: String(color.hex || "#cccccc").trim(),
      image: String(color.image || "").trim(),
      stockQty: Math.max(0, Number(color.stockQty || 0))
    }))
    .filter((color) => color.name || color.image || color.stockQty > 0);
}

function getColorStockTotal(colors) {
  return normalizeBikeColors(colors).reduce((total, color) => {
    return total + Math.max(0, Number(color.stockQty || 0));
  }, 0);
}

function getPrimaryColor(colors) {
  return colors.find((color) => color.stockQty > 0 && color.image)
    || colors.find((color) => color.image)
    || colors.find((color) => color.stockQty > 0)
    || colors[0]
    || null;
}

function createFallbackBrandSlug(brand) {
  return String(brand || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function createBrandTheme(row) {
  const slug = row.brand_slug || createFallbackBrandSlug(row.brand);
  const main = row.brand_theme_main || row.themeColor || "#203333";
  const second = row.brand_theme_second || row.themeColorSecond || "#2f4f4f";

  return {
    id: row.brand_id || "",
    name: row.brand_name || row.brand || "",
    slug,
    logo: row.brand_logo_path || "",
    className: slug ? `brand-${slug}` : "brand-default",
    main,
    second,
    soft: row.brand_theme_soft || `${main}24`,
    glow: row.brand_theme_glow || `${main}33`
  };
}

function rowToBike(row) {
  const colors = normalizeBikeColors(row.colors);
  const colorStockTotal = getColorStockTotal(colors);
  const stockQty = colorStockTotal > 0
    ? colorStockTotal
    : Math.max(0, Number(row.stockQty || 0));

  const primaryColor = getPrimaryColor(colors);
  const brandTheme = createBrandTheme(row);

  return {
    ...row,

    brandId: row.brand_id || "",
    brand: brandTheme.name || row.brand,
    brandSlug: brandTheme.slug,
    brandTheme,

    colors,
    image: primaryColor?.image || row.image || "",

    price: Number(row.price || 0),
    featured: Boolean(row.featured),
    inStock: Boolean(row.inStock) && stockQty > 0,
    stockQty
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
      bikes: (result.results || []).map(rowToBike)
    });
  } catch (error) {
    console.error("Public bikes API error:", error);

    return jsonResponse(
      { error: "Failed to load bikes" },
      500
    );
  }
}