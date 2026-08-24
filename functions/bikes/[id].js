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

function safeJsonForHtml(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function toAbsoluteUrl(value, fallback = "/images/logo.jpeg") {
  const path = String(value || fallback).trim();

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${SITE_URL}/${path.replace(/^\/+/, "")}`;
}

function truncate(value, maxLength = 160) {
  const text = String(value || "").trim();
  return text.length <= maxLength
    ? text
    : `${text.slice(0, maxLength - 1).trim()}…`;
}

function formatRupiah(value) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function getProductDisplayName(bike) {
  const brand = String(bike.brand || "").trim();
  const name = String(bike.name || "").trim();

  if (!brand) return name;
  if (!name) return brand;

  return name.toLowerCase().startsWith(brand.toLowerCase())
    ? name
    : `${brand} ${name}`;
}

function createWhatsAppUrl(bike) {
  const phone = String(bike.brand || "").toLowerCase() === "saige"
    ? "6282122065168"
    : "6282141519010";

  const message = encodeURIComponent(
    `Halo, saya ingin menanyakan ${getProductDisplayName(bike)} yang ada di katalog CV Niaga Bersama Abadi.`
  );

  return `https://wa.me/${phone}?text=${message}`;
}

function getSafeThemeColor(value, fallback) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback;
}

function createProductStructuredData(bike, canonicalUrl, imageUrl) {
  const product = {
    "@type": "Product",
    "@id": `${canonicalUrl}#product`,
    name: getProductDisplayName(bike),
    description: bike.description || "Sepeda listrik untuk kebutuhan mobilitas harian.",
    image: [imageUrl],
    sku: bike.id,
    category: "Sepeda Listrik",
    brand: {
      "@type": "Brand",
      name: bike.brand
    },
    url: canonicalUrl,
    itemCondition: "https://schema.org/NewCondition"
  };

  const additionalProperties = [
    ["Baterai", bike.battery],
    ["Motor", bike.motor],
    ["Kecepatan Maksimum", bike.topSpeed],
    ["Jarak Tempuh", bike.range],
    ["Beban Maksimum", bike.maxWeight],
    ["Fitur Keamanan", bike.safety]
  ]
    .filter(([, value]) => String(value || "").trim())
    .map(([name, value]) => ({
      "@type": "PropertyValue",
      name,
      value
    }));

  if (additionalProperties.length) {
    product.additionalProperty = additionalProperties;
  }

  if (Number(bike.price || 0) > 0) {
    product.offers = {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "IDR",
      price: Number(bike.price),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "CV Niaga Bersama Abadi"
      }
    };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      product,
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Beranda",
            item: `${SITE_URL}/`
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Katalog Sepeda",
            item: `${SITE_URL}/bikes`
          },
          {
            "@type": "ListItem",
            position: 3,
            name: getProductDisplayName(bike),
            item: canonicalUrl
          }
        ]
      }
    ]
  };
}

function renderNotFound() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="robots" content="noindex">
        <title>Sepeda Tidak Ditemukan | CV Niaga Bersama Abadi</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">
        <link rel="stylesheet" href="/css/global.css">
        <link rel="stylesheet" href="/css/bikes.css">
      </head>
      <body>
        <main class="product-page product-error-page">
          <section class="product-error-card">
            <p class="section-tag">Katalog Showroom</p>
            <h1>Sepeda tidak ditemukan</h1>
            <p>Produk mungkin sudah tidak aktif atau alamat yang dibuka tidak tersedia.</p>
            <a class="btn-primary" href="/bikes">Kembali ke katalog</a>
          </section>
        </main>
      </body>
    </html>`,
    {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

function renderProductPage(bike) {
  const canonicalUrl = `${SITE_URL}/bikes/${encodeURIComponent(bike.id)}`;
  const imageUrl = toAbsoluteUrl(bike.image);
  const displayName = getProductDisplayName(bike);
  const title = `${displayName} | Sepeda Listrik Lumajang`;
  const description = truncate(
    bike.description || `${displayName}, sepeda listrik yang tersedia di showroom CV Niaga Bersama Abadi Lumajang.`
  );
  const themeMain = getSafeThemeColor(bike.brandTheme?.main, "#203333");
  const themeSecond = getSafeThemeColor(bike.brandTheme?.second, "#2f4f4f");
  const structuredData = createProductStructuredData(bike, canonicalUrl, imageUrl);
  const whatsappUrl = createWhatsAppUrl(bike);
  const colors = Array.isArray(bike.colors) ? bike.colors : [];

  const specs = [
    ["Baterai", bike.battery],
    ["Motor", bike.motor],
    ["Kecepatan Maksimum", bike.topSpeed],
    ["Jarak Tempuh", bike.range],
    ["Beban Maksimum", bike.maxWeight],
    ["Fitur Keamanan", bike.safety]
  ].filter(([, value]) => String(value || "").trim());

  const priceHtml = Number(bike.price || 0) > 0
    ? `<p class="product-price">${escapeHtml(formatRupiah(bike.price))}</p>`
    : '<p class="product-price product-price-contact">Hubungi showroom untuk harga terbaru</p>';

  const colorHtml = colors.length
    ? `<section class="product-colours" aria-labelledby="productColourHeading">
        <h2 id="productColourHeading">Pilihan Warna</h2>
        <div class="product-colour-list">
          ${colors.map((color) => `
            <span class="product-colour">
              <i style="--product-colour: ${escapeHtml(color.hex || "#cccccc")}"></i>
              ${escapeHtml(color.name || "Warna unit")}
            </span>
          `).join("")}
        </div>
      </section>`
    : "";

  return `<!DOCTYPE html>
  <html lang="id">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">

    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:type" content="product">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:alt" content="${escapeHtml(bike.alt || title)}">
    <meta property="og:site_name" content="CV Niaga Bersama Abadi">
    <meta property="og:locale" content="id_ID">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">

    <script type="application/ld+json">${safeJsonForHtml(structuredData)}</script>

    <link rel="stylesheet" href="/css/global.css">
    <link rel="stylesheet" href="/css/bikes.css">
  </head>
  <body style="--product-theme-main: ${themeMain}; --product-theme-second: ${themeSecond};">
    <header>
      <nav class="navbar">
        <a href="/" class="logo">
          <img src="/images/logo.jpeg" alt="CV Niaga Bersama Abadi logo">
          <span>CV Niaga Bersama Abadi</span>
        </a>
        <ul class="nav-links">
          <li><a href="/">Beranda</a></li>
          <li><a href="/bikes">Katalog</a></li>
          <li><a href="/contact">Kontak</a></li>
        </ul>
        <button class="theme-toggle" id="themeToggle" type="button">Dark</button>
      </nav>
    </header>

    <main class="product-page">
      <nav class="product-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Beranda</a>
        <span aria-hidden="true">/</span>
        <a href="/bikes">Katalog</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">${escapeHtml(bike.name)}</span>
      </nav>

      <article class="product-detail">
        <div class="product-image-panel">
          <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(bike.alt || title)}" fetchpriority="high">
        </div>

        <div class="product-summary">
          <p class="product-brand">${escapeHtml(bike.brand)}</p>
          <h1>${escapeHtml(bike.name)}</h1>
          <span class="product-status">Tersedia di showroom</span>
          ${priceHtml}
          <p class="product-description">${escapeHtml(bike.description || description)}</p>

          <div class="product-actions">
            <a class="btn-primary" href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noopener">Tanya via WhatsApp</a>
            <a class="btn-secondary" href="/contact">Lihat alamat showroom</a>
          </div>
        </div>
      </article>

      <section class="product-information" aria-labelledby="productSpecsHeading">
        <div>
          <p class="section-tag">Spesifikasi</p>
          <h2 id="productSpecsHeading">Informasi ${escapeHtml(displayName)}</h2>
        </div>
        <dl class="product-spec-grid">
          ${specs.map(([label, value]) => `
            <div class="product-spec">
              <dt>${escapeHtml(label)}</dt>
              <dd>${escapeHtml(value)}</dd>
            </div>
          `).join("")}
        </dl>
      </section>

      ${colorHtml}

      <section class="product-note">
        <h2>Konfirmasi stok dan harga</h2>
        <p>Ketersediaan warna dan harga dapat berubah. Hubungi showroom sebelum datang untuk memastikan unit yang Anda inginkan masih tersedia.</p>
        <a href="/bikes" class="btn-secondary">Kembali ke semua sepeda</a>
      </section>
    </main>

    <footer class="footer">
      <div class="footer-content">
        <div class="footer-brand">
          <div class="footer-logo">
            <img src="/images/logo.jpeg" alt="CV Niaga Bersama Abadi logo">
            <span>CV Niaga Bersama Abadi</span>
          </div>
          <p>Showroom sepeda listrik di Lumajang untuk mobilitas harian dan kebutuhan keluarga.</p>
        </div>
        <div class="footer-links">
          <a href="/">Beranda</a>
          <a href="/bikes">Katalog</a>
          <a href="/contact">Kontak</a>
        </div>
      </div>
      <div class="footer-bottom"><p>&copy; 2026 CV Niaga Bersama Abadi. All rights reserved.</p></div>
    </footer>

    <script src="/js/global.js"></script>
  </body>
  </html>`;
}

export async function onRequestGet(context) {
  const { env, params } = context;

  if (!env.BIKE_DB) {
    return new Response("Database binding is unavailable", { status: 500 });
  }

  const bikeId = String(params.id || "").trim();

  if (!bikeId) {
    return renderNotFound();
  }

  try {
    const row = await env.BIKE_DB
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
        LEFT JOIN brands ON brands.id = bikes.brand_id
        WHERE bikes.id = ?
          AND bikes.inStock = 1
        LIMIT 1
      `)
      .bind(bikeId)
      .first();

    if (!row) {
      return renderNotFound();
    }

    const bike = rowToPublicBike(row);
    const html = renderProductPage(bike);

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
        "X-Robots-Tag": "index, follow"
      }
    });
  } catch (error) {
    console.error("Product page error:", error);
    return new Response("Failed to load product page", { status: 500 });
  }
}
