import {
  jsonResponse,
  requireRole
} from "../../_shared/auth.js";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFileExtension(fileName) {
  return String(fileName || "")
    .split(".")
    .pop()
    ?.toLowerCase() || "";
}

function createSafeFolderName(folder) {
  return String(folder || "bikes")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9/-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "") || "bikes";
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

function isJpeg(bytes) {
  return (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

function isPng(bytes) {
  const signature = [
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a
  ];

  return (
    bytes.length >= signature.length &&
    signature.every((byte, index) => bytes[index] === byte)
  );
}

function isWebp(bytes) {
  if (bytes.length < 12) {
    return false;
  }

  const riff = String.fromCharCode(
    bytes[0],
    bytes[1],
    bytes[2],
    bytes[3]
  );

  const webp = String.fromCharCode(
    bytes[8],
    bytes[9],
    bytes[10],
    bytes[11]
  );

  return riff === "RIFF" && webp === "WEBP";
}

function detectImageType(bytes) {
  if (isJpeg(bytes)) {
    return {
      extension: "jpg",
      contentType: "image/jpeg"
    };
  }

  if (isPng(bytes)) {
    return {
      extension: "png",
      contentType: "image/png"
    };
  }

  if (isWebp(bytes)) {
    return {
      extension: "webp",
      contentType: "image/webp"
    };
  }

  return null;
}

function verifyImageFile(bytes, fileName, fileType) {
  const detectedType = detectImageType(bytes);

  if (!detectedType) {
    return {
      ok: false,
      error: "File content is not a supported image."
    };
  }

  const suppliedExtension = getFileExtension(fileName);
  const suppliedContentType = String(fileType || "")
    .trim()
    .toLowerCase();

  const expectedContentType = IMAGE_TYPES[suppliedExtension];

  if (!expectedContentType) {
    return {
      ok: false,
      error: "Only JPG, PNG, and WEBP files are allowed."
    };
  }

  if (expectedContentType !== detectedType.contentType) {
    return {
      ok: false,
      error: "The file extension does not match the image content."
    };
  }

  if (suppliedContentType !== detectedType.contentType) {
    return {
      ok: false,
      error: "The reported file type does not match the image content."
    };
  }

  return {
    ok: true,
    extension: detectedType.extension,
    contentType: detectedType.contentType
  };
}

async function readJsonUpload(request) {
  const payload = await request.json().catch(() => null);

  if (!payload) {
    return {
      error: "Invalid upload payload."
    };
  }

  const imageBase64 = String(payload.imageBase64 || "");
  const fileName = String(
    payload.fileName || "uploaded-image.jpg"
  );
  const fileType = String(
    payload.fileType || "application/octet-stream"
  );
  const folder = createSafeFolderName(
    payload.folder || "bikes"
  );
  const fileBaseName = slugify(
    payload.fileBaseName || ""
  );

  if (!imageBase64) {
    return {
      error: "Image data is required."
    };
  }

  let bytes;

  try {
    bytes = decodeBase64Image(imageBase64);
  } catch (error) {
    return {
      error: "Image data is not valid base64."
    };
  }

  return {
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
    const auth = await requireRole(
      request,
      env,
      ["admin", "staff"]
    );

    if (!auth.ok) {
      return auth.response;
    }

    if (!env.BIKE_IMAGES) {
      return jsonResponse(
        {
          error: "R2 binding BIKE_IMAGES is missing."
        },
        500
      );
    }

    const contentType =
      request.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return jsonResponse(
        {
          error:
            "This endpoint only accepts JSON image uploads.",
          expected: "application/json"
        },
        400
      );
    }

    const upload = await readJsonUpload(request);

    if (upload.error) {
      return jsonResponse(
        { error: upload.error },
        400
      );
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

    const verification = verifyImageFile(
      upload.bytes,
      upload.fileName,
      upload.fileType
    );

    if (!verification.ok) {
      return jsonResponse(
        {
          error: verification.error,
          receivedFile: {
            name: upload.fileName,
            type: upload.fileType,
            size: upload.size
          }
        },
        400
      );
    }

    const timestamp = Date.now();
    const originalBaseName = upload.fileName.replace(
      /\.[^/.]+$/,
      ""
    );

    const baseName =
      upload.fileBaseName ||
      slugify(originalBaseName) ||
      "uploaded-image";

    const objectKey =
      `${upload.folder}/${baseName}-${timestamp}.` +
      verification.extension;

    const imagePath = `/api/images/${objectKey}`;

    await env.BIKE_IMAGES.put(
      objectKey,
      upload.bytes,
      {
        httpMetadata: {
          contentType: verification.contentType
        },
        customMetadata: {
          uploadedBy: auth.user.username,
          uploadedRole: auth.user.role,
          originalName: upload.fileName,
          fileBaseName: baseName,
          uploadSource: "json-base64"
        }
      }
    );

    return jsonResponse({
      success: true,
      key: objectKey,
      imagePath
    });
  } catch (error) {
    console.error("Image upload error:", error);

    return jsonResponse(
      {
        error: "Failed to upload image."
      },
      500
    );
  }
}