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
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/users", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal memuat data user.");
  }

  return data.users || [];
}

function renderAdminUsers(users) {
  const userList = document.getElementById("adminUserList");

  if (!userList) {
    return;
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
    .map((user) => `
      <article class="admin-user-card">
        <div>
          <h3>${escapeHtml(user.username)}</h3>

          <div class="admin-user-meta">
            <span class="admin-user-role ${user.role === "admin" ? "is-admin" : "is-staff"}">
              ${escapeHtml(user.role)}
            </span>

            <span class="admin-user-status ${user.isActive ? "is-active" : "is-inactive"}">
              ${user.isActive ? "Aktif" : "Nonaktif"}
            </span>

            <span>
              Dibuat: ${escapeHtml(formatAuditDate(user.createdAt || "-"))}
            </span>
          </div>
        </div>

        <div class="admin-user-actions">
          <button
            type="button"
            class="admin-action-btn ${user.isActive ? "admin-danger-btn" : "admin-success-btn"}"
            data-toggle-user-status="${escapeHtml(user.id)}"
            data-user-active="${user.isActive ? "1" : "0"}"
            data-user-role="${escapeHtml(user.role)}"
          >
            ${user.isActive ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </div>
      </article>
    `)
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
    if (userList) {
      userList.innerHTML = `
        <div class="admin-empty-state is-error">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }
}

async function createAdminUser(userData) {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const apiErrors = Array.isArray(data?.errors)
      ? ` ${data.errors.join(" ")}`
      : "";

    throw new Error((data?.error || "Gagal membuat user.") + apiErrors);
  }

  return data.user;
}

async function updateAdminUser(userData) {
  const token = getStoredAdminToken();

  const response = await fetch("/api/admin/users", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Gagal mengubah user.");
  }

  return data.user;
}

function setupAdminUserManagement() {
  const form = document.getElementById("adminUserForm");
  const refreshButton = document.getElementById("refreshUsersBtn");
  const userList = document.getElementById("adminUserList");
  const createButton = document.getElementById("createUserBtn");

  if (refreshButton) {
    refreshButton.addEventListener("click", loadAdminUsers);
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const username = document.getElementById("newUserUsernameInput")?.value.trim() || "";
      const password = document.getElementById("newUserPasswordInput")?.value || "";
      const role = document.getElementById("newUserRoleInput")?.value || "staff";

      if (!username || !password) {
        setAdminUserFormNote("Username dan password wajib diisi.", "is-error");
        return;
      }

      if (createButton) {
        createButton.disabled = true;
        createButton.textContent = "Membuat...";
      }

      setAdminUserFormNote("Membuat user baru...");

      try {
        await createAdminUser({
          username,
          password,
          role
        });

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
        setAdminUserFormNote(error.message, "is-error");
      } finally {
        if (createButton) {
          createButton.disabled = false;
          createButton.textContent = "Tambah User";
        }
      }
    });
  }

  if (userList) {
    userList.addEventListener("click", async (event) => {
      const toggleButton = event.target.closest("[data-toggle-user-status]");

      if (!toggleButton) {
        return;
      }

      const id = toggleButton.dataset.toggleUserStatus;
      const role = toggleButton.dataset.userRole;
      const isActive = toggleButton.dataset.userActive === "1";
      const nextStatus = !isActive;

      const confirmed = window.confirm(
        `${nextStatus ? "Aktifkan" : "Nonaktifkan"} user ini?`
      );

      if (!confirmed) {
        return;
      }

      toggleButton.disabled = true;
      toggleButton.textContent = "Memproses...";

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
        window.alert(error.message);
        toggleButton.disabled = false;
        toggleButton.textContent = isActive ? "Nonaktifkan" : "Aktifkan";
      }
    });
  }
}