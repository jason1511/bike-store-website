function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function getBearerToken(request) {
  const authHeader = request.headers.get("Authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.replace("Bearer ", "").trim();
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const token = getBearerToken(request);

    if (!env.ADMIN_TOKEN) {
      return jsonResponse(
        { error: "Admin token is not configured" },
        500
      );
    }

    if (!token || token !== env.ADMIN_TOKEN) {
      return jsonResponse(
        { error: "Invalid admin token" },
        401
      );
    }

    return jsonResponse({
      success: true,
      message: "Admin verified"
    });
  } catch (error) {
    console.error("Admin verification error:", error);

    return jsonResponse(
      { error: "Admin verification failed" },
      500
    );
  }
}