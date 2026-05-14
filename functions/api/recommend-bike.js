export async function onRequestPost(context) {
  try {
    const { request, env } = context;
console.log("Has OpenAI key:", Boolean(env.OPENAI_API_KEY));
    const body = await request.json();
    const { usage, budget, bikes } = body;

    if (!usage || !Array.isArray(bikes) || bikes.length === 0) {
      return jsonResponse(
        { error: "Missing usage or bikes data" },
        400
      );
    }

    const safeBikes = bikes.map((bike) => ({
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
      price: bike.price || null,
      description: bike.description
    }));

   const prompt = `
Anda adalah asisten showroom sepeda listrik CV Niaga Bersama Abadi.

Tugas:
Pilih 1 sepeda listrik yang paling cocok berdasarkan kebutuhan utama pelanggan.

Kebutuhan pelanggan:
- Kebutuhan utama: ${need}

Daftar sepeda:
${JSON.stringify(bikesForAI, null, 2)}

Aturan:
- Pilih hanya dari daftar sepeda yang tersedia.
- Jangan membahas harga.
- Jelaskan alasan secara singkat dan mudah dipahami.
- Gunakan Bahasa Indonesia.
- Kembalikan JSON valid saja dengan format:
{
  "bikeId": "id-sepeda",
  "reason": "alasan singkat"
}
`;

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
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

    const text =
      openAiData.output_text ||
      openAiData.output?.[0]?.content?.[0]?.text ||
      "";

    const parsed = JSON.parse(text);

    const bikeExists = safeBikes.some((bike) => bike.id === parsed.bikeId);

    if (!bikeExists) {
      return jsonResponse(
        { error: "AI returned an unknown bike" },
        500
      );
    }

    return jsonResponse({
      bikeId: parsed.bikeId,
      reason: parsed.reason
    });
  } catch (error) {
    console.error(error);

    return jsonResponse(
      { error: "Recommendation failed" },
      500
    );
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}