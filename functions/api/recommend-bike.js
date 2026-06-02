function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function cleanJsonText(text) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function cleanBikeForAI(bike) {
  return {
    id: bike.id,
    brand: bike.brand,
    name: bike.name,
    battery: bike.battery || "-",
    motor: bike.motor || "-",
    topSpeed: bike.topSpeed || "-",
    range: bike.range || "-",
    maxWeight: bike.maxWeight || "-",
    safety: bike.safety || "-",
    comfort: bike.comfort || "-",
    description: bike.description || "-"
  };
}

function getUsageLabel(usage) {
  const labels = {
    daily: "Mobilitas harian",
    comfort: "Kenyamanan berkendara",
    range: "Jarak lebih jauh",
    power: "Tenaga lebih besar",
    safety: "Fitur keamanan"
  };

  return labels[usage] || usage || "Kebutuhan umum";
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { usage, bikes } = await request.json();

    if (!usage) {
      return jsonResponse(
        { error: "Usage is required" },
        400
      );
    }

    if (!Array.isArray(bikes) || bikes.length === 0) {
      return jsonResponse(
        { error: "Bike list is required" },
        400
      );
    }

    if (!env.OPENAI_API_KEY) {
      return jsonResponse(
        { error: "OpenAI API key is missing" },
        500
      );
    }

    const safeBikes = bikes.map(cleanBikeForAI);
    const usageLabel = getUsageLabel(usage);

    const prompt = `
Anda adalah asisten showroom sepeda listrik CV Niaga Bersama Abadi di Lumajang.

Tugas:
Pilih 1 sepeda listrik yang paling cocok berdasarkan kebutuhan utama pelanggan.

Kebutuhan pelanggan:
${usageLabel}

Daftar sepeda:
${JSON.stringify(safeBikes, null, 2)}

Aturan:
- Gunakan Bahasa Indonesia.
- Jangan membahas harga.
- Pilih hanya 1 sepeda dari daftar.
- Jangan mengarang model di luar daftar.
- bikeId harus sama persis dengan salah satu id dari daftar.
- Berikan alasan singkat, jelas, dan mudah dipahami.
- Kembalikan JSON valid saja.
- Jangan gunakan markdown.
- Jangan bungkus jawaban dengan code block.

Format JSON:
{
  "bikeId": "id-sepeda",
  "reason": "Alasan singkat mengapa sepeda ini cocok."
}
`;

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt
      })
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      console.error("OpenAI API error:", errorText);

      return jsonResponse(
        {
          error: "OpenAI request failed",
          detail: errorText
        },
        500
      );
    }

    const openAiData = await openAiResponse.json();

    const outputText =
      openAiData.output_text ||
      openAiData.output?.[0]?.content?.[0]?.text ||
      "";

    if (!outputText) {
      return jsonResponse(
        { error: "AI recommendation is empty" },
        500
      );
    }

    let recommendation;

    try {
      recommendation = JSON.parse(cleanJsonText(outputText));
    } catch (error) {
      console.error("Failed to parse AI recommendation JSON:", outputText);

      return jsonResponse(
        {
          error: "AI recommendation format is invalid",
          detail: outputText
        },
        500
      );
    }

    const bikeExists = safeBikes.some((bike) => bike.id === recommendation.bikeId);

    if (!bikeExists) {
      return jsonResponse(
        {
          error: "AI returned an unknown bike",
          bikeId: recommendation.bikeId
        },
        500
      );
    }

    return jsonResponse({
      bikeId: recommendation.bikeId,
      reason: recommendation.reason
    });
  } catch (error) {
    console.error("Recommend bike error:", error);

    return jsonResponse(
      {
        error: "Bike recommendation failed",
        detail: error.message
      },
      500
    );
  }
}