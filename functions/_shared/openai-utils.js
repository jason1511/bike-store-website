export function getOpenAiOutputText(openAiData) {
  if (!openAiData || typeof openAiData !== "object") {
    return "";
  }

  if (
    typeof openAiData.output_text === "string" &&
    openAiData.output_text.trim()
  ) {
    return openAiData.output_text;
  }

  const outputItems = Array.isArray(openAiData.output)
    ? openAiData.output
    : [];

  for (const outputItem of outputItems) {
    const contentItems = Array.isArray(outputItem?.content)
      ? outputItem.content
      : [];

    for (const contentItem of contentItems) {
      if (
        typeof contentItem?.text === "string" &&
        contentItem.text.trim()
      ) {
        return contentItem.text;
      }
    }
  }

  return "";
}