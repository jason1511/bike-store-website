import {
  hashPassword,
  jsonResponse,
  requireRole
} from "../../_shared/auth.js";

function createUserId(username) {
  return `user_${String(username || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")}`;
}

function normalizeRole(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();

  if (["admin", "staff"].includes(normalizedRole)) {
    return normalizedRole;
  }

  return "";
}

function rowToUser(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getUserByUsername(db, username) {
  const row = await db
    .prepare(`
      SELECT
        id,
        username,
        role,
        is_active,
        created_at,
        updated_at
      FROM admin_users
      WHERE username = ?
      LIMIT 1
    `)
    .bind(username)
    .first();

  return row ? rowToUser(row) : null;
}

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);
    }

    const result = await env.BIKE_DB
      .prepare(`
        SELECT
          id,
          username,
          role,
          is_active,
          created_at,
          updated_at
        FROM admin_users
        ORDER BY created_at DESC
      `)
      .all();

    return jsonResponse({
      success: true,
      users: (result.results || []).map(rowToUser)
    });
  } catch (error) {
    console.error("Admin users GET error:", error);

    return jsonResponse(
      { error: "Failed to load users" },
      500
    );
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);
    }

    const payload = await request.json().catch(() => null);

    if (!payload) {
      return jsonResponse({ error: "Invalid user data" }, 400);
    }

    const username = String(payload.username || "").trim();
    const password = String(payload.password || "");
    const role = normalizeRole(payload.role);

    const errors = [];

    if (!username) errors.push("Username wajib diisi.");
    if (username.length < 3) errors.push("Username minimal 3 karakter.");
    if (!password) errors.push("Password wajib diisi.");
    if (password.length < 8) errors.push("Password minimal 8 karakter.");
    if (!role) errors.push("Role harus admin atau staff.");

    if (errors.length) {
      return jsonResponse(
        { error: "Invalid user data", errors },
        400
      );
    }

    const existingUser = await getUserByUsername(env.BIKE_DB, username);

    if (existingUser) {
      return jsonResponse(
        { error: "Username sudah digunakan." },
        409
      );
    }

    const userId = createUserId(username);
    const passwordHash = await hashPassword(password, env);

    await env.BIKE_DB
      .prepare(`
        INSERT INTO admin_users (
          id,
          username,
          password_hash,
          role,
          is_active
        )
        VALUES (?, ?, ?, ?, 1)
      `)
      .bind(
        userId,
        username,
        passwordHash,
        role
      )
      .run();

    return jsonResponse({
      success: true,
      user: await getUserByUsername(env.BIKE_DB, username)
    });
  } catch (error) {
    console.error("Admin users POST error:", error);

    return jsonResponse(
      { error: "Failed to create user" },
      500
    );
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);
    }

    const payload = await request.json().catch(() => null);

    if (!payload) {
      return jsonResponse({ error: "Invalid user data" }, 400);
    }

    const id = String(payload.id || "").trim();
    const role = normalizeRole(payload.role);
    const isActive = payload.isActive ? 1 : 0;
    const password = String(payload.password || "");

    if (!id) {
      return jsonResponse({ error: "User ID wajib diisi." }, 400);
    }

    const existingUser = await env.BIKE_DB
      .prepare("SELECT * FROM admin_users WHERE id = ? LIMIT 1")
      .bind(id)
      .first();

    if (!existingUser) {
      return jsonResponse({ error: "User tidak ditemukan." }, 404);
    }

    if (!role) {
      return jsonResponse({ error: "Role harus admin atau staff." }, 400);
    }

    if (password) {
      if (password.length < 8) {
        return jsonResponse({ error: "Password minimal 8 karakter." }, 400);
      }

      const passwordHash = await hashPassword(password, env);

      await env.BIKE_DB
        .prepare(`
          UPDATE admin_users
          SET
            password_hash = ?,
            role = ?,
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(passwordHash, role, isActive, id)
        .run();
    } else {
      await env.BIKE_DB
        .prepare(`
          UPDATE admin_users
          SET
            role = ?,
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(role, isActive, id)
        .run();
    }

    const updatedUser = await env.BIKE_DB
      .prepare(`
        SELECT
          id,
          username,
          role,
          is_active,
          created_at,
          updated_at
        FROM admin_users
        WHERE id = ?
        LIMIT 1
      `)
      .bind(id)
      .first();

    return jsonResponse({
      success: true,
      user: rowToUser(updatedUser)
    });
  } catch (error) {
    console.error("Admin users PUT error:", error);

    return jsonResponse(
      { error: "Failed to update user" },
      500
    );
  }
}