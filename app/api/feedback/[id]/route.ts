import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const feedback = await prisma.feedback.findFirst({
      where: {
        id: context.params.id,
        workspaceId: session.user.workspaceId,
      },
      select: {
        id: true,
        content: true,
        channel: true,
        sourceRef: true,
        customerLabel: true,
        sentiment: true,
        sentimentScore: true,
        status: true,
        createdAt: true,
        feedbackThemes: {
          select: {
            confidence: true,
            theme: {
              select: {
                id: true,
                name: true,
                description: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Feedback detail API error:", error);

    return NextResponse.json(
      { error: "Something went wrong while fetching feedback" },
      { status: 500 },
    );
  }
}