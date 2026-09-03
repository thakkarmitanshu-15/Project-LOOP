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