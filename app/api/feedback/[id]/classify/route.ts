import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { classifyFeedback } from "@/lib/ai";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "ANALYST"
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const feedback = await prisma.feedback.findFirst({
      where: {
        id: params.id,
        workspaceId: session.user.workspaceId,
      },
      select: {
        id: true,
        content: true,
      },
    });

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    const result = await classifyFeedback(feedback.content);

    const updatedFeedback = await prisma.feedback.update({
      where: {
        id: feedback.id,
      },
      data: {
        sentiment: result.sentiment,
        sentimentScore: result.confidence,
      },
      select: {
        id: true,
        sentiment: true,
        sentimentScore: true,
      },
    });

    return NextResponse.json({
      message: "Feedback classified successfully",
      feedback: updatedFeedback,
    });
  } catch (error) {
    console.error("Feedback classification error:", error);

    return NextResponse.json(
      { error: "Failed to classify feedback" },
      { status: 500 }
    );
  }
}