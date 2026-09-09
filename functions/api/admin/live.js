import {
  jsonResponse,
  requireRole
} from "../../_shared/auth.js";

const ACTIVE_WINDOW_SECONDS = 90;
const MAX_EVENTS = 20;
let presenceSchemaReady = false;
let lastPresenceCleanupAt = 0;

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function parseDetails(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function rowToEvent(row) {
  return {
    id: row.id,
    actorUsername: row.actor_username,
    actorRole: row.actor_role,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: row.target_label,
    details: parseDetails(row.details),
    createdAt: row.created_at
  };
}

function rowToPresence(row) {
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    username: row.username,
    role: row.role,
    currentView: row.current_view,
    editingTarget: row.editing_target,
    state: row.state,
    lastSeen: row.last_seen
  };
}

async function ensurePresenceTable(database) {
  if (presenceSchemaReady) return;

  await database.batch([
    database.prepare(`
      CREATE TABLE IF NOT EXISTS admin_presence (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        current_view TEXT NOT NULL DEFAULT '',
        editing_target TEXT NOT NULL DEFAULT '',
        state TEXT NOT NULL DEFAULT 'online',
        last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    database.prepare(`
      CREATE INDEX IF NOT EXISTS idx_admin_presence_last_seen
      ON admin_presence(last_seen)
    `),
    database.prepare(`
      CREATE INDEX IF NOT EXISTS idx_admin_presence_user
      ON admin_presence(user_id, last_seen)
    `)
  ]);

  presenceSchemaReady = true;
}

async function cleanupOldPresence(database) {
  const now = Date.now();
  if (now - lastPresenceCleanupAt < 60 * 60 * 1000) return;

  lastPresenceCleanupAt = now;
  await database.prepare(`
    DELETE FROM admin_presence
    WHERE last_seen < datetime('now', '-1 day')
  `).run();
}

function getEventScope(role, hasCursor) {
  const conditions = [];
  const bindings = [];

  if (role !== "admin") {
    conditions.push(
      "target_type IN ('bike', 'brand', 'invoice', 'service')"
    );
  }

  if (hasCursor) {
    conditions.push(
      "(created_at > ? OR (created_at = ? AND id > ?))"
    );
  }

  return {
    whereSql: conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "",
    bindings
  };
}

async function getLatestCursor(database, role) {
  const { whereSql } = getEventScope(role, false);
  const row = await database.prepare(`
    SELECT id, created_at
    FROM audit_logs
    ${whereSql}
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).first();

  return row
    ? { createdAt: row.created_at, id: row.id }
    : null;
}

async function getRecentEvents(database, role) {
  const { whereSql } = getEventScope(role, false);
  const result = await database.prepare(`
    SELECT
      id,
      actor_username,
      actor_role,
      action,
      target_type,
      target_id,
      target_label,
      details,
      created_at
    FROM audit_logs
    ${whereSql}
    ORDER BY created_at DESC, id DESC
    LIMIT 8
  `).all();

  return (result.results || []).map(rowToEvent);
}

async function getNewEvents(database, role, cursor) {
  if (!cursor?.createdAt || !cursor?.id) {
    const [latestCursor, recentEvents] = await Promise.all([
      getLatestCursor(database, role),
      getRecentEvents(database, role)
    ]);

    return {
      events: [],
      recentEvents,
      cursor: latestCursor
    };
  }

  const { whereSql } = getEventScope(role, true);
  const result = await database.prepare(`
    SELECT
      id,
      actor_username,
      actor_role,
      action,
      target_type,
      target_id,
      target_label,
      details,
      created_at
    FROM audit_logs
    ${whereSql}
    ORDER BY created_at ASC, id ASC
    LIMIT ${MAX_EVENTS}
  `)
    .bind(cursor.createdAt, cursor.createdAt, cursor.id)
    .all();

  const events = (result.results || []).map(rowToEvent);
  const lastEvent = events.at(-1);

  return {
    events,
    recentEvents: [],
    cursor: lastEvent
      ? { createdAt: lastEvent.createdAt, id: lastEvent.id }
      : cursor
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(
      request,
      env,
      ["admin", "staff"]
    );

    if (!auth.ok) return auth.response;

    if (!env.BIKE_DB) {
      return jsonResponse(
        { error: "D1 binding BIKE_DB is missing" },
        500
      );
    }

    const payload = await request.json().catch(() => ({}));
    const sessionId = cleanText(payload.sessionId, 120);

    if (!sessionId) {
      return jsonResponse(
        { error: "Session presence tidak valid." },
        400
      );
    }

    await ensurePresenceTable(env.BIKE_DB);
    await cleanupOldPresence(env.BIKE_DB);

    const state = payload.state === "away" ? "away" : "online";
    const currentView = cleanText(payload.currentView, 80);
    const editingTarget = cleanText(payload.editingTarget, 160);

    await env.BIKE_DB.prepare(`
      INSERT INTO admin_presence (
        session_id,
        user_id,
        username,
        role,
        current_view,
        editing_target,
        state,
        last_seen
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(session_id) DO UPDATE SET
        user_id = excluded.user_id,
        username = excluded.username,
        role = excluded.role,
        current_view = excluded.current_view,
        editing_target = excluded.editing_target,
        state = excluded.state,
        last_seen = CURRENT_TIMESTAMP
    `)
      .bind(
        sessionId,
        auth.user.id || "",
        auth.user.username,
        auth.user.role,
        currentView,
        editingTarget,
        state
      )
      .run();

    const [presenceResult, eventResult] = await Promise.all([
      env.BIKE_DB.prepare(`
        SELECT
          session_id,
          user_id,
          username,
          role,
          current_view,
          editing_target,
          state,
          last_seen
        FROM admin_presence
        WHERE last_seen >= datetime(
          'now',
          '-${ACTIVE_WINDOW_SECONDS} seconds'
        )
        ORDER BY
          CASE state WHEN 'online' THEN 0 ELSE 1 END,
          last_seen DESC
      `).all(),
      getNewEvents(env.BIKE_DB, auth.user.role, payload.cursor)
    ]);

    return jsonResponse({
      success: true,
      intervalSeconds: 10,
      activeWindowSeconds: ACTIVE_WINDOW_SECONDS,
      serverTime: new Date().toISOString(),
      presence: (presenceResult.results || []).map(rowToPresence),
      events: eventResult.events,
      recentEvents: eventResult.recentEvents || [],
      cursor: eventResult.cursor
    });
  } catch (error) {
    console.error("Admin live POST error:", error);
    return jsonResponse(
      { error: "Gagal memeriksa aktivitas langsung." },
      500
    );
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(
      request,
      env,
      ["admin", "staff"]
    );

    if (!auth.ok) return auth.response;
    if (!env.BIKE_DB) return jsonResponse({ success: true });

    const url = new URL(request.url);
    const sessionId = cleanText(
      url.searchParams.get("sessionId"),
      120
    );

    if (sessionId) {
      await ensurePresenceTable(env.BIKE_DB);
      await env.BIKE_DB.prepare(`
        DELETE FROM admin_presence
        WHERE session_id = ? AND user_id = ?
      `)
        .bind(sessionId, auth.user.id || "")
        .run();
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Admin live DELETE error:", error);
    return jsonResponse({ success: true });
  }
}
