import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { retrieveFeedback } from "@/lib/feedback-retrieval";
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

    /*
     * Temporary retrieval strategy:
     * Search feedback text within the authenticated user's workspace.
     *
     * This is the foundation for Ask LOOP.
     * Semantic embedding retrieval will be added later.
     */
   const feedback = await retrieveFeedback(
        session.user.workspaceId,
        question,
          10,
    );

   if (feedback.length === 0) {
  return NextResponse.json({
    question,
    answer:
      "I could not find enough relevant feedback to answer that question.",
    feedbackIds: [],
    feedback: [],
  });
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
    console.error("Ask LOOP retrieval error:", error);

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Failed to retrieve feedback",
    },
    { status: 500 },
  );
  }
}