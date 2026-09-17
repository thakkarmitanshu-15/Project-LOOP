import { z } from "zod";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not configured");
}

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/*
 * Gemini is called only from the server-side AI service.
 * The API key must never be exposed to the browser.
 */

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

async function callGemini(
  system: string,
  user: string,
  maxTokens: number,
) {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "x-goog-api-key": process.env.GEMINI_API_KEY as string,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: user }],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Gemini API error (${response.status}): ${errorText}`,
    );
  }

  const data = await response.json();

  const parts =
    data?.candidates?.[0]?.content?.parts;

  const text =
    Array.isArray(parts)
      ? parts
          .map((part: { text?: unknown }) =>
            typeof part?.text === "string"
              ? part.text
              : "",
          )
          .join("")
          .trim()
      : "";

  if (!text) {
    throw new Error(
      `Gemini returned no text response. Response: ${JSON.stringify(data)}`,
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
If the feedback does not fit any existing theme, identify one concise new theme that could be reused for similar feedback.

IMPORTANT:
- Return ONLY valid JSON.
- Do not use Markdown.
- Do not wrap the JSON in code fences.
- Prefer the provided existing workspace theme names when they fit.
- If none of the existing themes fit the feedback, you may propose one concise new theme name.
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
- Select one or more themes from the existing theme list when they fit.
- Use the exact existing theme names.
- If none of the existing themes fit, return one concise new theme name.
- New theme names should be short, specific, and reusable across similar feedback.
- Do not create multiple variations of the same concept.

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
      const text = await callGemini(
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

  const text = await callGemini(
    `
You are LOOP, a customer-feedback intelligence assistant.

Answer the user's question using ONLY the provided customer feedback context.

Do not invent facts, customers, feedback, statistics, or conclusions that are not supported by the context.

If the provided context does not contain enough information to answer the question, clearly say that there is not enough evidence in the retrieved feedback.

Return ONLY valid JSON.
Do not use Markdown.
Do not use code fences.
Do not include any explanation outside the JSON.

Return exactly this format:

{
  "answer": "A concise evidence-based answer.",
  "feedbackIds": ["id1", "id2"]
}

Rules:
- Keep the answer concise: 2 to 4 sentences maximum.
- Only include feedback IDs that directly support the answer.
- Do not include IDs merely because they were retrieved.
- If there is not enough evidence, use an empty feedbackIds array.
- The response must begin with { and end with }.
`,
    `
Question:
${question}

Customer feedback context:
${context}
`,
    2000,
  );

  const parsed = JSON.parse(cleanJson(text));

  return askLoopSchema.parse(parsed);
}


const vocReportSchema = z.object({
  summary: z.string().min(1),

  topThemes: z
    .array(
      z.object({
        theme: z.string().min(1),
        insight: z.string().min(1),
      }),
    )
    .min(1),

  sentimentShift: z.object({
    positive: z.string().min(1),
    neutral: z.string().min(1),
    negative: z.string().min(1),
  }),

  notableQuotes: z
    .array(
      z.object({
        quote: z.string().min(1),
        feedbackId: z.string().min(1),
      }),
    )
    .min(1),

  recommendedActions: z
    .array(z.string().min(1))
    .min(1),
});

export async function generateVocReport(
  periodStart: Date,
  periodEnd: Date,
  totalFeedback: number,
  sentimentSummary: {
    positive: number;
    neutral: number;
    negative: number;
  },
  sentimentShift: {
    positive: number;
    neutral: number;
    negative: number;
  },
  topThemes: Array<{
    name: string;
    description: string | null;
    feedbackCount: number;
  }>,
  feedback: Array<{
    id: string;
    content: string;
    channel: string;
    sentiment: "POS" | "NEU" | "NEG" | null;
    sentimentScore: number | null;
    createdAt: Date;
    feedbackThemes: Array<{
      confidence: number;
      theme: {
        id: string;
        name: string;
      };
    }>;
  }>,
) {
  const themeContext = topThemes
    .map(
      (theme, index) => `
Theme ${index + 1}
Name: ${theme.name}
Description: ${theme.description ?? "No description"}
Feedback count: ${theme.feedbackCount}
`,
    )
    .join("\n");

  const feedbackContext = feedback
    .map(
      (item, index) => `
Feedback ${index + 1}
ID: ${item.id}
Channel: ${item.channel}
Sentiment: ${item.sentiment ?? "UNKNOWN"}
Sentiment score: ${
        item.sentimentScore ?? "UNKNOWN"
      }
Date: ${item.createdAt.toISOString()}
Themes: ${
        item.feedbackThemes
          .map((itemTheme) => itemTheme.theme.name)
          .join(", ") || "None"
      }
Content: ${item.content}
`,
    )
    .join("\n");

  const system = `
You are LOOP, a Voice-of-Customer report generation assistant.

Generate a concise, leadership-ready customer feedback report.

IMPORTANT:
- Use ONLY the provided customer feedback and calculated metrics.
- Do not invent customer feedback, statistics, quotes, themes, or actions.
- Every notable quote MUST be copied exactly from the provided feedback content.
- Every quote MUST use the ID of the feedback item it came from.
- Recommended actions must be directly supported by the customer feedback.
- Do not claim something is increasing or decreasing unless the provided sentiment shift data supports it.
- Return ONLY valid JSON.
- Do not use Markdown.
- Do not wrap the JSON in code fences.

Return exactly this structure:

{
  "summary": "2-3 concise sentences.",
  "topThemes": [
    {
      "theme": "Theme name",
      "insight": "One concise sentence."
    }
  ],
  "sentimentShift": {
    "positive": "One concise sentence.",
    "neutral": "One concise sentence.",
    "negative": "One concise sentence."
  },
  "notableQuotes": [
    {
      "quote": "One exact customer quote.",
      "feedbackId": "feedback ID"
    }
  ],
  "recommendedActions": [
    "One concise action."
  ]
}

Output limits:
- summary: maximum 3 sentences.
- topThemes: maximum 5 items.
- Each theme insight: maximum 1 sentence.
- notableQuotes: maximum 3 items.
- Each quote must be copied exactly from the supplied feedback.
- recommendedActions: maximum 5 items.
- Each action must be one sentence.
- Keep the entire JSON response concise.

The report period is:
${periodStart.toISOString()} to ${periodEnd.toISOString()}
`;

  const user = `
Reporting metrics:

Total feedback:
${totalFeedback}

Current sentiment counts:
Positive: ${sentimentSummary.positive}
Neutral: ${sentimentSummary.neutral}
Negative: ${sentimentSummary.negative}

Sentiment shift compared with the previous period, in percentage points:
Positive: ${sentimentShift.positive}
Neutral: ${sentimentShift.neutral}
Negative: ${sentimentShift.negative}

Top themes:
${themeContext}

Customer feedback:
${feedbackContext}
`;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const retryInstruction =
        attempt === 1
          ? ""
          : `

IMPORTANT RETRY INSTRUCTION:

Your previous response was not valid JSON.

Return ONLY the JSON object.
Do not explain anything.
Do not say "We need to".
Do not include Markdown.
Do not include code fences.
Do not include any text before or after the JSON object.
- Never output safety notices, moderation notices, policy explanations, or commentary.
- The response must begin with the { character.
- The response must end with the } character.
`;

      const text = await callGemini(
        system + retryInstruction,
        user,
        2000,
      );

      const cleanedText = cleanJson(text);
      const parsed = JSON.parse(cleanedText);

      return vocReportSchema.parse(parsed);
    } catch (error) {
      lastError = error;

      console.error(
        `VoC report generation attempt ${attempt} failed:`,
        error,
      );

      if (attempt === 1) {
        console.log(
          "Retrying VoC report generation...",
        );
      }
    }
  }

  throw new Error(
    `VoC report generation failed after 2 attempts. ${
      lastError instanceof Error
        ? lastError.message
        : ""
    }`,
  );
}