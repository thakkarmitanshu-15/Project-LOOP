import { z } from "zod";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is not configured");
}

const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const classificationSchema = z.object({
  sentiment: z.enum(["POS", "NEU", "NEG"]),
  sentimentScore: z.number().min(-1).max(1),
  themes: z.array(z.string()).min(1),
  featureArea: z.string().min(1),
  rationale: z.string().min(1),
});

const askLoopSchema = z.object({
  answer: z.string().min(1),
  feedbackIds: z.array(z.string()),
});

async function callOpenRouter(
  system: string,
  user: string,
  maxTokens: number,
) {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openrouter/free",
      temperature: 0,
      max_tokens: maxTokens,
      messages: [
        {
          role: "system",
          content: system,
        },
        {
          role: "user",
          content: user,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `OpenRouter API error (${response.status}): ${errorText}`,
    );
  }

  const data = await response.json();

  const text = data?.choices?.[0]?.message?.content;

  if (typeof text !== "string" || !text.trim()) {
    throw new Error(
      `OpenRouter returned no text response. Response: ${JSON.stringify(data)}`,
    );
  }

  return text;
}

function cleanJson(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function classifyFeedback(
  content: string,
  themeNames: string[],
) {
  const availableThemes =
    themeNames.length > 0
      ? themeNames.join(", ")
      : "No existing themes are available.";

  const system = `
You are a customer feedback classification assistant for LOOP.

Analyze customer feedback and classify it using the existing workspace themes.

IMPORTANT:
- Return ONLY valid JSON.
- Do not use Markdown.
- Do not wrap the JSON in code fences.
- Use only the provided existing theme names.
- Do not invent new theme names.
- A feedback item may belong to multiple themes.

Return exactly this JSON structure:

{
  "sentiment": "POS" | "NEU" | "NEG",
  "sentimentScore": 0.0,
  "themes": ["Theme Name"],
  "featureArea": "short feature or product area",
  "rationale": "one-line explanation"
}

Rules:

sentiment:
- POS = positive feedback
- NEU = neutral or informational feedback
- NEG = negative feedback

sentimentScore:
- Must be between -1 and 1.
- -1 means extremely negative.
- 0 means neutral.
- 1 means extremely positive.
- The score should reflect the strength of the sentiment.

themes:
- Select one or more themes from the existing theme list.
- Use the exact theme names.
- Never create a theme that is not in the list.

featureArea:
- Give a short description of the product or feature area discussed.

rationale:
- Give one concise sentence explaining the classification.

Existing workspace themes:
${availableThemes}
`;

  const user = `
Classify this customer feedback:

${content}
`;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await callOpenRouter(
        system,
        user,
        300,
      );

      const cleanedText = cleanJson(text);
      const parsed = JSON.parse(cleanedText);

      return classificationSchema.parse(parsed);
    } catch (error) {
      lastError = error;

      console.error(
        `Feedback classification attempt ${attempt} failed:`,
        error,
      );

      if (attempt === 1) {
        console.log(
          "Retrying feedback classification...",
        );
      }
    }
  }

  throw new Error(
    `AI classification failed after 2 attempts. Manual review required. ${
      lastError instanceof Error
        ? lastError.message
        : ""
    }`,
  );
}

export async function askLoop(
  question: string,
  feedback: Array<{
    id: string;
    content: string;
    channel: string;
    sentiment: "POS" | "NEU" | "NEG" | null;
    sentimentScore: number | null;
    status: "NEW" | "REVIEWED" | "ACTIONED";
    createdAt: Date;
  }>,
) {
  const context = feedback
    .map(
      (item, index) => `
Feedback ${index + 1}
ID: ${item.id}
Channel: ${item.channel}
Sentiment: ${item.sentiment ?? "UNKNOWN"}
Date: ${item.createdAt.toISOString()}
Content: ${item.content}
`,
    )
    .join("\n");

  const text = await callOpenRouter(
    `
You are LOOP, a customer-feedback intelligence assistant.

Answer the user's question using ONLY the provided customer feedback context.

Do not invent facts, customers, feedback, statistics, or conclusions that are not supported by the context.

If the provided context does not contain enough information to answer the question, clearly say that there is not enough evidence in the retrieved feedback.

Return ONLY valid JSON in exactly this format:

{
  "answer": "your answer",
  "feedbackIds": ["id1", "id2"]
}

The feedbackIds array must contain only IDs of feedback items that directly support your answer.
`,
    `
Question:
${question}

Customer feedback context:
${context}
`,
    600,
  );

  const parsed = JSON.parse(cleanJson(text));

  return askLoopSchema.parse(parsed);
}