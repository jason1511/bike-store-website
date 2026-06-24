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

function isAllowedImageTypeFromParts(fileName, contentType) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedExtensions = ["jpg", "jpeg", "png", "webp"];

  const type = String(contentType || "").toLowerCase();
  const extension = getFileExtension(fileName, "");

  return allowedTypes.includes(type) || allowedExtensions.includes(extension);
}

function isFileLike(value) {
  return (
    value &&
    typeof value !== "string" &&
    typeof value.arrayBuffer === "function"
  );
}

function getUploadedFileFromFormData(formData) {
  let file = formData.get("image");

  if (!isFileLike(file)) {
    file = formData.get("file");
  }

  if (!isFileLike(file)) {
    const fileEntry = Array.from(formData.entries()).find(([, value]) => {
      return isFileLike(value);
    });

    file = fileEntry?.[1] || null;
  }

  return isFileLike(file) ? file : null;
}

function decodeBase64Image(imageBase64) {
  const value = String(imageBase64 || "");

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

async function readUploadPayload(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = await request.json();

    const fileName = String(payload.fileName || "bike-image.jpg");
    const fileType = String(payload.fileType || "application/octet-stream");
    const folder = createSafeFolderName(payload.folder || "bikes");
    const requestedBaseName = slugify(payload.fileBaseName || "");
    const bytes = decodeBase64Image(payload.imageBase64 || "");

    return {
      source: "json",
      fileName,
      fileType,
      folder,
      requestedBaseName,
      size: bytes.byteLength,
      body: bytes
    };
  }

  const formData = await request.formData();
  const file = getUploadedFileFromFormData(formData);

  if (!file) {
    return {
      source: "form",
      file: null,
      folder: createSafeFolderName(formData.get("folder") || "bikes"),
      requestedBaseName: slugify(formData.get("fileBaseName") || ""),
      receivedFields: Array.from(formData.entries()).map(([key, value]) => ({
        key,
        type: typeof value,
        isFileLike: isFileLike(value),
        name: value?.name || "",
        size: value?.size || 0,
        contentType: value?.type || ""
      }))
    };
  }

  return {
    source: "form",
    file,
    fileName: file.name || "bike-image.jpg",
    fileType: file.type || "application/octet-stream",
    folder: createSafeFolderName(formData.get("folder") || "bikes"),
    requestedBaseName: slugify(formData.get("fileBaseName") || ""),
    size: file.size || 0,
    body: new Uint8Array(await file.arrayBuffer())
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
        { error: "R2 binding BIKE_IMAGES is missing" },
        500
      );
    }

    const upload = await readUploadPayload(request);

    if (!upload.body) {
      return jsonResponse(
        {
          error: "Image file is required",
          receivedFields: upload.receivedFields || []
        },
        400
      );
    }

    if (!isAllowedImageTypeFromParts(upload.fileName, upload.fileType)) {
      return jsonResponse(
        {
          error: "Only JPG, PNG, and WEBP images are allowed",
          receivedFile: {
            name: upload.fileName,
            type: upload.fileType,
            size: upload.size
          }
        },
        400
      );
    }

    const maxSize = 5 * 1024 * 1024;

    if (upload.size > maxSize) {
      return jsonResponse(
        {
          error: "Image must be smaller than 5MB",
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
    const originalBaseName = String(upload.fileName || "").replace(/\.[^/.]+$/, "");
    const baseName = upload.requestedBaseName || slugify(originalBaseName) || "bike-image";
    const objectKey = `${upload.folder}/${baseName}-${timestamp}.${extension}`;
    const imagePath = `/api/images/${objectKey}`;

    await env.BIKE_IMAGES.put(objectKey, upload.body, {
      httpMetadata: {
        contentType: upload.fileType || "application/octet-stream"
      },
      customMetadata: {
        uploadedBy: auth.user.username,
        uploadedRole: auth.user.role,
        originalName: upload.fileName || "",
        fileBaseName: baseName,
        uploadSource: upload.source
      }
    });

    return jsonResponse({
      success: true,
      key: objectKey,
      imagePath
    });
  } catch (error) {
    console.error("Upload image error:", error);

    return jsonResponse(
      {
        error: "Failed to upload image",
        message: error.message
      },
      500
    );
  }
}