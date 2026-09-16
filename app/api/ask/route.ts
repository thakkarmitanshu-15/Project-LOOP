import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import {
  retrieveFeedback,
  retrieveFeedbackSemantically,
} from "@/lib/feedback-retrieval";
import { askLoop } from "@/lib/ai";


const askSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Question must be at least 3 characters")
    .max(500, "Question is too long"),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();

    const validation = askSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.issues[0]?.message ?? "Invalid question",
        },
        { status: 400 },
      );
    }

    const { question } = validation.data;

    
 const normalizedQuestion =
  question.toLowerCase();

const complaintIntent =
  normalizedQuestion.includes("complaint") ||
  normalizedQuestion.includes("complain") ||
  normalizedQuestion.includes("problem") ||
  normalizedQuestion.includes("issue") ||
  normalizedQuestion.includes("frustrat") ||
  normalizedQuestion.includes("negative") ||
  normalizedQuestion.includes("bad") ||
  normalizedQuestion.includes("worst") ||
  normalizedQuestion.includes("pain point");

let feedback;

if (complaintIntent) {
  feedback = await prisma.feedback.findMany({
    where: {
      workspaceId: session.user.workspaceId,
      sentiment: "NEG",
    },
    select: {
      id: true,
      content: true,
      channel: true,
      sentiment: true,
      sentimentScore: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  if (feedback.length === 0) {
    const semanticFeedback =
      await retrieveFeedbackSemantically(
        session.user.workspaceId,
        question,
        10,
      );

    feedback = semanticFeedback.map(
      ({ similarity, ...item }) => item,
    );
  }
} else {
  const semanticFeedback =
    await retrieveFeedbackSemantically(
      session.user.workspaceId,
      question,
      10,
    );

  if (semanticFeedback.length > 0) {
    feedback = semanticFeedback.map(
      ({ similarity, ...item }) => item,
    );
  } else {
    feedback = await retrieveFeedback(
      session.user.workspaceId,
      question,
      10,
    );
  }
}

const result = await askLoop(question, feedback);

const feedbackById = new Map(
  feedback.map((item) => [item.id, item]),
);

const citedFeedback = result.feedbackIds
  .map((id) => feedbackById.get(id))
  .filter((item): item is (typeof feedback)[number] => Boolean(item));

return NextResponse.json({
  question,
  answer: result.answer,
  feedbackIds: result.feedbackIds,
  feedback: citedFeedback,
});
  } catch (error) {
  console.error("Ask LOOP error:", error);

  if (error instanceof Error) {
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
  }

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Ask LOOP request failed",
    },
    { status: 500 },
  );
}
}
/**curl.exe -X POST "https://co.agentrouter.org/v1/messages" -H "x-api-key: sk-Mmvs30ym7LYtzmg9bMXjUMcZcEmlHez3DVFuCdbGh8jIcSug" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" -d "{\"model\":\"claude-opus-4-8\",\"max_tokens\":50,\"messages\":[{\"role\":\"user\",\"content\":\"Reply with only: LOOP OK\"}]}" */