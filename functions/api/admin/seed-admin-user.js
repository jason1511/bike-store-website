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

    if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
      return jsonResponse(
        { error: "ADMIN_USERNAME or ADMIN_PASSWORD secret is missing" },
        500
      );
    }

    const username = env.ADMIN_USERNAME.trim();
    const passwordHash = await hashPassword(env.ADMIN_PASSWORD, env);

    await env.BIKE_DB
      .prepare(`
        INSERT OR IGNORE INTO admin_users (
          id,
          username,
          password_hash,
          role,
          is_active
        )
        VALUES (?, ?, ?, 'admin', 1)
      `)
      .bind(
        createUserId(username),
        username,
        passwordHash
      )
      .run();

    return jsonResponse({
      success: true,
      username,
      role: "admin"
    });
  } catch (error) {
    console.error("Seed admin user error:", error);

    return jsonResponse(
      { error: "Failed to seed admin user" },
      500
    );
  }
}