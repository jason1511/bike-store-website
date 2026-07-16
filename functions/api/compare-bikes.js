import {
  jsonResponse
} from "../_shared/auth.js";

import {
  rowToBasicBike
} from "../_shared/bike-utils.js";
import {
  getOpenAiOutputText
} from "../_shared/openai-utils.js";


function createLocalComparisonFallback(bikes, usage = "") {
  const scoredBikes = bikes.map((bike) => {
    let score = 0;

    const numericText = [
      bike.battery,
      bike.motor,
      bike.topSpeed,
      bike.range
    ].join(" ");

    const numbers = String(numericText).match(/\d+/g) || [];
    const maxNumber = numbers.length
      ? Math.max(...numbers.map(Number))
      : 0;

    const safetyText = String(bike.safety || "").toLowerCase();
    const comfortText = String(bike.comfort || "").toLowerCase();
    const usageText = String(usage || "").toLowerCase();

    score += maxNumber;

    if (comfortText === "high") score += 20;
    if (safetyText.includes("nfc")) score += 10;
    if (safetyText.includes("alarm")) score += 8;
    if (safetyText.includes("remote")) score += 6;

    if (
      usageText.includes("anak") ||
      usageText.includes("keluarga") ||
      usageText.includes("harian")
    ) {
      score += comfortText === "high" ? 15 : 5;
    }

    if (
      usageText.includes("jauh") ||
      usageText.includes("kerja") ||
      usageText.includes("antar")
    ) {
      score += maxNumber >= 50 ? 15 : 5;
    }

    return {
      bike,
      score
    };
  });

  scoredBikes.sort((a, b) => b.score - a.score);

  const bestBike = scoredBikes[0]?.bike || bikes[0];

  return {
    summary: "Berikut perbandingan singkat berdasarkan spesifikasi utama.",
    bestBikeId: bestBike.id,
    reason: `${bestBike.brand} ${bestBike.name} terlihat paling seimbang berdasarkan tenaga, jarak tempuh, kenyamanan, dan fitur keamanan yang tersedia.`,
    comparisonPoints: [
      {
        label: "Performa",
        text: "Bandingkan motor, kecepatan maksimum, dan jarak tempuh untuk melihat sepeda yang lebih kuat untuk kebutuhan harian."
      },
      {
        label: "Kenyamanan",
        text: "Model dengan kenyamanan tinggi lebih cocok untuk pemakaian rutin, perjalanan lebih lama, atau kebutuhan keluarga."
      },
      {
        label: "Keamanan",
        text: "Fitur seperti NFC, alarm, remote, dan kunci tambahan dapat menjadi nilai tambah untuk penggunaan harian."
      }
    ]
  };
}

async function requestAiComparison(env, bikesForAI, usage) {
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
    throw new Error("OpenAI request failed");
  }

  const openAiData = await openAiResponse.json();
  const text = getOpenAiOutputText(openAiData).trim();

  if (!text) {
    throw new Error("AI returned empty response");
  }

  return JSON.parse(text);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
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

    const usage = String(body.usage || body.need || "")
      .trim()
      .slice(0, 300);

    if (bikeIds.length < 2) {
      return jsonResponse(
        { error: "Pilih minimal 2 sepeda untuk dibandingkan" },
        400
      );
    }

    const uniqueBikeIds = [...new Set(bikeIds)].slice(0, 2);
    const placeholders = uniqueBikeIds.map(() => "?").join(", ");

    const result = await env.BIKE_DB
      .prepare(`
        SELECT *
        FROM bikes
        WHERE inStock = 1
          AND id IN (${placeholders})
        ORDER BY brand ASC, name ASC
      `)
      .bind(...uniqueBikeIds)
      .all();

    const bikes = (result.results || []).map(rowToBasicBike);

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

    let parsed;

    if (env.OPENAI_API_KEY) {
      try {
        parsed = await requestAiComparison(env, bikesForAI, usage);
      } catch (error) {
        console.error("AI comparison failed, using local fallback:", error);
        parsed = createLocalComparisonFallback(bikes, usage);
      }
    } else {
      parsed = createLocalComparisonFallback(bikes, usage);
    }

    const selectedBikeIds = new Set(bikes.map((bike) => bike.id));
    const safeBestBikeId = selectedBikeIds.has(parsed.bestBikeId)
      ? parsed.bestBikeId
      : bikes[0].id;

    const bestBike = bikes.find((bike) => bike.id === safeBestBikeId) || bikes[0];

    return jsonResponse({
      success: true,
      bikes,
      summary: parsed.summary || "Berikut perbandingan sepeda yang dipilih.",
      bestBikeId: bestBike.id,
      bestBike,
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