import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not configured");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const classificationSchema = z.object({
  sentiment: z.enum(["POS", "NEU", "NEG"]),
  confidence: z.number().min(0).max(1),
});

export async function classifyFeedback(content: string) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    temperature: 0,
    system:
      "You are a customer feedback classification assistant. Analyze feedback and return only valid JSON.",
    messages: [
      {
        role: "user",
        content: `Classify this customer feedback.

Return exactly this JSON format:
{
  "sentiment": "POS" | "NEU" | "NEG",
  "confidence": 0.0
}

Feedback:
${content}`,
      },
    ],
  });

  const textBlock = response.content.find(
    (block) => block.type === "text"
  );

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text response");
  }

  const parsed = JSON.parse(textBlock.text);

  return classificationSchema.parse(parsed);
}

const askLoopSchema = z.object({
  answer: z.string().min(1),
  feedbackIds: z.array(z.string()),
});

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

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    temperature: 0,
    system: `
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
    messages: [
      {
        role: "user",
        content: `
Question:
${question}

Customer feedback context:
${context}
`,
      },
    ],
  });

  const textBlock = response.content.find(
    (block) => block.type === "text",
  );

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text response");
  }

  const cleanedText = textBlock.text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleanedText);

  return askLoopSchema.parse(parsed);
}