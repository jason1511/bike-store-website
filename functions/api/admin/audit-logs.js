import {
  jsonResponse,
  requireRole
} from "../../_shared/auth.js";

const CRITICAL_ACTION_SQL = `(
  action LIKE '%delete%'
  OR action LIKE '%void%'
  OR action LIKE '%deactivate%'
  OR action = 'login_locked'
  OR (
    action = 'user_update'
    AND (
      details LIKE '%"passwordChanged":true%'
      OR details LIKE '%"roleChanged":true%'
      OR details LIKE '%"deactivated":true%'
    )
  )
)`;

const WARNING_ACTION_SQL = `(
  action = 'login_failed'
  OR action = 'service_update'
  OR (
    action = 'bike_update'
    AND details LIKE '%"stockChanges":[{%'
  )
)`;

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

function getPositiveInteger(value, fallback) {
  const number = Number(value);

  return Number.isInteger(number) && number > 0
    ? number
    : fallback;
}

function isDateValue(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(value || "")
  );
}

function buildAuditFilters(url) {
  const conditions = [];
  const bindings = [];
  const search = String(
    url.searchParams.get("search") || ""
  ).trim().slice(0, 120);
  const moduleName = String(
    url.searchParams.get("module") || "all"
  ).trim().toLowerCase();
  const action = String(
    url.searchParams.get("action") || "all"
  ).trim();
  const actor = String(
    url.searchParams.get("actor") || "all"
  ).trim();
  const period = String(
    url.searchParams.get("period") || "30"
  ).trim().toLowerCase();
  const severity = String(
    url.searchParams.get("severity") || "all"
  ).trim().toLowerCase();
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (search) {
    const pattern = `%${search}%`;

    conditions.push(`(
      actor_username LIKE ?
      OR action LIKE ?
      OR target_label LIKE ?
      OR target_id LIKE ?
      OR details LIKE ?
    )`);
    bindings.push(
      pattern,
      pattern,
      pattern,
      pattern,
      pattern
    );
  }

  const moduleConditions = {
    catalog:
      "target_type IN ('bike', 'brand')",
    stock:
      "target_type = 'bike' AND details LIKE '%\"stockChanges\":[{%'",
    sales: "target_type = 'invoice'",
    service: "target_type = 'service'",
    user: "target_type = 'user'",
    security: "target_type = 'auth'"
  };

  if (moduleConditions[moduleName]) {
    conditions.push(
      `(${moduleConditions[moduleName]})`
    );
  }

  if (action && action !== "all") {
    conditions.push("action = ?");
    bindings.push(action);
  }

  if (actor && actor !== "all") {
    conditions.push("actor_username = ?");
    bindings.push(actor);
  }

  if (period === "today") {
    conditions.push(`
      date(datetime(created_at), '+7 hours') =
      date('now', '+7 hours')
    `);
  } else if (["7", "30"].includes(period)) {
    const days = Number(period) - 1;

    conditions.push(`
      date(datetime(created_at), '+7 hours') >=
      date('now', '+7 hours', '-${days} days')
    `);
  } else if (
    period === "custom" &&
    isDateValue(from) &&
    isDateValue(to)
  ) {
    conditions.push(`
      date(datetime(created_at), '+7 hours')
      BETWEEN date(?) AND date(?)
    `);
    bindings.push(from, to);
  }

  if (severity === "critical") {
    conditions.push(CRITICAL_ACTION_SQL);
  } else if (severity === "warning") {
    conditions.push(
      `(${WARNING_ACTION_SQL} AND NOT ${CRITICAL_ACTION_SQL})`
    );
  } else if (severity === "normal") {
    conditions.push(
      `(NOT ${CRITICAL_ACTION_SQL} AND NOT ${WARNING_ACTION_SQL})`
    );
  }

  return {
    whereSql: conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "",
    bindings
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(
      request,
      env,
      ["admin"]
    );

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse(
        { error: "D1 binding BIKE_DB is missing" },
        500
      );
    }

    const url = new URL(request.url);
    const page = getPositiveInteger(
      url.searchParams.get("page"),
      1
    );
    const limit = Math.min(
      getPositiveInteger(
        url.searchParams.get("limit"),
        25
      ),
      50
    );
    const { whereSql, bindings } =
      buildAuditFilters(url);

    const countResult = await env.BIKE_DB
      .prepare(`
        SELECT COUNT(*) AS total
        FROM audit_logs
        ${whereSql}
      `)
      .bind(...bindings)
      .first();
    const total = Number(countResult?.total || 0);
    const totalPages = Math.max(
      1,
      Math.ceil(total / limit)
    );
    const safePage = Math.min(page, totalPages);
    const safeOffset = (safePage - 1) * limit;

    const result = await env.BIKE_DB
      .prepare(`
        SELECT *
        FROM audit_logs
        ${whereSql}
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT ? OFFSET ?
      `)
      .bind(...bindings, limit, safeOffset)
      .all();

    const summary = await env.BIKE_DB
      .prepare(`
        SELECT
          COUNT(*) AS activity_today,
          SUM(
            CASE
              WHEN target_type = 'bike'
                AND details LIKE '%"stockChanges":[{%'
              THEN 1 ELSE 0
            END
          ) AS stock_changes_today,
          SUM(
            CASE WHEN ${CRITICAL_ACTION_SQL}
            THEN 1 ELSE 0 END
          ) AS critical_today,
          SUM(
            CASE
              WHEN action IN ('login_failed', 'login_locked')
              THEN 1 ELSE 0
            END
          ) AS failed_logins_today
        FROM audit_logs
        WHERE
          date(datetime(created_at), '+7 hours') =
          date('now', '+7 hours')
      `)
      .first();

    const actorResult = await env.BIKE_DB
      .prepare(`
        SELECT DISTINCT actor_username
        FROM audit_logs
        WHERE actor_username IS NOT NULL
          AND trim(actor_username) != ''
        ORDER BY actor_username COLLATE NOCASE ASC
      `)
      .all();

    const actionResult = await env.BIKE_DB
      .prepare(`
        SELECT DISTINCT action
        FROM audit_logs
        WHERE action IS NOT NULL
          AND trim(action) != ''
        ORDER BY action ASC
      `)
      .all();

    return jsonResponse({
      success: true,
      logs: (result.results || []).map(rowToAuditLog),
      summary: {
        activityToday: Number(
          summary?.activity_today || 0
        ),
        stockChangesToday: Number(
          summary?.stock_changes_today || 0
        ),
        criticalToday: Number(
          summary?.critical_today || 0
        ),
        failedLoginsToday: Number(
          summary?.failed_logins_today || 0
        )
      },
      actors: (actorResult.results || [])
        .map((row) => row.actor_username),
      actions: (actionResult.results || [])
        .map((row) => row.action),
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error("Audit logs GET error:", error);

    return jsonResponse(
      {
        error: "Failed to load audit logs",
        detail: error.message
      },
      500
    );
  }
}
