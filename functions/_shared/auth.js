const SESSION_DURATION_SECONDS = 60 * 60 * 8;

/* =========================
   BASE64 URL HELPERS
========================= */
function base64UrlEncode(value) {
  const bytes = value instanceof Uint8Array
    ? value
    : new TextEncoder().encode(String(value));

  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(value) {
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new TextDecoder().decode(bytes);
}

function base64EncodeBytes(bytes) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

/* =========================
   RESPONSE HELPERS
========================= */
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

/* =========================
   PASSWORD HELPERS
========================= */
async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );

  return base64EncodeBytes(new Uint8Array(digest));
}

export async function hashPassword(password, env) {
  if (!env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is missing");
  }

  return sha256(`${env.SESSION_SECRET}:${password}`);
}

export async function verifyPassword(password, passwordHash, env) {
  const incomingHash = await hashPassword(password, env);
  return incomingHash === passwordHash;
}

/* =========================
   SESSION TOKEN HELPERS
========================= */
async function createHmacSignature(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  return base64UrlEncode(new Uint8Array(signature));
}

function getBearerToken(request) {
  const authHeader = request.headers.get("Authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.replace("Bearer ", "").trim();
}

export function getPermissions(role) {
  return {
    canManageCatalogue: role === "admin" || role === "staff",
    canUploadImages: role === "admin" || role === "staff",
    canDeactivate: role === "admin" || role === "staff",
    canReactivate: role === "admin" || role === "staff",
    canHardDelete: role === "admin",
    canSeedDatabase: role === "admin",
    canManageUsers: role === "admin"
  };
}

export async function createSessionToken(user, env) {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    id: user.id || "",
    username: user.username,
    role: user.role,
    iat: now,
    exp: now + SESSION_DURATION_SECONDS
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await createHmacSignature(encodedPayload, env.SESSION_SECRET);

  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(token, env) {
  if (!token || !env.SESSION_SECRET || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = await createHmacSignature(encodedPayload, env.SESSION_SECRET);

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (!payload.exp || payload.exp < now) {
      return null;
    }

    if (!["admin", "staff"].includes(payload.role)) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

export async function getAuthUser(request, env) {
  const token = getBearerToken(request);
  return verifySessionToken(token, env);
}

export async function requireRole(request, env, allowedRoles = []) {
  const user = await getAuthUser(request, env);

  if (!user || !allowedRoles.includes(user.role)) {
    return {
      ok: false,
      user: null,
      response: jsonResponse({ error: "Unauthorized" }, 401)
    };
  }

  return {
    ok: true,
    user,
    response: null
  };
}
export function createAuditId() {
  return `audit_${Date.now()}_${crypto.randomUUID()}`;
}

export async function writeAuditLog(env, user, entry) {
  if (!env.BIKE_DB || !user) {
    return;
  }

  await env.BIKE_DB
    .prepare(`
      INSERT INTO audit_logs (
        id,
        actor_id,
        actor_username,
        actor_role,
        action,
        target_type,
        target_id,
        target_label,
        details
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      createAuditId(),
      user.id || "",
      user.username || "unknown",
      user.role || "unknown",
      entry.action || "unknown",
      entry.targetType || "unknown",
      entry.targetId || "",
      entry.targetLabel || "",
      entry.details ? JSON.stringify(entry.details) : ""
    )
    .run();
}