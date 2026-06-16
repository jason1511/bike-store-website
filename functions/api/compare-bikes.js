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

    const bikeIds = Array.isArray(body.bikeIds)
      ? body.bikeIds.map((id) => String(id).trim()).filter(Boolean)
      : [];

    const usage = String(body.usage || body.need || "").trim();

    if (bikeIds.length < 2) {
      return jsonResponse(
        { error: "Pilih minimal 2 sepeda untuk dibandingkan" },
        400
      );
    }

    const placeholders = bikeIds.map(() => "?").join(", ");

    const result = await env.BIKE_DB
      .prepare(`
        SELECT *
        FROM bikes
        WHERE inStock = 1
          AND id IN (${placeholders})
        ORDER BY brand ASC, name ASC
      `)
      .bind(...bikeIds)
      .all();

    const bikes = (result.results || []).map(rowToBike);

    if (bikes.length < 2) {
      return jsonResponse(
        { error: "Data sepeda yang dipilih tidak lengkap atau tidak tersedia" },
        404
      );
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
Bandingkan sepeda listrik yang dipilih pelanggan dan berikan rekomendasi singkat.

Kebutuhan pelanggan:
${usage || "Tidak disebutkan"}

Daftar sepeda yang dibandingkan:
${JSON.stringify(bikesForAI, null, 2)}

Aturan:
- Bandingkan hanya sepeda dari daftar.
- Jika harga 0, anggap harga tidak ditampilkan dan jangan jadikan harga sebagai alasan utama.
- Gunakan Bahasa Indonesia.
- Jawaban harus singkat, jelas, dan membantu pelanggan awam.
- Kembalikan JSON valid saja tanpa markdown dengan format:
{
  "summary": "ringkasan perbandingan singkat",
  "bestBikeId": "id-sepeda-terbaik",
  "reason": "alasan memilih sepeda tersebut",
  "comparisonPoints": [
    {
      "label": "Performa",
      "text": "penjelasan singkat"
    }
  ]
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

    const bestBike = bikes.find((bike) => bike.id === parsed.bestBikeId);

    return jsonResponse({
      success: true,
      bikes,
      summary: parsed.summary || "Berikut perbandingan sepeda yang dipilih.",
      bestBikeId: bestBike ? bestBike.id : bikes[0].id,
      bestBike: bestBike || bikes[0],
      reason: parsed.reason || "Sepeda ini paling seimbang untuk kebutuhan yang dipilih.",
      comparisonPoints: Array.isArray(parsed.comparisonPoints)
        ? parsed.comparisonPoints
        : []
    });
  } catch (error) {
    console.error("Compare bikes error:", error);

    return jsonResponse(
      { error: "Bike comparison failed" },
      500
    );
  }
}