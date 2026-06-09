import {
  getAuthUser,
  getPermissions,
  jsonResponse
} from "../../_shared/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);

    if (!user) {
      return jsonResponse(
        {
          success: false,
          error: "Session tidak valid atau sudah expired"
        },
        401
      );
    }

    return jsonResponse({
      success: true,
      username: user.username,
      role: user.role,
      permissions: getPermissions(user.role)
    });
  } catch (error) {
    console.error("Admin verify error:", error);

    return jsonResponse(
      { error: "Failed to verify session" },
      500
    );
  }
}