/* =========================
   ADMIN USER MANAGEMENT
========================= */
let adminUsersCache = [];

function setAdminUserFormNote(message, type = "") {
  const note = document.getElementById("adminUserFormNote");

  if (!note) return;

  note.textContent = message;
  note.classList.remove("is-error", "is-success");
  if (type) note.classList.add(type);
}

function setAdminUserListNote(message = "", type = "") {
  const note = document.getElementById("adminUserListNote");

  if (!note) return;

  note.textContent = message;
  note.classList.remove("is-error", "is-success");
  if (type) note.classList.add(type);
}

async function fetchAdminUsers() {
  const data = await fetchAdminJson("/api/admin/users", { method: "GET" });
  return data.users || [];
}

async function createAdminUser(userData) {
  const data = await fetchAdminJson("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData)
  });
  return data.user;
}

async function updateAdminUser(userData) {
  const data = await fetchAdminJson("/api/admin/users", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData)
  });
  return data.user;
}

function getNewAdminUserFormData() {
  return {
    username: document.getElementById("newUserUsernameInput")?.value.trim() || "",
    password: document.getElementById("newUserPasswordInput")?.value || "",
    role: document.getElementById("newUserRoleInput")?.value || "staff"
  };
}

function validateNewAdminUser(user) {
  const errors = [];

  if (user.username.length < 3) errors.push("Username minimal 3 karakter.");
  if (user.password.length < 8) errors.push("Password minimal 8 karakter.");
  if (!["admin", "staff"].includes(user.role)) errors.push("Role tidak valid.");

  return errors;
}

function getCurrentAdminUsername() {
  return String(getStoredAdminUser()?.username || "").trim().toLowerCase();
}

function renderAdminUserSummary(users) {
  const totals = users.reduce(
    (summary, user) => {
      summary.total += 1;
      if (!user.isActive) summary.inactive += 1;
      else if (user.role === "admin") summary.admin += 1;
      else if (user.role === "staff") summary.staff += 1;
      return summary;
    },
    { total: 0, admin: 0, staff: 0, inactive: 0 }
  );

  const values = {
    adminUserTotalCount: totals.total,
    adminUserAdminCount: totals.admin,
    adminUserStaffCount: totals.staff,
    adminUserInactiveCount: totals.inactive
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = Number(value).toLocaleString("id-ID");
  });
}

function getFilteredAdminUsers() {
  const query = String(document.getElementById("adminUserSearchInput")?.value || "")
    .trim()
    .toLowerCase();
  const role = document.getElementById("adminUserRoleFilter")?.value || "all";
  const status = document.getElementById("adminUserStatusFilter")?.value || "all";

  return adminUsersCache.filter((user) => {
    const matchesQuery = !query || String(user.username || "").toLowerCase().includes(query);
    const matchesRole = role === "all" || user.role === role;
    const matchesStatus =
      status === "all" ||
      (status === "active" && user.isActive) ||
      (status === "inactive" && !user.isActive);
    return matchesQuery && matchesRole && matchesStatus;
  });
}

function renderAdminUsers() {
  const userList = document.getElementById("adminUserList");
  const resultCount = document.getElementById("adminUserResultCount");
  const users = getFilteredAdminUsers();

  if (!userList) return;

  if (resultCount) {
    resultCount.textContent = adminUsersCache.length
      ? `Menampilkan ${users.length} dari ${adminUsersCache.length} user.`
      : "Belum ada user.";
  }

  if (!users.length) {
    userList.innerHTML = '<div class="admin-empty-state">Tidak ada user yang cocok dengan filter.</div>';
    return;
  }

  const currentUsername = getCurrentAdminUsername();

  userList.innerHTML = users.map((user) => {
    const isActive = Boolean(user.isActive);
    const role = user.role || "staff";
    const isCurrentUser = String(user.username || "").trim().toLowerCase() === currentUsername;

    return `
      <article class="admin-user-card" data-user-card="${escapeHtml(user.id)}">
        <div class="admin-user-card-main">
          <div class="admin-user-name-row">
            <h3>${escapeHtml(user.username)}</h3>
            ${isCurrentUser ? '<span class="admin-user-current-badge">Akun Anda</span>' : ""}
          </div>

          <div class="admin-user-meta">
            <span class="admin-user-role ${role === "admin" ? "is-admin" : "is-staff"}">${escapeHtml(role)}</span>
            <span class="admin-user-status ${isActive ? "is-active" : "is-inactive"}">${isActive ? "Aktif" : "Nonaktif"}</span>
            <span>Dibuat ${escapeHtml(formatAuditDate(user.createdAt || "-"))}</span>
            <span>Diperbarui ${escapeHtml(formatAuditDate(user.updatedAt || user.createdAt || "-"))}</span>
          </div>
        </div>

        <div class="admin-user-controls">
          <label>
            <span>Role</span>
            <select data-user-role-select="${escapeHtml(user.id)}" ${isCurrentUser ? "disabled" : ""}>
              <option value="staff" ${role === "staff" ? "selected" : ""}>Staff</option>
              <option value="admin" ${role === "admin" ? "selected" : ""}>Admin</option>
            </select>
          </label>

          <div class="admin-user-actions">
            <button type="button" class="admin-action-btn" data-save-user-role="${escapeHtml(user.id)}" ${isCurrentUser ? "disabled" : ""}>Simpan Role</button>
            <button type="button" class="admin-action-btn" data-show-password-reset="${escapeHtml(user.id)}">Reset Password</button>
            <button type="button" class="admin-action-btn ${isActive ? "admin-danger-btn" : "admin-success-btn"}" data-toggle-user-status="${escapeHtml(user.id)}" ${isCurrentUser ? "disabled" : ""}>
              ${isActive ? "Nonaktifkan" : "Aktifkan"}
            </button>
          </div>
        </div>

        <form class="admin-user-reset-form is-hidden" data-password-reset-form="${escapeHtml(user.id)}">
          <label>
            <span>Password baru untuk ${escapeHtml(user.username)}</span>
            <input type="password" data-user-new-password minlength="8" autocomplete="new-password" placeholder="Minimal 8 karakter" required>
          </label>
          <div class="admin-user-reset-actions">
            <button type="submit" class="admin-action-btn">Simpan Password</button>
            <button type="button" class="admin-action-btn" data-cancel-password-reset>Batal</button>
          </div>
        </form>
      </article>
    `;
  }).join("");
}

function getAdminUserById(id) {
  return adminUsersCache.find((user) => user.id === id) || null;
}

async function loadAdminUsers() {
  const userList = document.getElementById("adminUserList");
  if (!isCurrentUserAdmin()) return;

  if (userList) userList.innerHTML = '<div class="admin-empty-state">Memuat data user...</div>';
  setAdminUserListNote();

  try {
    adminUsersCache = await fetchAdminUsers();
    renderAdminUserSummary(adminUsersCache);
    renderAdminUsers();
  } catch (error) {
    if (handleAdminAuthError(error)) return;
    if (userList) userList.innerHTML = `<div class="admin-empty-state is-error">${escapeHtml(error.message)}</div>`;
  }
}

async function handleCreateAdminUserSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const createButton = document.getElementById("createUserBtn");

  if (form.dataset.isSubmitting === "true") return;

  const user = getNewAdminUserFormData();
  const errors = validateNewAdminUser(user);

  if (errors.length) {
    setAdminUserFormNote(errors.join(" "), "is-error");
    return;
  }

  form.dataset.isSubmitting = "true";
  if (createButton) {
    createButton.disabled = true;
    createButton.textContent = "Membuat...";
  }
  setAdminUserFormNote("Membuat user baru...");

  try {
    await createAdminUser(user);
    form.reset();
    setAdminUserFormNote("User berhasil dibuat.", "is-success");
    await loadAdminUsers();
    if (typeof loadAuditLogs === "function") loadAuditLogs();
  } catch (error) {
    if (!handleAdminAuthError(error)) setAdminUserFormNote(error.message || "Gagal membuat user.", "is-error");
  } finally {
    form.dataset.isSubmitting = "false";
    if (createButton) {
      createButton.disabled = false;
      createButton.textContent = "Tambah User";
    }
  }
}

async function handleSaveAdminUserRole(button) {
  const id = button.dataset.saveUserRole;
  const user = getAdminUserById(id);
  const roleSelect = document.querySelector(`[data-user-role-select="${CSS.escape(id || "")}"]`);
  const nextRole = roleSelect?.value || "";

  if (!user || !["admin", "staff"].includes(nextRole)) return;
  if (nextRole === user.role) {
    setAdminUserListNote("Tidak ada perubahan role untuk disimpan.");
    return;
  }
  if (!window.confirm(`Ubah role ${user.username} dari ${user.role} menjadi ${nextRole}?`)) {
    roleSelect.value = user.role;
    return;
  }

  button.disabled = true;
  setAdminUserListNote(`Mengubah role ${user.username}...`);
  try {
    await updateAdminUser({ id, role: nextRole, isActive: user.isActive });
    await loadAdminUsers();
    setAdminUserListNote("Role user berhasil diperbarui.", "is-success");
  } catch (error) {
    if (!handleAdminAuthError(error)) {
      roleSelect.value = user.role;
      button.disabled = false;
      setAdminUserListNote(error.message || "Gagal mengubah role user.", "is-error");
    }
  }
}

async function handleToggleAdminUserStatus(button) {
  const id = button.dataset.toggleUserStatus;
  const user = getAdminUserById(id);
  if (!user || button.disabled) return;

  const nextStatus = !user.isActive;
  const actionLabel = nextStatus ? "mengaktifkan" : "menonaktifkan";
  if (!window.confirm(`Yakin ingin ${actionLabel} akun ${user.username}?`)) return;

  button.disabled = true;
  setAdminUserListNote(`${nextStatus ? "Mengaktifkan" : "Menonaktifkan"} ${user.username}...`);
  try {
    await updateAdminUser({ id, role: user.role, isActive: nextStatus });
    await loadAdminUsers();
    setAdminUserListNote("Status user berhasil diperbarui.", "is-success");
  } catch (error) {
    if (!handleAdminAuthError(error)) {
      button.disabled = false;
      setAdminUserListNote(error.message || "Gagal mengubah status user.", "is-error");
    }
  }
}

async function handleAdminPasswordResetSubmit(form) {
  const id = form.dataset.passwordResetForm;
  const user = getAdminUserById(id);
  const passwordInput = form.querySelector("[data-user-new-password]");
  const password = passwordInput?.value || "";
  const submitButton = form.querySelector('button[type="submit"]');

  if (!user) return;
  if (password.length < 8) {
    setAdminUserListNote("Password baru minimal 8 karakter.", "is-error");
    passwordInput?.focus();
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Menyimpan...";
  }
  setAdminUserListNote(`Mengganti password ${user.username}...`);

  try {
    await updateAdminUser({ id, role: user.role, isActive: user.isActive, password });
    form.reset();
    form.classList.add("is-hidden");
    setAdminUserListNote("Password berhasil direset.", "is-success");
  } catch (error) {
    if (!handleAdminAuthError(error)) setAdminUserListNote(error.message || "Gagal mereset password.", "is-error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Simpan Password";
    }
  }
}

function setupAdminUserManagement() {
  const form = document.getElementById("adminUserForm");
  const refreshButton = document.getElementById("refreshUsersBtn");
  const userList = document.getElementById("adminUserList");
  const searchInput = document.getElementById("adminUserSearchInput");
  const roleFilter = document.getElementById("adminUserRoleFilter");
  const statusFilter = document.getElementById("adminUserStatusFilter");

  if (refreshButton && !refreshButton.dataset.adminUsersRefreshBound) {
    refreshButton.dataset.adminUsersRefreshBound = "true";
    refreshButton.addEventListener("click", loadAdminUsers);
  }
  if (form && !form.dataset.adminUsersFormBound) {
    form.dataset.adminUsersFormBound = "true";
    form.addEventListener("submit", handleCreateAdminUserSubmit);
  }

  [searchInput, roleFilter, statusFilter].forEach((control) => {
    if (!control || control.dataset.adminUsersFilterBound) return;
    control.dataset.adminUsersFilterBound = "true";
    control.addEventListener(control === searchInput ? "input" : "change", renderAdminUsers);
  });

  if (userList && !userList.dataset.adminUsersActionsBound) {
    userList.dataset.adminUsersActionsBound = "true";
    userList.addEventListener("click", (event) => {
      const saveRoleButton = event.target.closest("[data-save-user-role]");
      const toggleButton = event.target.closest("[data-toggle-user-status]");
      const showResetButton = event.target.closest("[data-show-password-reset]");
      const cancelResetButton = event.target.closest("[data-cancel-password-reset]");

      if (saveRoleButton) return handleSaveAdminUserRole(saveRoleButton);
      if (toggleButton) return handleToggleAdminUserStatus(toggleButton);
      if (showResetButton) {
        const resetForm = userList.querySelector(`[data-password-reset-form="${CSS.escape(showResetButton.dataset.showPasswordReset || "")}"]`);
        resetForm?.classList.remove("is-hidden");
        resetForm?.querySelector("[data-user-new-password]")?.focus();
        return;
      }
      if (cancelResetButton) {
        const resetForm = cancelResetButton.closest("[data-password-reset-form]");
        resetForm?.reset();
        resetForm?.classList.add("is-hidden");
      }
    });

    userList.addEventListener("submit", (event) => {
      const resetForm = event.target.closest("[data-password-reset-form]");
      if (!resetForm) return;
      event.preventDefault();
      handleAdminPasswordResetSubmit(resetForm);
    });
  }
}
