import {
  jsonResponse,
  requireRole
} from "../../_shared/auth.js";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFileExtension(fileName, fallback = "jpg") {
  const extension = String(fileName || "")
    .split(".")
    .pop()
    ?.toLowerCase();

  if (["jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension;
  }

  return fallback;
}

function createSafeFolderName(folder) {
  return String(folder || "bikes")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9/-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "") || "bikes";
}

function isAllowedImageType(file) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const auth = await requireRole(request, env, ["admin", "staff"]);

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_IMAGES) {
      return jsonResponse(
        { error: "R2 binding BIKE_IMAGES is missing" },
        500
      );
    }

const formData = await request.formData();

let file = formData.get("image");

if (!file || typeof file === "string") {
  file = formData.get("file");
}

if (!file || typeof file === "string") {
  const entries = Array.from(formData.entries());
  const fileEntry = entries.find(([, value]) => {
    return value && typeof value !== "string" && typeof value.arrayBuffer === "function";
  });

  file = fileEntry?.[1] || null;
}
    const folder = createSafeFolderName(formData.get("folder") || "bikes");
    const requestedBaseName = slugify(formData.get("fileBaseName") || "");
console.log(
  "Upload form entries:",
  Array.from(formData.entries()).map(([key, value]) => ({
    key,
    type: typeof value,
    name: value?.name,
    size: value?.size,
    contentType: value?.type
  }))
);
    if (!file || typeof file === "string") {
      return jsonResponse({ error: "Image file is required" }, 400);
    }

    if (!isAllowedImageType(file)) {
      return jsonResponse(
        { error: "Only JPG, PNG, and WEBP images are allowed" },
        400
      );
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      return jsonResponse(
        { error: "Image must be smaller than 5MB" },
        400
      );
    }

    const extension = getFileExtension(file.name);
    const timestamp = Date.now();
    const originalBaseName = file.name.replace(/\.[^/.]+$/, "");
    const baseName = requestedBaseName || slugify(originalBaseName) || "bike-image";
    const objectKey = `${folder}/${baseName}-${timestamp}.${extension}`;

    await env.BIKE_IMAGES.put(objectKey, file.stream(), {
      httpMetadata: {
        contentType: file.type
      },
      customMetadata: {
        uploadedBy: auth.user.username,
        uploadedRole: auth.user.role,
        originalName: file.name,
        fileBaseName: baseName
      }
    });

    return jsonResponse({
      success: true,
      key: objectKey,
      imagePath: `/api/images/${objectKey}`
    });
  } catch (error) {
    console.error("Upload image error:", error);

    return jsonResponse(
      { error: "Failed to upload image" },
      500
    );
  }
}