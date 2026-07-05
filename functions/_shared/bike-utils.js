export function parseBikeColors(colors) {
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

export function normalizeBikeColors(colors) {
  return parseBikeColors(colors)
    .map((color) => ({
      name: String(color.name || "").trim(),
      hex: String(color.hex || "#cccccc").trim(),
      image: String(color.image || "").trim(),
      stockQty: Math.max(0, Number(color.stockQty || 0))
    }))
    .filter((color) => color.name || color.image || color.stockQty > 0);
}

export function getColorStockTotal(colors) {
  return normalizeBikeColors(colors).reduce((total, color) => {
    return total + Math.max(0, Number(color.stockQty || 0));
  }, 0);
}

export function getPrimaryColor(colors) {
  return colors.find((color) => color.stockQty > 0 && color.image)
    || colors.find((color) => color.image)
    || colors.find((color) => color.stockQty > 0)
    || colors[0]
    || null;
}

export function createFallbackBrandSlug(brand) {
  return String(brand || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function createBrandTheme(row) {
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

export function rowToPublicBike(row) {
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

export function rowToBasicBike(row) {
  return {
    ...row,
    price: Number(row.price || 0),
    featured: Boolean(row.featured),
    inStock: Boolean(row.inStock),
    stockQty: Number(row.stockQty || 0)
  };
}