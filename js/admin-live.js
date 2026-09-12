/* =========================
   LIVE ADMIN PRESENCE
========================= */
const ADMIN_LIVE_INTERVAL_MS = 10000;
const ADMIN_LIVE_IDLE_MS = 60000;
const ADMIN_LIVE_MAX_VISIBLE_EVENTS = 8;

const adminLiveState = {
  sessionId: crypto.randomUUID(),
  cursor: null,
  timer: null,
  requestInFlight: false,
  started: false,
  lastInteractionAt: Date.now(),
  unreadCount: 0,
  events: [],
  formDirty: false,
  pendingTargetTypes: new Set()
};

const ADMIN_VIEW_LABELS = {
  adminCatalogueView: "Katalog",
  brandsAdminView: "Brand",
  adminSalesView: "Penjualan",
  adminServiceView: "Service",
  adminReportsView: "Laporan",
  adminUsersView: "User",
  adminAuditView: "Aktivitas"
};

function getAdminLiveElements() {
  return {
    shell: document.getElementById("adminLiveShell"),
    toggle: document.getElementById("adminLiveToggle"),
    popover: document.getElementById("adminLivePopover"),
    onlineCount: document.getElementById("adminLiveOnlineCount"),
    connectionLabel: document.getElementById("adminLiveConnectionLabel"),
    presenceList: document.getElementById("adminPresenceList"),
    eventList: document.getElementById("adminLiveEventList"),
    badge: document.getElementById("adminLiveBadge"),
    refreshButton: document.getElementById("adminLiveRefreshBtn"),
    toastRegion: document.getElementById("adminLiveToastRegion")
  };
}

function getActiveAdminView() {
  const activeView = document.querySelector(".admin-view.is-active");
  return activeView?.id || "adminCatalogueView";
}

function getAdminEditingTarget() {
  const visibleModal = document.querySelector(
    ".admin-modal:not(.is-hidden), " +
    ".admin-invoice-modal:not(.is-hidden), " +
    ".admin-service-modal:not(.is-hidden), " +
    ".admin-bike-editor-modal:not(.is-hidden)"
  );

  if (visibleModal) {
    const title = visibleModal.querySelector("h2, h3")?.textContent?.trim();
    return title ? `Membuka ${title}` : "Membuka formulir";
  }

  const activeElement = document.activeElement;
  if (activeElement?.matches?.("input, select, textarea, [contenteditable='true']")) {
    return `Mengisi ${ADMIN_VIEW_LABELS[getActiveAdminView()] || "formulir"}`;
  }

  if (adminLiveState.formDirty) {
    return `Perubahan belum disimpan · ${ADMIN_VIEW_LABELS[getActiveAdminView()] || "Formulir"}`;
  }

  return "";
}

function isAdminLiveEditing() {
  return Boolean(getAdminEditingTarget());
}

function getAdminLivePresenceState() {
  const isIdle = Date.now() - adminLiveState.lastInteractionAt > ADMIN_LIVE_IDLE_MS;
  return document.visibilityState === "visible" && !isIdle ? "online" : "away";
}

function parseLiveDate(value) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLiveRelativeTime(value) {
  const date = parseLiveDate(value);
  if (!date) return "baru saja";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 15) return "baru saja";
  if (seconds < 60) return `${seconds} detik lalu`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  return `${Math.floor(minutes / 60)} jam lalu`;
}

function describeAdminLiveEvent(event) {
  const details = event.details || {};
  const label = event.targetLabel || "data";
  const descriptions = {
    stock_receive: () => {
      const color = details.colorName ? ` · ${details.colorName}` : "";
      return `menambahkan ${Number(details.quantityAdded || 0)} unit ${label}${color} ` +
        `(${Number(details.quantityBefore || 0)} → ${Number(details.quantityAfter || 0)})`;
    },
    bike_create: () => `menambahkan model ${label}`,
    bike_update: () => `memperbarui model ${label}`,
    bike_deactivate: () => `menonaktifkan model ${label}`,
    bike_reactivate: () => `mengaktifkan kembali model ${label}`,
    bike_hard_delete: () => `menghapus permanen model ${label}`,
    brand_create: () => `menambahkan brand ${label}`,
    brand_update: () => `memperbarui brand ${label}`,
    invoice_create: () => `membuat invoice ${label}`,
    invoice_edit: () => `memperbarui invoice ${label}`,
    invoice_void: () => `membatalkan invoice ${label}`,
    service_create: () => `membuat service ${label}`,
    service_update: () => `memperbarui service ${label}`,
    user_create: () => `menambahkan user ${label}`,
    user_update: () => `memperbarui user ${label}`,
    login_failed: () => `mengalami login gagal untuk ${label}`,
    login_locked: () => `memicu penguncian login ${label}`
  };
  return descriptions[event.action]?.() || `melakukan ${event.action} pada ${label}`;
}

function groupAdminPresence(presence) {
  const grouped = new Map();
  (presence || []).forEach((entry) => {
    const key = entry.userId || entry.username;
    const existing = grouped.get(key);
    const entryDate = parseLiveDate(entry.lastSeen)?.getTime() || 0;
    const existingDate = parseLiveDate(existing?.lastSeen)?.getTime() || 0;
    if (!existing || (existing.state === "away" && entry.state === "online") || entryDate > existingDate) {
      grouped.set(key, entry);
    }
  });
  return [...grouped.values()];
}

function renderAdminPresence(presence) {
  const elements = getAdminLiveElements();
  const users = groupAdminPresence(presence);
  const currentUser = getStoredAdminUser();
  const onlineUsers = users.filter((entry) => entry.state === "online");
  if (elements.onlineCount) elements.onlineCount.textContent = String(onlineUsers.length);
  if (!elements.presenceList) return;

  if (!users.length) {
    elements.presenceList.innerHTML = `<p class="admin-live-empty">Tidak ada pengguna aktif.</p>`;
    return;
  }

  elements.presenceList.innerHTML = users.map((entry) => {
    const isCurrentUser = entry.username === currentUser?.username;
    const view = ADMIN_VIEW_LABELS[entry.currentView] || entry.currentView || "Dashboard";
    const activity = entry.editingTarget || view;
    return `
      <article class="admin-presence-item is-${escapeHtml(entry.state)}">
        <span class="admin-presence-avatar" aria-hidden="true">
          ${escapeHtml(entry.username.slice(0, 1).toUpperCase())}
        </span>
        <div>
          <strong>${escapeHtml(entry.username)}${isCurrentUser ? " (Anda)" : ""}</strong>
          <small>${escapeHtml(activity)}</small>
        </div>
        <span class="admin-presence-state">${entry.state === "online" ? "Online" : "Away"}</span>
      </article>`;
  }).join("");
}

function renderAdminLiveEvents() {
  const { eventList } = getAdminLiveElements();
  if (!eventList) return;
  if (!adminLiveState.events.length) {
    eventList.innerHTML = `<p class="admin-live-empty">Belum ada aktivitas baru.</p>`;
    return;
  }
  eventList.innerHTML = adminLiveState.events.map((event) => `
    <article class="admin-live-event">
      <span class="admin-live-event-mark is-${escapeHtml(event.targetType)}"></span>
      <div>
        <p><strong>${escapeHtml(event.actorUsername)}</strong> ${escapeHtml(describeAdminLiveEvent(event))}</p>
        <small>${escapeHtml(formatLiveRelativeTime(event.createdAt))}</small>
      </div>
    </article>`).join("");
}

function updateAdminLiveBadge() {
  const { badge } = getAdminLiveElements();
  if (!badge) return;
  badge.textContent = adminLiveState.unreadCount > 9 ? "9+" : String(adminLiveState.unreadCount);
  badge.classList.toggle("is-hidden", adminLiveState.unreadCount === 0);
}

function showAdminLiveToast(events) {
  const { toastRegion } = getAdminLiveElements();
  const currentUser = getStoredAdminUser();
  const externalEvents = events.filter((event) => event.actorUsername !== currentUser?.username);
  if (!toastRegion || !externalEvents.length) return;

  const event = externalEvents.at(-1);
  const extraCount = externalEvents.length - 1;
  const toast = document.createElement("button");
  toast.type = "button";
  toast.className = "admin-live-toast";
  toast.innerHTML = `
    <span class="admin-live-dot" aria-hidden="true"></span>
    <span>
      <strong>${escapeHtml(event.actorUsername)}</strong>
      <small>${escapeHtml(describeAdminLiveEvent(event))}</small>
      ${extraCount > 0 ? `<em>+${extraCount} aktivitas lain</em>` : ""}
    </span>`;
  toast.addEventListener("click", () => {
    openAdminLivePopover();
    toast.remove();
  });
  toastRegion.replaceChildren(toast);
  window.setTimeout(() => toast.remove(), 7000);
}

function setAdminLiveConnection(state) {
  const { shell, connectionLabel } = getAdminLiveElements();
  if (!shell || !connectionLabel) return;
  shell.classList.remove("is-connected", "is-connecting", "is-offline");
  shell.classList.add(`is-${state}`);
  connectionLabel.textContent = {
    connected: "Terhubung",
    connecting: "Menghubungkan…",
    offline: "Koneksi terputus"
  }[state] || "Menghubungkan…";
}

function collectAdminLiveTargetTypes(events) {
  events.forEach((event) => {
    adminLiveState.pendingTargetTypes.add(event.targetType);
    if (event.targetType === "invoice") adminLiveState.pendingTargetTypes.add("bike");
  });
}

async function refreshActiveAdminViewFromLive(options = {}) {
  const { refreshButton } = getAdminLiveElements();
  if (!adminLiveState.pendingTargetTypes.size) {
    refreshButton?.classList.add("is-hidden");
    return;
  }
  if (isAdminLiveEditing() && !options.force) {
    refreshButton?.classList.remove("is-hidden");
    return;
  }

  const activeView = getActiveAdminView();
  const targets = adminLiveState.pendingTargetTypes;
  const tasks = [];
  if (activeView === "adminCatalogueView" && (targets.has("bike") || targets.has("brand")) && typeof loadAdminBikes === "function") tasks.push(loadAdminBikes());
  if (activeView === "brandsAdminView" && targets.has("brand") && typeof loadAdminBrandsPage === "function") tasks.push(loadAdminBrandsPage());
  if (activeView === "adminSalesView" && targets.has("invoice") && typeof loadInvoicePage === "function") tasks.push(loadInvoicePage());
  if (activeView === "adminServiceView" && targets.has("service") && typeof loadServicePage === "function") tasks.push(loadServicePage());
  if (activeView === "adminReportsView" && ["bike", "invoice", "service"].some((type) => targets.has(type)) && typeof loadReportsPage === "function") tasks.push(loadReportsPage());
  if (activeView === "adminUsersView" && targets.has("user")) {
    if (typeof loadAdminUsersPage === "function") tasks.push(loadAdminUsersPage());
    else if (typeof loadAdminUsers === "function") tasks.push(loadAdminUsers());
  }
  if (activeView === "adminAuditView" && typeof loadAuditLogs === "function") tasks.push(loadAuditLogs());

  await Promise.allSettled(tasks);
  adminLiveState.pendingTargetTypes.clear();
  refreshButton?.classList.add("is-hidden");
}

function handleAdminLiveEvents(events) {
  const currentUser = getStoredAdminUser();
  const externalEvents = events.filter(
    (event) => event.actorUsername !== currentUser?.username
  );

  if (!externalEvents.length) return;
  adminLiveState.events = [...externalEvents.slice().reverse(), ...adminLiveState.events]
    .slice(0, ADMIN_LIVE_MAX_VISIBLE_EVENTS);
  if (getAdminLiveElements().popover?.classList.contains("is-hidden")) {
    adminLiveState.unreadCount += externalEvents.length;
  }
  collectAdminLiveTargetTypes(externalEvents);
  renderAdminLiveEvents();
  updateAdminLiveBadge();
  showAdminLiveToast(externalEvents);
  refreshActiveAdminViewFromLive();
}

function renderInitialAdminLiveEvents(events) {
  if (adminLiveState.events.length || !events.length) return;
  adminLiveState.events = events.slice(0, ADMIN_LIVE_MAX_VISIBLE_EVENTS);
  renderAdminLiveEvents();
}

async function pollAdminLiveUpdates() {
  if (adminLiveState.requestInFlight || !getStoredAdminToken()) return;
  adminLiveState.requestInFlight = true;
  try {
    const data = await fetchAdminJson("/api/admin/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: adminLiveState.sessionId,
        state: getAdminLivePresenceState(),
        currentView: getActiveAdminView(),
        editingTarget: getAdminEditingTarget(),
        cursor: adminLiveState.cursor
      })
    });
    adminLiveState.cursor = data.cursor || adminLiveState.cursor;
    renderAdminPresence(data.presence || []);
    renderInitialAdminLiveEvents(data.recentEvents || []);
    handleAdminLiveEvents(data.events || []);
    setAdminLiveConnection("connected");
  } catch (error) {
    if (!handleAdminAuthError(error)) setAdminLiveConnection("offline");
  } finally {
    adminLiveState.requestInFlight = false;
  }
}

function scheduleAdminLivePoll() {
  window.clearInterval(adminLiveState.timer);
  adminLiveState.timer = null;
  if (!adminLiveState.started || document.visibilityState !== "visible") return;
  adminLiveState.timer = window.setInterval(pollAdminLiveUpdates, ADMIN_LIVE_INTERVAL_MS);
}

function openAdminLivePopover() {
  const { toggle, popover } = getAdminLiveElements();
  if (!toggle || !popover) return;
  popover.classList.remove("is-hidden");
  toggle.setAttribute("aria-expanded", "true");
  adminLiveState.unreadCount = 0;
  updateAdminLiveBadge();
}

function closeAdminLivePopover() {
  const { toggle, popover } = getAdminLiveElements();
  if (!toggle || !popover) return;
  popover.classList.add("is-hidden");
  toggle.setAttribute("aria-expanded", "false");
}

function setupAdminLiveInterface() {
  const elements = getAdminLiveElements();
  if (!elements.toggle || elements.toggle.dataset.adminLiveBound) return;
  elements.toggle.dataset.adminLiveBound = "true";
  elements.toggle.addEventListener("click", () => {
    if (elements.popover.classList.contains("is-hidden")) openAdminLivePopover();
    else closeAdminLivePopover();
  });
  elements.refreshButton?.addEventListener("click", () => {
    adminLiveState.formDirty = false;
    refreshActiveAdminViewFromLive({ force: true });
  });
  document.addEventListener("click", (event) => {
    if (!elements.shell.contains(event.target)) closeAdminLivePopover();
  });
  document.addEventListener("keydown", (event) => {
    adminLiveState.lastInteractionAt = Date.now();
    if (event.key === "Escape") closeAdminLivePopover();
  });
  ["pointerdown", "touchstart"].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      adminLiveState.lastInteractionAt = Date.now();
    }, { passive: true });
  });
  ["input", "change"].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      if (event.target.closest?.(".admin-dashboard form")) {
        adminLiveState.formDirty = true;
      }
    });
  });
  document.addEventListener("reset", () => {
    adminLiveState.formDirty = false;
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.("[data-admin-view-target]")) {
      adminLiveState.formDirty = false;
    }
  });
  document.addEventListener("focusout", () => {
    window.setTimeout(refreshActiveAdminViewFromLive, 0);
  });
  document.addEventListener("visibilitychange", () => {
    if (!adminLiveState.started) return;
    if (document.visibilityState === "visible") {
      adminLiveState.lastInteractionAt = Date.now();
      pollAdminLiveUpdates();
      scheduleAdminLivePoll();
    } else {
      window.clearInterval(adminLiveState.timer);
      adminLiveState.timer = null;
      pollAdminLiveUpdates();
    }
  });
}

function startAdminLiveUpdates() {
  if (!getStoredAdminToken()) return;
  setupAdminLiveInterface();
  adminLiveState.started = true;
  adminLiveState.lastInteractionAt = Date.now();
  setAdminLiveConnection("connecting");
  pollAdminLiveUpdates();
  scheduleAdminLivePoll();
}

function stopAdminLiveUpdates(options = {}) {
  adminLiveState.started = false;
  window.clearInterval(adminLiveState.timer);
  adminLiveState.timer = null;
  closeAdminLivePopover();
  if (options.removePresence && getStoredAdminToken()) {
    fetchAdminJson(`/api/admin/live?sessionId=${encodeURIComponent(adminLiveState.sessionId)}`, {
      method: "DELETE",
      keepalive: true
    }).catch(() => {});
  }
}
