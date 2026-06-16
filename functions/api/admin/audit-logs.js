import {
  jsonResponse,
  requireRole
} from "../../_shared/auth.js";

function rowToAuditLog(row) {
  let details = null;

  if (row.details) {
    try {
      details = JSON.parse(row.details);
    } catch (error) {
      details = row.details;
    }
  }

  return {
    id: row.id,
    actorId: row.actor_id,
    actorUsername: row.actor_username,
    actorRole: row.actor_role,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: row.target_label,
    details,
    createdAt: row.created_at
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);
    }

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);

    const result = await env.BIKE_DB
      .prepare(`
        SELECT *
        FROM audit_logs
        ORDER BY datetime(created_at) DESC
        LIMIT ?
      `)
      .bind(limit)
      .all();

    return jsonResponse({
      success: true,
      logs: (result.results || []).map(rowToAuditLog)
    });
  } catch (error) {
    console.error("Audit logs GET error:", error);

    return jsonResponse(
      { error: "Failed to load audit logs" },
      500
    );
  }
}