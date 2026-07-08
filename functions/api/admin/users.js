import {
  hashPassword,
  jsonResponse,
  requireRole
} from "../../_shared/auth.js";

function createUserId() {
  return `user_${Date.now()}_${crypto.randomUUID()}`;
}

function normalizeUsername(username) {
  return String(username || "").trim();
}

function normalizeRole(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();

  if (["admin", "staff"].includes(normalizedRole)) {
    return normalizedRole;
  }

  return "";
}

function rowToUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createErrorResponse(error, fallbackMessage, status = 500) {
  return jsonResponse(
    {
      error: fallbackMessage,
      detail: error?.message || fallbackMessage
    },
    status
  );
}

async function getUserById(db, id) {
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
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();

  return row ? rowToUser(row) : null;
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
      WHERE lower(username) = lower(?)
      LIMIT 1
    `)
    .bind(username)
    .first();

  return row ? rowToUser(row) : null;
}

function validateCreateUserPayload({ username, password, role }) {
  const errors = [];

  if (!username) {
    errors.push("Username wajib diisi.");
  }

  if (username && username.length < 3) {
    errors.push("Username minimal 3 karakter.");
  }

  if (!password) {
    errors.push("Password wajib diisi.");
  }

  if (password && password.length < 8) {
    errors.push("Password minimal 8 karakter.");
  }

  if (!role) {
    errors.push("Role harus admin atau staff.");
  }

  return errors;
}

function validateUpdateUserPayload({ id, role, password }) {
  const errors = [];

  if (!id) {
    errors.push("User ID wajib diisi.");
  }

  if (!role) {
    errors.push("Role harus admin atau staff.");
  }

  if (password && password.length < 8) {
    errors.push("Password minimal 8 karakter.");
  }

  return errors;
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
        ORDER BY datetime(created_at) DESC, username ASC
      `)
      .all();

    return jsonResponse({
      success: true,
      users: (result.results || []).map(rowToUser)
    });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return createErrorResponse(error, "Failed to load users");
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

    const username = normalizeUsername(payload.username);
    const password = String(payload.password || "");
    const role = normalizeRole(payload.role);

    const errors = validateCreateUserPayload({
      username,
      password,
      role
    });

    if (errors.length) {
      return jsonResponse(
        {
          error: "Invalid user data",
          errors
        },
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

    const userId = createUserId();
    const passwordHash = await hashPassword(password, env);

    await env.BIKE_DB
      .prepare(`
        INSERT INTO admin_users (
          id,
          username,
          password_hash,
          role,
          is_active,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
      user: await getUserById(env.BIKE_DB, userId)
    });
  } catch (error) {
    console.error("Admin users POST error:", error);
    return createErrorResponse(error, "Failed to create user");
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
    const password = String(payload.password || "");
    const isActive = payload.isActive ? 1 : 0;

    const errors = validateUpdateUserPayload({
      id,
      role,
      password
    });

    if (errors.length) {
      return jsonResponse(
        {
          error: "Invalid user data",
          errors
        },
        400
      );
    }

    const existingUser = await env.BIKE_DB
      .prepare(`
        SELECT id
        FROM admin_users
        WHERE id = ?
        LIMIT 1
      `)
      .bind(id)
      .first();

    if (!existingUser) {
      return jsonResponse({ error: "User tidak ditemukan." }, 404);
    }

    if (password) {
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

    return jsonResponse({
      success: true,
      user: await getUserById(env.BIKE_DB, id)
    });
  } catch (error) {
    console.error("Admin users PUT error:", error);
    return createErrorResponse(error, "Failed to update user");
  }
}