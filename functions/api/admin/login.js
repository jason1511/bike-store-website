import {
  createSessionToken,
  getPermissions,
  jsonResponse,
  verifyPassword,
  writeAuditLog
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

function maskIpAddress(ipAddress) {
  const value = String(ipAddress || "unknown");

  if (value.includes(".")) {
    const parts = value.split(".");

    return parts.length === 4
      ? `${parts.slice(0, 3).join(".")}.*`
      : "unknown";
  }

  if (value.includes(":")) {
    const groups = value.split(":")
      .filter(Boolean)
      .slice(0, 4)
      .join(":");

    return groups ? `${groups}::*` : "unknown";
  }

  return value === "unknown" ? value : "masked";
}

async function recordLoginAudit(
  env,
  user,
  action,
  details = {}
) {
  try {
    await writeAuditLog(
      env,
      user || {
        id: "",
        username:
          details.attemptedUsername || "unknown",
        role: "guest"
      },
      {
        action,
        targetType: "auth",
        targetId: "",
        targetLabel:
          details.attemptedUsername ||
          user?.username ||
          "unknown",
        details
      }
    );
  } catch (error) {
    console.error("Login audit write failed:", error);
  }
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
        AND username = ?
        AND ip_address = ?
    `)
    .bind(username, ipAddress)
    .first();

  return Number(result?.failed_count || 0);
}

async function clearFailedLoginAttempts(
  env,
  username,
  ipAddress
) {
  if (!env.BIKE_DB) {
    return;
  }

  await env.BIKE_DB
    .prepare(`
      DELETE FROM login_attempts
      WHERE success = 0
        AND username = ?
        AND ip_address = ?
    `)
    .bind(username, ipAddress)
    .run();
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
      await recordLoginAudit(
        env,
        null,
        "login_locked",
        {
          attemptedUsername: username || "unknown",
          reason: "too_many_attempts",
          failedAttempts: failedLoginCount,
          ipHint: maskIpAddress(ipAddress)
        }
      );

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

      await recordLoginAudit(
        env,
        null,
        "login_failed",
        {
          attemptedUsername:
            username || "missing_username",
          reason: "missing_credentials",
          ipHint: maskIpAddress(ipAddress)
        }
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

      await recordLoginAudit(
        env,
        null,
        "login_failed",
        {
          attemptedUsername: username,
          reason: "invalid_credentials",
          ipHint: maskIpAddress(ipAddress)
        }
      );

      return jsonResponse(
        { error: "Username atau password salah" },
        401
      );
    }

    const token = await createSessionToken(user, env);

    await clearFailedLoginAttempts(
      env,
      username,
      ipAddress
    );

    await recordLoginAttempt(env, username, ipAddress, true);

    await recordLoginAudit(
      env,
      user,
      "login_success",
      {
        attemptedUsername: username,
        ipHint: maskIpAddress(ipAddress)
      }
    );

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
