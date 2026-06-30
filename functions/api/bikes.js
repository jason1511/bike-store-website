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

function rowToBike(row) {
  const colors = normalizeBikeColors(row.colors);
  const colorStockTotal = getColorStockTotal(colors);
  const stockQty = colorStockTotal > 0
    ? colorStockTotal
    : Math.max(0, Number(row.stockQty || 0));

  const primaryColor = getPrimaryColor(colors);

  return {
    ...row,
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
        SELECT *
        FROM bikes
        WHERE inStock = 1
        ORDER BY brand ASC, name ASC
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