const SITE_URL = "https://niagabersama.com";

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createUrlEntry(url) {
  return `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`;
}

export async function onRequestGet(context) {
  const { env } = context;
  const urls = [
    `${SITE_URL}/`,
    `${SITE_URL}/bikes`,
    `${SITE_URL}/contact`
  ];

  if (env.BIKE_DB) {
    try {
      const result = await env.BIKE_DB
        .prepare(`
          SELECT id
          FROM bikes
          WHERE inStock = 1
          ORDER BY brand ASC, name ASC
        `)
        .all();

      (result.results || []).forEach((bike) => {
        if (bike.id) {
          urls.push(`${SITE_URL}/bikes/${encodeURIComponent(bike.id)}`);
        }
      });
    } catch (error) {
      console.error("Dynamic sitemap bike query failed:", error);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(createUrlEntry).join("\n")}\n</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=UTF-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}
