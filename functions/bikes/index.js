import { rowToPublicBike } from "../_shared/bike-utils.js";

const SITE_URL = "https://niagabersama.com";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function absoluteUrl(value, fallback = "/images/logo.jpeg") {
  const path = String(value || fallback).trim();

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatPrice(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function renderBikeCard(bike) {
  const productUrl = `/bikes/${encodeURIComponent(bike.id)}`;
  const brandClass = escapeHtml(bike.brandTheme?.className || "brand-default");
  const style = [
    `--card-brand-main:${bike.brandTheme?.main || "#203333"}`,
    `--card-brand-second:${bike.brandTheme?.second || "#2f4f4f"}`,
    `--card-brand-soft:${bike.brandTheme?.soft || "rgba(159,184,182,.18)"}`,
    `--card-brand-glow:${bike.brandTheme?.glow || "rgba(0,0,0,.12)"}`
  ].join(";");

  return `
        <article class="bike-card ${brandClass}" style="${escapeHtml(style)}">
          <div class="bike-card-image-wrap">
            <img class="bike-card-image" src="${escapeHtml(bike.image || "/images/logo.jpeg")}" alt="${escapeHtml(bike.alt || `${bike.brand} ${bike.name}`)}" width="300" height="240" loading="lazy" decoding="async">
            <div class="bike-card-image-badges"><span class="bike-availability-badge is-available">Tersedia</span></div>
          </div>
          <div class="bike-info">
            <p class="bike-brand">${escapeHtml(bike.brand)}</p>
            <h3><a class="bike-card-title-link" href="${productUrl}">${escapeHtml(bike.name)}</a></h3>
            <p class="bike-spec">${escapeHtml(bike.range || "Detail spesifikasi tersedia")}</p>
            ${bike.description ? `<p class="bike-card-description">${escapeHtml(bike.description)}</p>` : ""}
            <p class="bike-price">${Number(bike.price || 0) > 0 ? escapeHtml(formatPrice(bike.price)) : "Hubungi showroom untuk harga"}</p>
            <a class="btn-primary" href="${productUrl}">Lihat Detail Produk</a>
          </div>
        </article>`;
}

function renderStructuredData(bikes) {
  const itemList = bikes.map((bike, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${SITE_URL}/bikes/${encodeURIComponent(bike.id)}`,
    name: `${bike.brand} ${bike.name}`.trim(),
    image: absoluteUrl(bike.image)
  }));

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/bikes#webpage`,
        url: `${SITE_URL}/bikes`,
        name: "Katalog Sepeda Listrik Lumajang",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
        mainEntity: { "@id": `${SITE_URL}/bikes#itemlist` }
      },
      {
        "@type": "ItemList",
        "@id": `${SITE_URL}/bikes#itemlist`,
        name: "Unit sepeda listrik yang tersedia",
        numberOfItems: itemList.length,
        itemListElement: itemList
      }
    ]
  };

  return `<script type="application/ld+json">${JSON.stringify(data).replaceAll("<", "\\u003c")}</script>`;
}

export async function onRequestGet(context) {
  const staticResponse = await context.next();

  if (!staticResponse.ok || !context.env.BIKE_DB) {
    return staticResponse;
  }

  try {
    const result = await context.env.BIKE_DB.prepare(`
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
      LEFT JOIN brands ON brands.id = bikes.brand_id
      WHERE bikes.inStock = 1
      ORDER BY COALESCE(brands.sort_order, 999) ASC, bikes.brand ASC, bikes.name ASC
    `).all();

    const bikes = (result.results || []).map(rowToPublicBike).filter((bike) => bike.inStock);
    const source = await staticResponse.text();
    const html = source
      .replace("<!-- SEO_STRUCTURED_DATA -->", renderStructuredData(bikes))
      .replace("<!-- SEO_CATALOGUE_COUNT -->-- unit", `${bikes.length} unit`)
      .replace("<!-- SEO_CATALOGUE_ITEMS -->", bikes.map(renderBikeCard).join("\n"));
    const headers = new Headers(staticResponse.headers);

    headers.set("Content-Type", "text/html; charset=UTF-8");
    headers.set("Cache-Control", "public, max-age=300");
    headers.delete("Content-Length");
    headers.delete("ETag");

    return new Response(html, {
      status: staticResponse.status,
      statusText: staticResponse.statusText,
      headers
    });
  } catch (error) {
    console.error("Server-rendered catalogue failed:", error);
    return staticResponse;
  }
}
