import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { classifyFeedback } from "@/lib/ai";

type RouteContext = {
  params: {
    id: string;
  };
};

type WorkspaceTheme = {
  id: string;
  name: string;
  color: string | null;
};

/*
 * Resolve AI-returned theme names against the current workspace.
 *
 * Existing themes are reused.
 * New themes proposed by the AI are created in this workspace.
 */
async function resolveFeedbackThemes(
  classificationThemes: string[],
  workspaceId: string,
): Promise<WorkspaceTheme[]> {
  const resolvedThemes: WorkspaceTheme[] = [];

  for (const rawThemeName of classificationThemes) {
    const themeName = rawThemeName.trim();

    if (!themeName) {
      continue;
    }

    /*
     * Reuse an existing workspace theme.
     * Comparison is case-insensitive.
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
     * Create a new workspace theme when the AI proposes
     * a theme that does not already exist.
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

    const workspaceId = session.user.workspaceId;

    /*
     * Step 1:
     * Find the feedback inside the current workspace.
     */
    const feedback = await prisma.feedback.findFirst({
      where: {
        id: params.id,
        workspaceId,
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
     * Existing themes are supplied to the AI so that
     * it can prefer reusing them.
     */
    const themes = await prisma.theme.findMany({
      where: {
        workspaceId,
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
      (theme: { id: string; name: string }) =>
        theme.name,
    );

    /*
     * Step 3:
     * Ask the AI to classify the feedback.
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
       * Keep the feedback but flag it for manual review.
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
     * Resolve AI-generated themes against the workspace.
     */
    let resolvedThemes: WorkspaceTheme[];

    try {
      resolvedThemes = await resolveFeedbackThemes(
        classification.themes,
        workspaceId,
      );
    } catch (themeError) {
      console.error(
        "Theme resolution failed:",
        themeError,
      );

      /*
       * Preserve the AI classification even if theme
       * persistence fails.
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
     * Persist classification and theme relationships
     * atomically.
     */
    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.feedback.update({
          where: {
            id: feedback.id,
          },
          data: {
            sentiment: classification.sentiment,
            sentimentScore:
              classification.sentimentScore,
            featureArea:
              classification.featureArea,
            aiRationale:
              classification.rationale,
            needsManualReview: false,
          },
        });

        /*
         * Remove old theme assignments first.
         *
         * This makes re-classification replace the
         * previous assignments instead of accumulating them.
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
      },
    );

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