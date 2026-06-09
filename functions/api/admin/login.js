import {
  createSessionToken,
  getPermissions,
  jsonResponse
} from "../../_shared/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
      return jsonResponse(
        { error: "Admin username/password secrets are missing" },
        500
      );
    }

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

    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    const isAdmin =
      username === env.ADMIN_USERNAME &&
      password === env.ADMIN_PASSWORD;

    if (!isAdmin) {
      return jsonResponse(
        { error: "Username atau password salah" },
        401
      );
    }

    const user = {
      username,
      role: "admin"
    };

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