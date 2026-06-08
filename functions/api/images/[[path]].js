export async function onRequestGet(context) {
  const { env, params } = context;

  try {
    if (!env.BIKE_IMAGES) {
      return new Response("R2 binding BIKE_IMAGES is missing", {
        status: 500
      });
    }

    const path = Array.isArray(params.path)
      ? params.path.join("/")
      : params.path;

    if (!path) {
      return new Response("Image path is required", {
        status: 400
      });
    }

    const object = await env.BIKE_IMAGES.get(path);

    if (!object) {
      return new Response("Image not found", {
        status: 404
      });
    }

    const headers = new Headers();

    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(object.body, {
      headers
    });
  } catch (error) {
    console.error("Image fetch error:", error);

    return new Response("Failed to load image", {
      status: 500
    });
  }
}