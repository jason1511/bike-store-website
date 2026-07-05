import {
  getAuthUser,
  getPermissions,
  jsonResponse
} from "../../_shared/auth.js";

async function getActiveAdminUserFromD1(env, tokenUser) {
  if (!env.BIKE_DB || !tokenUser?.id) {
    return null;
  }

  if (tokenUser.id === "secret_admin") {
    return {
      id: tokenUser.id,
      username: tokenUser.username,
      role: tokenUser.role
    };
  }

  const userRow = await env.BIKE_DB
    .prepare(`
      SELECT
        id,
        username,
        role,
        is_active
      FROM admin_users
      WHERE id = ?
      LIMIT 1
    `)
    .bind(tokenUser.id)
    .first();

  if (!userRow || !userRow.is_active) {
    return null;
  }

  if (!["admin", "staff"].includes(userRow.role)) {
    return null;
  }

  return {
    id: userRow.id,
    username: userRow.username,
    role: userRow.role
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const tokenUser = await getAuthUser(request, env);

    if (!tokenUser) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const activeUser = await getActiveAdminUserFromD1(env, tokenUser);

    if (!activeUser) {
      return jsonResponse({ error: "Session admin tidak valid" }, 401);
    }

    return jsonResponse({
      success: true,
      username: activeUser.username,
      role: activeUser.role,
      permissions: getPermissions(activeUser.role)
    });
  } catch (error) {
    console.error("Admin verify error:", error);

    return jsonResponse(
      { error: "Session verification failed" },
      500
    );
  }
}