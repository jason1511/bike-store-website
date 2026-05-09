export async function onRequestPost(context) {
  try {
    const { request, env } = context;

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
You are an Indonesian e-bike showroom assistant for CV Niaga Bersama Abadi.

The user wants help choosing an electric bike.

User preference:
- Kebutuhan utama: ${usage}
- Budget: ${budget || "tidak disebutkan"}

Available bikes:
${JSON.stringify(safeBikes, null, 2)}

Rules:
- Only recommend ONE bike from the provided list.
- Do not invent models, brands, prices, or specs.
- If budget is empty, ignore budget.
- If price is missing, do not treat it as expensive or cheap.
- Reply ONLY as valid JSON.
- JSON shape:
{
  "bikeId": "id-from-list",
  "reason": "short Indonesian explanation, 2-3 sentences"
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