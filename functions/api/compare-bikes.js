function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
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
    safety: bike.safety || "Kunci Manual, Sistem Keamanan Standar",
    comfort: bike.comfort || "-",
    description: bike.description || "-"
  };
}

function cleanJsonText(text) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { bikeOne, bikeTwo } = await request.json();

    if (!bikeOne || !bikeTwo) {
      return jsonResponse(
        { error: "Two bikes are required" },
        400
      );
    }

    if (!env.OPENAI_API_KEY) {
      return jsonResponse(
        { error: "OpenAI API key is missing" },
        500
      );
    }

    const bikeOneForAI = cleanBikeForAI(bikeOne);
    const bikeTwoForAI = cleanBikeForAI(bikeTwo);

    const prompt = `
Anda adalah asisten showroom sepeda listrik CV Niaga Bersama Abadi.

Tugas:
Bandingkan dua sepeda listrik untuk membantu pelanggan memilih model yang lebih sesuai.

Sepeda pertama:
${JSON.stringify(bikeOneForAI, null, 2)}

Sepeda kedua:
${JSON.stringify(bikeTwoForAI, null, 2)}

Aturan:
- Gunakan Bahasa Indonesia.
- Jangan membahas harga.
- Jangan mengarang data di luar spesifikasi yang diberikan.
- Jika data kosong atau "-", sebutkan bahwa informasinya belum tersedia.
- Fokus pada kenyamanan, keamanan, tenaga, jarak tempuh, dan kecocokan penggunaan.
- Kembalikan JSON valid saja.
- Jangan gunakan markdown.
- Jangan bungkus jawaban dengan code block.
- Isi "winner" hanya dengan "bikeOne", "bikeTwo", atau "tie".
- Gunakan kalimat singkat dan mudah dipahami.

Format JSON:
{
  "summary": "Ringkasan singkat 1-2 kalimat.",
  "rows": [
    {
      "label": "Kenyamanan",
      "bikeOne": "Penjelasan singkat untuk sepeda pertama",
      "bikeTwo": "Penjelasan singkat untuk sepeda kedua",
      "winner": "bikeOne"
    },
    {
      "label": "Keamanan",
      "bikeOne": "Penjelasan singkat untuk sepeda pertama",
      "bikeTwo": "Penjelasan singkat untuk sepeda kedua",
      "winner": "bikeTwo"
    },
    {
      "label": "Tenaga",
      "bikeOne": "Penjelasan singkat untuk sepeda pertama",
      "bikeTwo": "Penjelasan singkat untuk sepeda kedua",
      "winner": "tie"
    },
    {
      "label": "Jarak tempuh",
      "bikeOne": "Penjelasan singkat untuk sepeda pertama",
      "bikeTwo": "Penjelasan singkat untuk sepeda kedua",
      "winner": "tie"
    },
    {
      "label": "Cocok untuk",
      "bikeOne": "Cocok untuk siapa",
      "bikeTwo": "Cocok untuk siapa",
      "winner": "tie"
    }
  ],
  "finalRecommendation": "Rekomendasi akhir singkat."
}
`;

    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
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

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API error:", errorText);

      return jsonResponse(
        { error: "OpenAI request failed" },
        500
      );
    }

    const openAIData = await openAIResponse.json();

    const outputText =
      openAIData.output_text ||
      openAIData.output?.[0]?.content?.[0]?.text ||
      "";

    if (!outputText) {
      return jsonResponse(
        { error: "AI comparison is empty" },
        500
      );
    }

    let comparison;

    try {
      comparison = JSON.parse(cleanJsonText(outputText));
    } catch (error) {
      console.error("Failed to parse AI comparison JSON:", outputText);

      return jsonResponse(
        { error: "AI comparison format is invalid" },
        500
      );
    }

    return jsonResponse({
      comparison
    });
  } catch (error) {
    console.error("Compare bikes error:", error);

    return jsonResponse(
      { error: "Bike comparison failed" },
      500
    );
  }
}