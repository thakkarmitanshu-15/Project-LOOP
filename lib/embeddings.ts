const OPENROUTER_EMBEDDINGS_URL =
  "https://openrouter.ai/api/v1/embeddings";

const EMBEDDING_MODEL =
  "nvidia/nemotron-3-embed-1b:free";

export async function generateEmbedding(
  text: string,
): Promise<number[]> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured",
    );
  }

  const cleanedText = text.trim();

  if (!cleanedText) {
    throw new Error(
      "Cannot generate an embedding for empty text",
    );
  }

  const response = await fetch(
    OPENROUTER_EMBEDDINGS_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: cleanedText,
        encoding_format: "float",
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Embedding API error (${response.status}): ${errorText}`,
    );
  }

  const data = await response.json();

  const embedding =
    data?.data?.[0]?.embedding;

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
      `Embedding API returned an invalid vector: ${JSON.stringify(data)}`,
    );
  }

  return embedding;
}