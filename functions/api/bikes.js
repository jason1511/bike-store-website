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

function rowToBike(row) {
  return {
    ...row,
    colors: parseBikeColors(row.colors),
    featured: Boolean(row.featured),
    inStock: Boolean(row.inStock),
    stockQty: Number(row.stockQty || 0)
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