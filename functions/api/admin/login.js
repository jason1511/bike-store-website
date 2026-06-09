import {
  createSessionToken,
  getPermissions,
  jsonResponse,
  verifyPassword
} from "../../_shared/auth.js";

function normalizeUsername(username) {
  return String(username || "").trim();
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

function getFallbackSecretAdmin(username, password, env) {
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

    if (!username || !password) {
      return jsonResponse(
        { error: "Username dan password wajib diisi" },
        400
      );
    }

    const user =
      await getUserFromD1(username, password, env) ||
      getFallbackSecretAdmin(username, password, env);

    if (!user) {
      return jsonResponse(
        { error: "Username atau password salah" },
        401
      );
    }

    const token = await createSessionToken(user, env);

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