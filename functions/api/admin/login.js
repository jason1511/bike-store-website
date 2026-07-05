import {
  createSessionToken,
  getPermissions,
  jsonResponse,
  verifyPassword
} from "../../_shared/auth.js";

function normalizeUsername(username) {
  return String(username || "").trim();
}

function getClientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown"
  )
    .split(",")[0]
    .trim();
}

function createLoginAttemptId() {
  return `login_${Date.now()}_${crypto.randomUUID()}`;
}

async function countRecentFailedLogins(env, username, ipAddress) {
  if (!env.BIKE_DB) {
    return 0;
  }

  const result = await env.BIKE_DB
    .prepare(`
      SELECT COUNT(*) AS failed_count
      FROM login_attempts
      WHERE success = 0
        AND created_at >= datetime('now', '-15 minutes')
        AND (
          username = ?
          OR ip_address = ?
        )
    `)
    .bind(username, ipAddress)
    .first();

  return Number(result?.failed_count || 0);
}

async function recordLoginAttempt(env, username, ipAddress, success) {
  if (!env.BIKE_DB) {
    return;
  }

  await env.BIKE_DB
    .prepare(`
      INSERT INTO login_attempts (
        id,
        username,
        ip_address,
        success
      )
      VALUES (?, ?, ?, ?)
    `)
    .bind(
      createLoginAttemptId(),
      username || "unknown",
      ipAddress || "unknown",
      success ? 1 : 0
    )
    .run();
}

async function cleanupOldLoginAttempts(env) {
  if (!env.BIKE_DB) {
    return;
  }

  await env.BIKE_DB
    .prepare(`
      DELETE FROM login_attempts
      WHERE created_at < datetime('now', '-7 days')
    `)
    .run();
}

async function getUserFromD1(username, password, env) {
  if (!env.BIKE_DB) {
    return null;
  }

  const userRow = await env.BIKE_DB
    .prepare(`
      SELECT
        id,
        username,
        password_hash,
        role,
        is_active
      FROM admin_users
      WHERE username = ?
      LIMIT 1
    `)
    .bind(username)
    .first();

  if (!userRow || !userRow.is_active) {
    return null;
  }

  const isPasswordValid = await verifyPassword(
    password,
    userRow.password_hash,
    env
  );

  if (!isPasswordValid) {
    return null;
  }

  return {
    id: userRow.id,
    username: userRow.username,
    role: userRow.role
  };
}

function isFallbackAdminEnabled(env) {
  return String(env.ALLOW_FALLBACK_ADMIN || "").toLowerCase() === "true";
}

function getFallbackSecretAdmin(username, password, env) {
  if (!isFallbackAdminEnabled(env)) {
    return null;
  }

  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
    return null;
  }

  const isAdmin =
    username === env.ADMIN_USERNAME &&
    password === env.ADMIN_PASSWORD;

  if (!isAdmin) {
    return null;
  }

  return {
    id: "secret_admin",
    username,
    role: "admin"
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env.SESSION_SECRET) {
      return jsonResponse(
        { error: "SESSION_SECRET is missing" },
        500
      );
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return jsonResponse(
        { error: "Invalid login request" },
        400
      );
    }

    const username = normalizeUsername(body.username);
    const password = String(body.password || "");
    const ipAddress = getClientIp(request);

    try {
      await cleanupOldLoginAttempts(env);
    } catch (error) {
      console.error("Login attempt cleanup failed:", error);
    }

    let failedLoginCount = 0;

    try {
      failedLoginCount = await countRecentFailedLogins(
        env,
        username || "unknown",
        ipAddress
      );
    } catch (error) {
      console.error("Failed login count check failed:", error);
    }

    if (failedLoginCount >= 5) {
      await recordLoginAttempt(env, username || "unknown", ipAddress, false);

      return jsonResponse(
        {
          error: "Terlalu banyak percobaan login. Coba lagi dalam beberapa menit."
        },
        429
      );
    }

    if (!username || !password) {
      await recordLoginAttempt(
        env,
        username || "missing_username",
        ipAddress,
        false
      );

      return jsonResponse(
        { error: "Username dan password wajib diisi" },
        400
      );
    }

    const user =
      await getUserFromD1(username, password, env) ||
      getFallbackSecretAdmin(username, password, env);

    if (!user) {
      await recordLoginAttempt(env, username, ipAddress, false);

      return jsonResponse(
        { error: "Username atau password salah" },
        401
      );
    }

    const token = await createSessionToken(user, env);

    await recordLoginAttempt(env, username, ipAddress, true);

    return jsonResponse({
      success: true,
      token,
      role: user.role,
      username: user.username,
      permissions: getPermissions(user.role)
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return jsonResponse(
      { error: "Login failed" },
      500
    );
  }
}