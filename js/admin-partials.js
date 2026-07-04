/* =========================
   ADMIN PARTIAL LOADER
========================= */
const ADMIN_PARTIAL_VERSION = "admin-partials-2";

const ADMIN_PARTIALS = [
  "bikes",
  "brands",
  "invoices",
  "services",
  "users",
  "audit",
  "printable-invoice",
  "printable-service"
];

async function fetchAdminPartial(name) {
  const response = await fetch(
    `/admin-partials/${name}.html?v=${ADMIN_PARTIAL_VERSION}`
  );

  if (!response.ok) {
    throw new Error(`Gagal memuat partial admin: ${name}`);
  }

  return response.text();
}

async function loadAdminPartials() {
  const partialMount = document.getElementById("adminPartialMount");

  if (!partialMount) {
    throw new Error("Admin partial mount tidak ditemukan.");
  }

  partialMount.innerHTML = `
    <div class="admin-empty-state">
      Memuat admin panel...
    </div>
  `;

  const partialHtml = await Promise.all(
    ADMIN_PARTIALS.map((name) => fetchAdminPartial(name))
  );

  partialMount.innerHTML = partialHtml.join("\n");
}