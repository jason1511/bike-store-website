/* =========================
   ADMIN USER MANAGEMENT
========================= */
function setAdminUserFormNote(message, type = "") {
  const note = document.getElementById("adminUserFormNote");

  if (!note) {
    return;
  }

  note.textContent = message;
  note.classList.remove("is-error", "is-success");

  if (type) {
    note.classList.add(type);
  }
}

async function fetchAdminUsers() {
  const data = await fetchAdminJson("/api/admin/users", {
    method: "GET"
  });

  return data.users || [];
}

async function createAdminUser(userData) {
  const data = await fetchAdminJson("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(userData)
  });

  return data.user;
}

async function updateAdminUser(userData) {
  const data = await fetchAdminJson("/api/admin/users", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
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

  if (!user.username) {
    errors.push("Username wajib diisi.");
  }

  if (!user.password) {
    errors.push("Password wajib diisi.");
  }

  if (!["admin", "staff"].includes(user.role)) {
    errors.push("Role tidak valid.");
  }

  return errors;
}

function renderAdminUsers(users) {
  const userList = document.getElementById("adminUserList");
  const resultCount = document.getElementById("adminUserResultCount");

  if (!userList) {
    return;
  }

  if (resultCount) {
    resultCount.textContent = users.length
      ? `Menampilkan ${users.length} user.`
      : "Belum ada user.";
  }

  if (!users.length) {
    userList.innerHTML = `
      <div class="admin-empty-state">
        Belum ada user.
      </div>
    `;
    return;
  }

  userList.innerHTML = users
    .map((user) => {
      const isActive = Boolean(user.isActive);
      const role = user.role || "staff";

      return `
        <article class="admin-user-card">
          <div class="admin-user-card-main">
            <h3>${escapeHtml(user.username)}</h3>

            <div class="admin-user-meta">
              <span class="admin-user-role ${role === "admin" ? "is-admin" : "is-staff"}">
                ${escapeHtml(role)}
              </span>

              <span class="admin-user-status ${isActive ? "is-active" : "is-inactive"}">
                ${isActive ? "Aktif" : "Nonaktif"}
              </span>

              <span>
                Dibuat: ${escapeHtml(formatAuditDate(user.createdAt || "-"))}
              </span>
            </div>
          </div>

          <div class="admin-user-actions">
            <button
              type="button"
              class="admin-action-btn ${isActive ? "admin-danger-btn" : "admin-success-btn"}"
              data-toggle-user-status="${escapeHtml(user.id)}"
              data-user-active="${isActive ? "1" : "0"}"
              data-user-role="${escapeHtml(role)}"
            >
              ${isActive ? "Nonaktifkan" : "Aktifkan"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadAdminUsers() {
  const userList = document.getElementById("adminUserList");

  if (!isCurrentUserAdmin()) {
    return;
  }

  if (userList) {
    userList.innerHTML = `
      <div class="admin-empty-state">
        Memuat data user...
      </div>
    `;
  }

  try {
    const users = await fetchAdminUsers();
    renderAdminUsers(users);
  } catch (error) {
    if (handleAdminAuthError(error)) {
      return;
    }

    if (userList) {
      userList.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }
}

async function handleCreateAdminUserSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const createButton = document.getElementById("createUserBtn");

  if (form.dataset.isSubmitting === "true") {
    return;
  }

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

    const roleInput = document.getElementById("newUserRoleInput");

    if (roleInput) {
      roleInput.value = "staff";
    }

    setAdminUserFormNote("User berhasil dibuat.", "is-success");
    await loadAdminUsers();

    if (typeof loadAuditLogs === "function") {
      loadAuditLogs();
    }
  } catch (error) {
    if (handleAdminAuthError(error)) {
      return;
    }

    setAdminUserFormNote(error.message || "Gagal membuat user.", "is-error");
  } finally {
    form.dataset.isSubmitting = "false";

    if (createButton) {
      createButton.disabled = false;
      createButton.textContent = "Tambah User";
    }
  }
}

async function handleToggleAdminUserStatus(toggleButton) {
  const id = toggleButton.dataset.toggleUserStatus;
  const role = toggleButton.dataset.userRole || "staff";
  const isActive = toggleButton.dataset.userActive === "1";
  const nextStatus = !isActive;

  if (!id || toggleButton.disabled) {
    return;
  }

  toggleButton.disabled = true;
  toggleButton.textContent = nextStatus ? "Mengaktifkan..." : "Menonaktifkan...";

  try {
    await updateAdminUser({
      id,
      role,
      isActive: nextStatus
    });

    await loadAdminUsers();

    if (typeof loadAuditLogs === "function") {
      loadAuditLogs();
    }
  } catch (error) {
    if (handleAdminAuthError(error)) {
      return;
    }

    setAdminUserFormNote(error.message || "Gagal mengubah status user.", "is-error");

    toggleButton.disabled = false;
    toggleButton.textContent = isActive ? "Nonaktifkan" : "Aktifkan";
  }
}

function setupAdminUserManagement() {
  const form = document.getElementById("adminUserForm");
  const refreshButton = document.getElementById("refreshUsersBtn");
  const userList = document.getElementById("adminUserList");

  if (refreshButton && !refreshButton.dataset.adminUsersRefreshBound) {
    refreshButton.dataset.adminUsersRefreshBound = "true";
    refreshButton.addEventListener("click", loadAdminUsers);
  }

  if (form && !form.dataset.adminUsersFormBound) {
    form.dataset.adminUsersFormBound = "true";
    form.addEventListener("submit", handleCreateAdminUserSubmit);
  }

  if (userList && !userList.dataset.adminUsersActionsBound) {
    userList.dataset.adminUsersActionsBound = "true";

    userList.addEventListener("click", (event) => {
      const toggleButton = event.target.closest("[data-toggle-user-status]");

      if (!toggleButton) {
        return;
      }

      handleToggleAdminUserStatus(toggleButton);
    });
  }
}