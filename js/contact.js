/* =========================
   LIVE SHOWROOM HOURS
========================= */
const STORE_TIME_ZONE = "Asia/Jakarta";
const STORE_OPEN_MINUTES = 9 * 60;
const STORE_CLOSE_MINUTES = 17 * 60;

function getJakartaStoreTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    weekday: values.weekday,
    minutes:
      Number(values.hour || 0) * 60 +
      Number(values.minute || 0)
  };
}

function getStoreOperatingStatus(now = new Date()) {
  const { weekday, minutes } = getJakartaStoreTime(now);
  const isSunday = weekday === "Sun";
  const isOpen =
    !isSunday &&
    minutes >= STORE_OPEN_MINUTES &&
    minutes < STORE_CLOSE_MINUTES;

  if (isOpen) {
    return {
      isOpen: true,
      message: "Buka sekarang · Tutup pukul 17.00"
    };
  }

  if (!isSunday && minutes < STORE_OPEN_MINUTES) {
    return {
      isOpen: false,
      message: "Tutup sekarang · Buka hari ini pukul 09.00"
    };
  }

  if (weekday === "Sat" || isSunday) {
    return {
      isOpen: false,
      message: "Tutup sekarang · Buka Senin pukul 09.00"
    };
  }

  return {
    isOpen: false,
    message: "Tutup sekarang · Buka besok pukul 09.00"
  };
}

function updateStoreHourStatuses() {
  let status;

  try {
    status = getStoreOperatingStatus();
  } catch (error) {
    status = {
      isOpen: null,
      message: "Jadwal normal: Senin–Sabtu 09.00–17.00"
    };
  }

  document.querySelectorAll("[data-store-hours]")
    .forEach((element) => {
      const text = element.querySelector(
        "[data-store-hours-text]"
      );

      element.classList.remove(
        "is-loading",
        "is-open",
        "is-closed"
      );

      if (status.isOpen === true) {
        element.classList.add("is-open");
      } else if (status.isOpen === false) {
        element.classList.add("is-closed");
      } else {
        element.classList.add("is-loading");
      }

      if (text && text.textContent !== status.message) {
        text.textContent = status.message;
      }
    });
}

function setupStoreHourTracker() {
  updateStoreHourStatuses();
  window.setInterval(
    updateStoreHourStatuses,
    60 * 1000
  );
}

if (typeof document !== "undefined") {
  setupStoreHourTracker();
}
