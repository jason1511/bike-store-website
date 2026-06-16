function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function rowToBike(row) {
  return {
    ...row,
    price: Number(row.price || 0),
    featured: Boolean(row.featured),
    inStock: Boolean(row.inStock),
    stockQty: Number(row.stockQty || 0)
  };
}

function getOutputText(openAiData) {
  return (
    openAiData.output_text ||
    openAiData.output?.[0]?.content?.[0]?.text ||
    openAiData.output?.[1]?.content?.[0]?.text ||
    ""
  );
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env.OPENAI_API_KEY) {
      return jsonResponse({ error: "OpenAI API key is missing" }, 500);
    }

    if (!env.BIKE_DB) {
      return jsonResponse({ error: "D1 binding BIKE_DB is missing" }, 500);
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return jsonResponse({ error: "Invalid request body" }, 400);
    }

    const usage = String(body.usage || body.need || "").trim();
    const budget = String(body.budget || "").trim();

    if (!usage) {
      return jsonResponse({ error: "Missing usage data" }, 400);
    }

    const result = await env.BIKE_DB
      .prepare(`
        SELECT *
        FROM bikes
        WHERE inStock = 1
        ORDER BY brand ASC, name ASC
      `)
      .all();

    const bikes = (result.results || []).map(rowToBike);

    if (!bikes.length) {
      return jsonResponse({ error: "No bikes available in catalogue" }, 404);
    }

    const bikesForAI = bikes.map((bike) => ({
      id: bike.id,
      brand: bike.brand,
      name: bike.name,
      battery: bike.battery,
      motor: bike.motor,
      topSpeed: bike.topSpeed,
      range: bike.range,
      maxWeight: bike.maxWeight,
      safety: bike.safety,
      comfort: bike.comfort,
      price: bike.price || 0,
      description: bike.description
    }));

    const prompt = `
Anda adalah asisten showroom sepeda listrik CV Niaga Bersama Abadi.

Tugas:
Pilih 1 sepeda listrik yang paling cocok berdasarkan kebutuhan utama pelanggan.

Kebutuhan pelanggan:
- Kebutuhan utama: ${usage}
- Budget: ${budget || "Tidak disebutkan"}

Daftar sepeda:
${JSON.stringify(bikesForAI, null, 2)}

Aturan:
- Pilih hanya dari daftar sepeda yang tersedia.
- Jika harga 0, anggap harga tidak ditampilkan dan jangan gunakan harga sebagai alasan utama.
- Jelaskan alasan secara singkat dan mudah dipahami.
- Gunakan Bahasa Indonesia.
- Kembalikan JSON valid saja tanpa markdown dengan format:
{
  "bikeId": "id-sepeda",
  "reason": "alasan singkat"
}
`;

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        input: prompt
      })
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      console.error("OpenAI API error:", errorText);

      return jsonResponse(
        { error: "OpenAI request failed" },
        500
      );
    }

    const openAiData = await openAiResponse.json();
    const text = getOutputText(openAiData).trim();

    if (!text) {
      return jsonResponse({ error: "AI returned empty response" }, 500);
    }

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (error) {
      console.error("AI JSON parse error:", text);
      return jsonResponse({ error: "AI returned invalid JSON" }, 500);
    }

    const selectedBike = bikes.find((bike) => bike.id === parsed.bikeId);

    if (!selectedBike) {
      return jsonResponse(
        { error: "AI returned an unknown bike" },
        500
      );
    }

    return jsonResponse({
      bikeId: selectedBike.id,
      reason: parsed.reason || "Sepeda ini paling sesuai dengan kebutuhan yang dipilih.",
      bike: selectedBike
    });
  } catch (error) {
    console.error("Recommendation error:", error);

    return jsonResponse(
      { error: "Recommendation failed" },
      500
    );
  }
}