function formatPrice(price) {
  if (price === undefined || price === null || price === "") {
    return "Hubungi untuk harga";
  }

  return `Rp ${Number(price).toLocaleString("id-ID")}`;
}
const STORE_WHATSAPP_NUMBER = "6282122065168"; // replace with real number

function getWhatsAppLink(bike) {
  const message = `Halo, saya tertarik dengan ${bike.name}. Apakah unit ini tersedia?`;
  return `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function createBikeCard(bike) {
  return `
    <div class="bike-card" data-bike-id="${bike.id}" tabindex="0" role="button" aria-label="View details for ${bike.name}">
      <img src="${bike.image}" alt="${bike.alt}">
      <div class="bike-info">
        <p class="bike-brand">${bike.brand}</p>
        <h3>${bike.name}</h3>
        <p class="bike-spec">Jarak tempuh ${bike.range || "Hubungi toko"}</p>
        <p class="bike-price">${formatPrice(bike.price)}</p>

        <a 
  href="${getWhatsAppLink(bike)}" 
  class="bike-whatsapp-btn" 
  target="_blank" 
  rel="noopener"
  onclick="event.stopPropagation();"
>
  <span class="wa-btn-content">
    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
         alt="WhatsApp" 
         class="wa-icon">
    <span>Tanya WhatsApp</span>
  </span>
</a>
      </div>
    </div>
  `;
}
function setupThemeToggle() {
  const themeToggle = document.getElementById("themeToggle");

  if (!themeToggle) {
    return;
  }

  const savedTheme = localStorage.getItem("siteTheme");

  const shouldUseDarkTheme = savedTheme === null || savedTheme === "dark";

  if (shouldUseDarkTheme) {
    document.body.classList.add("dark-theme");
    themeToggle.textContent = "Light";
  } else {
    document.body.classList.remove("dark-theme");
    themeToggle.textContent = "Dark";
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");

    const isDark = document.body.classList.contains("dark-theme");

    localStorage.setItem("siteTheme", isDark ? "dark" : "light");
    themeToggle.textContent = isDark ? "Light" : "Dark";
  });
}

setupThemeToggle();