import {
  jsonResponse,
  requireRole,
  writeAuditLog
} from "../../_shared/auth.js";

function createServiceId() {
  return `service_${Date.now()}_${crypto.randomUUID()}`;
}

function createServiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const shortId = crypto.randomUUID().slice(0, 8).toUpperCase();

  return `SRV-${year}${month}${day}-${shortId}`;
}

function normalizeServicePayload(payload) {
  return {
    customerName: String(payload.customerName || "").trim(),
    customerPhone: String(payload.customerPhone || "").trim(),
    customerAddress: String(payload.customerAddress || "").trim(),

    bikeLabel: String(payload.bikeLabel || "").trim(),
    serviceType: String(payload.serviceType || "").trim(),
    serviceStatus: String(payload.serviceStatus || "received").trim(),

    serviceCost: Number(payload.serviceCost || 0),
    notes: String(payload.notes || "").trim()
  };
}

function validateService(service) {
  const errors = [];
  const allowedStatuses = ["received", "in_progress", "completed", "cancelled"];

  if (!service.customerName) {
    errors.push("Nama customer wajib diisi.");
  }

  if (!service.bikeLabel) {
    errors.push("Data sepeda/unit wajib diisi.");
  }

  if (!service.serviceType) {
    errors.push("Jenis service wajib diisi.");
  }

  if (!allowedStatuses.includes(service.serviceStatus)) {
    errors.push("Status service tidak valid.");
  }

  if (service.serviceCost < 0) {
    errors.push("Biaya service tidak boleh negatif.");
  }

  return errors;
}

function rowToService(row) {
  return {
    id: row.id,
    serviceNumber: row.service_number,

    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerAddress: row.customer_address,

    bikeLabel: row.bike_label,
    serviceType: row.service_type,
    serviceStatus: row.service_status,

    serviceCost: Number(row.service_cost || 0),
    notes: row.notes,

    createdById: row.created_by_id,
    createdByUsername: row.created_by_username,
    createdByRole: row.created_by_role,

    createdAt: row.created_at,
    completedAt: row.completed_at
  };
}

async function getServiceById(db, id) {
  const row = await db
    .prepare("SELECT * FROM services WHERE id = ? LIMIT 1")
    .bind(id)
    .first();

  return row ? rowToService(row) : null;
}

function getCompletedAtForStatus(serviceStatus, existingService = null) {
  if (serviceStatus === "completed") {
    return existingService?.completedAt || new Date().toISOString();
  }

  return null;
}

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin", "staff"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);
    }

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
    const status = String(url.searchParams.get("status") || "all").trim();

    let query = `
      SELECT *
      FROM services
    `;

    const bindings = [];

    if (status !== "all") {
      query += `
        WHERE service_status = ?
      `;
      bindings.push(status);
    }

    query += `
      ORDER BY datetime(created_at) DESC
      LIMIT ?
    `;
    bindings.push(limit);

    const result = await env.BIKE_DB
      .prepare(query)
      .bind(...bindings)
      .all();

    return jsonResponse({
      success: true,
      services: (result.results || []).map(rowToService)
    });
  } catch (error) {
    console.error("Services GET error:", error);

    return jsonResponse(
      { error: "Failed to load services" },
      500
    );
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin", "staff"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);
    }

    const payload = await request.json().catch(() => null);

    if (!payload) {
      return jsonResponse({ error: "Invalid service data" }, 400);
    }

    const service = normalizeServicePayload(payload);
    const errors = validateService(service);

    if (errors.length) {
      return jsonResponse(
        { error: "Invalid service data", errors },
        400
      );
    }

    const serviceId = createServiceId();
    const serviceNumber = createServiceNumber();
    const completedAt = getCompletedAtForStatus(service.serviceStatus);

    await env.BIKE_DB
      .prepare(`
        INSERT INTO services (
          id,
          service_number,

          customer_name,
          customer_phone,
          customer_address,

          bike_label,
          service_type,
          service_status,

          service_cost,
          notes,

          created_by_id,
          created_by_username,
          created_by_role,

          completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        serviceId,
        serviceNumber,

        service.customerName,
        service.customerPhone,
        service.customerAddress,

        service.bikeLabel,
        service.serviceType,
        service.serviceStatus,

        service.serviceCost,
        service.notes,

        auth.user.id || "",
        auth.user.username,
        auth.user.role,

        completedAt
      )
      .run();

    const createdService = await getServiceById(env.BIKE_DB, serviceId);

    await writeAuditLog(env, auth.user, {
      action: "service_create",
      targetType: "service",
      targetId: createdService.id,
      targetLabel: createdService.serviceNumber,
      details: {
        customerName: createdService.customerName,
        bikeLabel: createdService.bikeLabel,
        serviceType: createdService.serviceType,
        serviceStatus: createdService.serviceStatus,
        serviceCost: createdService.serviceCost
      }
    });

    return jsonResponse({
      success: true,
      service: createdService
    });
  } catch (error) {
    console.error("Services POST error:", error);

    return jsonResponse(
      { error: "Failed to create service" },
      500
    );
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin", "staff"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_DB) {
      return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);
    }

    const payload = await request.json().catch(() => null);

    if (!payload) {
      return jsonResponse({ error: "Invalid service data" }, 400);
    }

    const id = String(payload.id || "").trim();

    if (!id) {
      return jsonResponse({ error: "Service ID wajib diisi." }, 400);
    }

    const existingService = await getServiceById(env.BIKE_DB, id);

    if (!existingService) {
      return jsonResponse({ error: "Service tidak ditemukan." }, 404);
    }

    const service = normalizeServicePayload(payload);
    const errors = validateService(service);

    if (errors.length) {
      return jsonResponse(
        { error: "Invalid service data", errors },
        400
      );
    }

    const completedAt = getCompletedAtForStatus(
      service.serviceStatus,
      existingService
    );

    await env.BIKE_DB
      .prepare(`
        UPDATE services
        SET
          customer_name = ?,
          customer_phone = ?,
          customer_address = ?,

          bike_label = ?,
          service_type = ?,
          service_status = ?,

          service_cost = ?,
          notes = ?,
          completed_at = ?
        WHERE id = ?
      `)
      .bind(
        service.customerName,
        service.customerPhone,
        service.customerAddress,

        service.bikeLabel,
        service.serviceType,
        service.serviceStatus,

        service.serviceCost,
        service.notes,
        completedAt,

        id
      )
      .run();

    const updatedService = await getServiceById(env.BIKE_DB, id);

    await writeAuditLog(env, auth.user, {
      action: "service_update",
      targetType: "service",
      targetId: updatedService.id,
      targetLabel: updatedService.serviceNumber,
      details: {
        customerName: updatedService.customerName,
        bikeLabel: updatedService.bikeLabel,
        serviceType: updatedService.serviceType,
        previousStatus: existingService.serviceStatus,
        serviceStatus: updatedService.serviceStatus,
        serviceCost: updatedService.serviceCost
      }
    });

    return jsonResponse({
      success: true,
      service: updatedService
    });
  } catch (error) {
    console.error("Services PUT error:", error);

    return jsonResponse(
      { error: "Failed to update service" },
      500
    );
  }
}