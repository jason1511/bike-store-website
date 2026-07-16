import {
  getActiveAuthUserFromD1,
  getAuthUser,
  getPermissions,
  jsonResponse
} from "../../_shared/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const tokenUser = await getAuthUser(
      request,
      env
    );

    if (!tokenUser) {
      return jsonResponse(
        {
          error: "Unauthorized"
        },
        401
      );
    }

    const activeUser = await getActiveAuthUserFromD1(
      env,
      tokenUser
    );

    if (!activeUser) {
      return jsonResponse(
        {
          error: "Session admin tidak valid"
        },
        401
      );
    }

    return jsonResponse({
      success: true,
      username: activeUser.username,
      role: activeUser.role,
      permissions: getPermissions(activeUser.role)
    });
  } catch (error) {
    console.error(
      "Admin verify error:",
      error
    );

    return jsonResponse(
      {
        error: "Session verification failed"
      },
      500
    );
  }
}