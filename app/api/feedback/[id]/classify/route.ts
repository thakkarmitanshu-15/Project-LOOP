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

/*
 * Resolve AI-returned theme names against the current workspace.
 *
 * If a theme already exists, reuse it.
 * If the AI proposes a new theme, create it in this workspace.
 */
async function resolveFeedbackThemes(
  classificationThemes: string[],
  workspaceId: string,
) {
  const resolvedThemes: Array<{
    id: string;
    name: string;
    color: string | null;
  }> = [];

  for (const rawThemeName of classificationThemes) {
    const themeName = rawThemeName.trim();

    if (!themeName) {
      continue;
    }

    /*
     * First try to find an existing theme.
     *
     * The comparison is case-insensitive so:
     * "Delivery Issues"
     * "delivery issues"
     * "DELIVERY ISSUES"
     *
     * all resolve to the same workspace theme.
     */
    const existingTheme = await prisma.theme.findFirst({
      where: {
        workspaceId,
        name: {
          equals: themeName,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });

    if (existingTheme) {
      if (
        !resolvedThemes.some(
          (theme) => theme.id === existingTheme.id,
        )
      ) {
        resolvedThemes.push(existingTheme);
      }

      continue;
    }

    /*
     * The AI returned a theme that does not yet exist
     * in this workspace.
     *
     * Create it so the theme becomes a real persistent
     * workspace theme and can be reused later.
     */
    const newTheme = await prisma.theme.create({
      data: {
        name: themeName,
        workspaceId,
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });

    resolvedThemes.push(newTheme);
  }

  return resolvedThemes;
}

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

    /*
     * Step 1:
     * Find the feedback inside the current workspace.
     *
     * The workspace check prevents users from classifying
     * feedback belonging to another workspace.
     */
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

    /*
     * Step 2:
     * Load the current workspace themes.
     *
     * These are supplied to the AI so it can prefer
     * reusing existing themes.
     */
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

    /*
     * Step 3:
     * Ask AI to classify the feedback.
     */
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

      /*
       * The feedback remains in the database.
       * We only flag it for manual review.
       */
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

    /*
     * Step 4:
     * Resolve the AI's themes.
     *
     * Existing themes are reused.
     * New AI-proposed themes are created.
     */
    let resolvedThemes;

    try {
      resolvedThemes = await resolveFeedbackThemes(
        classification.themes,
        session.user.workspaceId,
      );
    } catch (themeError) {
      console.error(
        "Theme resolution failed:",
        themeError,
      );

      /*
       * We do not want to lose the classification just
       * because theme persistence failed.
       */
      await prisma.feedback.update({
        where: {
          id: feedback.id,
        },
        data: {
          sentiment: classification.sentiment,
          sentimentScore:
            classification.sentimentScore,
          featureArea: classification.featureArea,
          aiRationale: classification.rationale,
          needsManualReview: true,
        },
      });

      return NextResponse.json(
        {
          error:
            "AI classification succeeded, but the theme could not be saved. The feedback has been flagged for manual review.",
          needsManualReview: true,
          classification,
        },
        { status: 422 },
      );
    }

    /*
     * Step 5:
     * Persist the classification and theme relationships
     * atomically.
     */
    await prisma.$transaction(async (tx) => {
      await tx.feedback.update({
        where: {
          id: feedback.id,
        },
        data: {
          sentiment: classification.sentiment,
          sentimentScore:
            classification.sentimentScore,
          featureArea: classification.featureArea,
          aiRationale: classification.rationale,
          needsManualReview: false,
        },
      });

      /*
       * Remove old theme assignments first.
       *
       * This makes re-classification replace the previous
       * theme assignment instead of accumulating duplicates.
       */
      await tx.feedbackTheme.deleteMany({
        where: {
          feedbackId: feedback.id,
        },
      });

      /*
       * Attach the newly resolved themes.
       */
      if (resolvedThemes.length > 0) {
        await tx.feedbackTheme.createMany({
          data: resolvedThemes.map((theme) => ({
            feedbackId: feedback.id,
            themeId: theme.id,
            confidence: 1,
          })),
        });
      }
    });

    /*
     * Step 6:
     * Return the persisted classification and themes.
     */
    return NextResponse.json({
      message: "Feedback classified successfully",

      classification,

      themes: resolvedThemes.map((theme) => ({
        id: theme.id,
        name: theme.name,
        color: theme.color,
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