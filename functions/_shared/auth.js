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
const PASSWORD_HASH_VERSION = "pbkdf2";
const PASSWORD_HASH_ITERATIONS = 100000;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_HASH_BITS = 256;

function base64DecodeBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function constantTimeEqualBytes(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < a.length; index += 1) {
    diff |= a[index] ^ b[index];
  }

  return diff === 0;
}

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );

  return base64EncodeBytes(new Uint8Array(digest));
}

async function derivePbkdf2PasswordHash(password, salt, env, iterations = PASSWORD_HASH_ITERATIONS) {
  if (!env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is missing");
  }

  const passwordMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${env.SESSION_SECRET}:${password}`),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    passwordMaterial,
    PASSWORD_HASH_BITS
  );

  return new Uint8Array(derivedBits);
}

function createPasswordSalt() {
  const salt = new Uint8Array(PASSWORD_SALT_BYTES);
  crypto.getRandomValues(salt);
  return salt;
}

function isPbkdf2PasswordHash(passwordHash) {
  return String(passwordHash || "").startsWith(`${PASSWORD_HASH_VERSION}$`);
}

async function verifyLegacyPasswordHash(password, passwordHash, env) {
  const incomingHash = await sha256(`${env.SESSION_SECRET}:${password}`);
  return incomingHash === passwordHash;
}

export async function hashPassword(password, env) {
  const salt = createPasswordSalt();
  const hash = await derivePbkdf2PasswordHash(password, salt, env);

  return [
    PASSWORD_HASH_VERSION,
    PASSWORD_HASH_ITERATIONS,
    base64EncodeBytes(salt),
    base64EncodeBytes(hash)
  ].join("$");
}

export async function verifyPassword(password, passwordHash, env) {
  if (!passwordHash) {
    return false;
  }

  if (!isPbkdf2PasswordHash(passwordHash)) {
    return verifyLegacyPasswordHash(password, passwordHash, env);
  }

  const parts = String(passwordHash).split("$");

  if (parts.length !== 4) {
    return false;
  }

  const [, iterationsText, saltText, expectedHashText] = parts;
  const iterations = Number(iterationsText);

  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  try {
    const salt = base64DecodeBytes(saltText);
    const expectedHash = base64DecodeBytes(expectedHashText);
    const incomingHash = await derivePbkdf2PasswordHash(
      password,
      salt,
      env,
      iterations
    );

    return constantTimeEqualBytes(incomingHash, expectedHash);
  } catch (error) {
    return false;
  }
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

async function getActiveAuthUserFromD1(env, tokenUser) {
  if (!tokenUser) {
    return null;
  }

  if (tokenUser.id === "secret_admin") {
    const fallbackAdminAllowed =
      String(env.ALLOW_FALLBACK_ADMIN || "").toLowerCase() === "true";

    if (!fallbackAdminAllowed) {
      return null;
    }

    return {
      id: tokenUser.id,
      username: tokenUser.username,
      role: tokenUser.role
    };
  }

  if (!env.BIKE_DB || !tokenUser.id) {
    return null;
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

export async function requireRole(request, env, allowedRoles = []) {
  const tokenUser = await getAuthUser(request, env);
  const activeUser = await getActiveAuthUserFromD1(env, tokenUser);

  if (!activeUser || !allowedRoles.includes(activeUser.role)) {
    return {
      ok: false,
      user: null,
      response: jsonResponse({ error: "Unauthorized" }, 401)
    };
  }

  return {
    ok: true,
    user: activeUser,
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