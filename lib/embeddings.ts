const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";

const GEMINI_EMBEDDING_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent`;

export async function generateEmbedding(
  text: string,
): Promise<number[]> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured",
    );
  }

  const cleanedText = text.trim();

  if (!cleanedText) {
    throw new Error(
      "Cannot generate an embedding for empty text",
    );
  }

  const response = await fetch(
    GEMINI_EMBEDDING_URL,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: {
          parts: [
            {
              text: cleanedText,
            },
          ],
        },
        outputDimensionality: 768,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Gemini Embedding API error (${response.status}): ${errorText}`,
    );
  }

  const data = await response.json();

  const embedding =
    data?.embedding?.values;

  if (
    !Array.isArray(embedding) ||
    embedding.length === 0 ||
    !embedding.every(
      (value: unknown) =>
        typeof value === "number" &&
        Number.isFinite(value),
    )
  ) {
    throw new Error(
      `Gemini Embedding API returned an invalid vector: ${JSON.stringify(data)}`,
    );
  }

  return embedding;
}