import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { classifyFeedback } from "@/lib/ai";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "ANALYST"
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
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
        { status: 404 },
      );
    }

    const themes = await prisma.theme.findMany({
      where: {
        workspaceId: session.user.workspaceId,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const themeNames = themes.map(
      (theme) => theme.name,
    );

    let classification;

    try {
      classification = await classifyFeedback(
        feedback.content,
        themeNames,
      );
    } catch (classificationError) {
      console.error(
        "AI classification failed:",
        classificationError,
      );

      await prisma.feedback.update({
        where: {
          id: feedback.id,
        },
        data: {
          needsManualReview: true,
        },
      });

      return NextResponse.json(
        {
          error:
            "AI classification failed after two attempts. This feedback has been flagged for manual review.",
          needsManualReview: true,
        },
        { status: 422 },
      );
    }

    const themeMap = new Map(
      themes.map((theme) => [
        theme.name.toLowerCase(),
        theme,
      ]),
    );

    const matchedThemes = classification.themes
      .map((themeName) =>
        themeMap.get(themeName.toLowerCase()),
      )
      .filter(
        (
          theme,
        ): theme is (typeof themes)[number] =>
          Boolean(theme),
      );

    await prisma.$transaction(async (tx) => {
      await tx.feedback.update({
        where: {
          id: feedback.id,
        },
        data: {
          sentiment: classification.sentiment,
          sentimentScore: classification.sentimentScore,
          featureArea: classification.featureArea,
          aiRationale: classification.rationale,
          needsManualReview: false,
        },
      });

      await tx.feedbackTheme.deleteMany({
        where: {
          feedbackId: feedback.id,
        },
      });

      if (matchedThemes.length > 0) {
        await tx.feedbackTheme.createMany({
          data: matchedThemes.map((theme) => ({
            feedbackId: feedback.id,
            themeId: theme.id,
            confidence: 1,
          })),
        });
      }
    });

    return NextResponse.json({
      message: "Feedback classified successfully",

      classification,

      themes: matchedThemes.map((theme) => ({
        id: theme.id,
        name: theme.name,
      })),

      needsManualReview: false,
    });
  } catch (error) {
    console.error(
      "Feedback classification route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to classify feedback",
      },
      { status: 500 },
    );
  }
}