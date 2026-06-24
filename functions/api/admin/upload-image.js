import {
  jsonResponse,
  requireRole
} from "../../_shared/auth.js";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

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

  return ALLOWED_IMAGE_EXTENSIONS.includes(extension)
    ? extension
    : fallback;
}

function createSafeFolderName(folder) {
  return String(folder || "bikes")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9/-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "") || "bikes";
}

function isAllowedImage(fileName, fileType) {
  const extension = getFileExtension(fileName, "");
  const type = String(fileType || "").toLowerCase();

  return ALLOWED_IMAGE_TYPES.includes(type) || ALLOWED_IMAGE_EXTENSIONS.includes(extension);
}

function decodeBase64Image(imageBase64) {
  const value = String(imageBase64 || "").trim();

  if (!value) {
    return new Uint8Array();
  }

  const cleanBase64 = value.includes(",")
    ? value.split(",").pop()
    : value;

  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function readJsonUpload(request) {
  const payload = await request.json().catch(() => null);

  if (!payload) {
    return {
      error: "Invalid upload payload."
    };
  }

  const imageBase64 = String(payload.imageBase64 || "");
  const fileName = String(payload.fileName || "bike-image.jpg");
  const fileType = String(payload.fileType || "application/octet-stream");
  const folder = createSafeFolderName(payload.folder || "bikes");
  const fileBaseName = slugify(payload.fileBaseName || "");

  if (!imageBase64) {
    return {
      error: "Image data is required."
    };
  }

  const bytes = decodeBase64Image(imageBase64);

  return {
    imageBase64,
    bytes,
    fileName,
    fileType,
    folder,
    fileBaseName,
    size: bytes.byteLength
  };
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
        { error: "R2 binding BIKE_IMAGES is missing." },
        500
      );
    }

    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return jsonResponse(
        {
          error: "This endpoint only accepts JSON image uploads.",
          expected: "application/json"
        },
        400
      );
    }

    const upload = await readJsonUpload(request);

    if (upload.error) {
      return jsonResponse({ error: upload.error }, 400);
    }

    if (!upload.bytes || upload.size <= 0) {
      return jsonResponse(
        { error: "Image data is empty." },
        400
      );
    }

    if (upload.size > MAX_IMAGE_SIZE_BYTES) {
      return jsonResponse(
        {
          error: "Image must be smaller than 5MB.",
          receivedSize: upload.size
        },
        400
      );
    }

    if (!isAllowedImage(upload.fileName, upload.fileType)) {
      return jsonResponse(
        {
          error: "Only JPG, PNG, and WEBP images are allowed.",
          receivedFile: {
            name: upload.fileName,
            type: upload.fileType,
            size: upload.size
          }
        },
        400
      );
    }

    const extension = getFileExtension(upload.fileName);
    const timestamp = Date.now();
    const originalBaseName = upload.fileName.replace(/\.[^/.]+$/, "");
    const baseName = upload.fileBaseName || slugify(originalBaseName) || "bike-image";

    const objectKey = `${upload.folder}/${baseName}-${timestamp}.${extension}`;
    const imagePath = `/api/images/${objectKey}`;

    await env.BIKE_IMAGES.put(objectKey, upload.bytes, {
      httpMetadata: {
        contentType: upload.fileType || "application/octet-stream"
      },
      customMetadata: {
        uploadedBy: auth.user.username,
        uploadedRole: auth.user.role,
        originalName: upload.fileName,
        fileBaseName: baseName,
        uploadSource: "json-base64"
      }
    });

    return jsonResponse({
      success: true,
      key: objectKey,
      imagePath
    });
  } catch (error) {
    console.error("Upload bike image error:", error);

    return jsonResponse(
      {
        error: "Failed to upload image.",
        message: error.message
      },
      500
    );
  }
}