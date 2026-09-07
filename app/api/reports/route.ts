import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";


const reportQuerySchema = z.object({
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);

    const validation = reportQuerySchema.safeParse({
      periodStart: searchParams.get("periodStart") ?? undefined,
      periodEnd: searchParams.get("periodEnd") ?? undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid report period" },
        { status: 400 },
      );
    }

    const now = new Date();

    const periodEnd = validation.data.periodEnd ?? now;

    const periodStart =
      validation.data.periodStart ??
      new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (periodStart > periodEnd) {
      return NextResponse.json(
        { error: "Period start must be before period end" },
        { status: 400 },
      );
    }

        const periodDuration =
            periodEnd.getTime() - periodStart.getTime();

            const previousPeriodEnd = new Date(periodStart.getTime());

            const previousPeriodStart = new Date(
            periodStart.getTime() - periodDuration,
            );

    /*
     * Every query below is scoped to the authenticated workspace.
     */

    const feedbackWhere = {
      workspaceId: session.user.workspaceId,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    };

   const [
  totalFeedback,
  positiveFeedback,
  neutralFeedback,
  negativeFeedback,
  previousPositiveFeedback,
  previousNeutralFeedback,
  previousNegativeFeedback,
  themes,
  recentFeedback,
  reports,
] = await Promise.all([
  prisma.feedback.count({
    where: feedbackWhere,
  }),

  prisma.feedback.count({
    where: {
      ...feedbackWhere,
      sentiment: "POS",
    },
  }),

  prisma.feedback.count({
    where: {
      ...feedbackWhere,
      sentiment: "NEU",
    },
  }),

  prisma.feedback.count({
    where: {
      ...feedbackWhere,
      sentiment: "NEG",
    },
  }),

  prisma.feedback.count({
    where: {
      workspaceId: session.user.workspaceId,
      createdAt: {
        gte: previousPeriodStart,
        lte: previousPeriodEnd,
      },
      sentiment: "POS",
    },
  }),

  prisma.feedback.count({
    where: {
      workspaceId: session.user.workspaceId,
      createdAt: {
        gte: previousPeriodStart,
        lte: previousPeriodEnd,
      },
      sentiment: "NEU",
    },
  }),

  prisma.feedback.count({
    where: {
      workspaceId: session.user.workspaceId,
      createdAt: {
        gte: previousPeriodStart,
        lte: previousPeriodEnd,
      },
      sentiment: "NEG",
    },
  }),

  prisma.theme.findMany({
    where: {
      workspaceId: session.user.workspaceId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      _count: {
        select: {
          feedbackThemes: {
            where: {
              feedback: {
                createdAt: {
                  gte: periodStart,
                  lte: periodEnd,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      feedbackThemes: {
        _count: "desc",
      },
    },
    take: 10,
  }),

  prisma.feedback.findMany({
    where: feedbackWhere,
    select: {
      id: true,
      content: true,
      channel: true,
      sentiment: true,
      sentimentScore: true,
      createdAt: true,
      feedbackThemes: {
        select: {
          confidence: true,
          theme: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  }),

  prisma.report.findMany({
    where: {
      workspaceId: session.user.workspaceId,
    },
    select: {
      id: true,
      title: true,
      periodStart: true,
      periodEnd: true,
      createdAt: true,
      generatedBy: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  }),
]);

    const sentimentRate =
      totalFeedback > 0
        ? {
            positive: Number(
              ((positiveFeedback / totalFeedback) * 100).toFixed(1),
            ),
            neutral: Number(
              ((neutralFeedback / totalFeedback) * 100).toFixed(1),
            ),
            negative: Number(
              ((negativeFeedback / totalFeedback) * 100).toFixed(1),
            ),
          }
        : {
            positive: 0,
            neutral: 0,
            negative: 0,
          };

          const previousTotal =
  previousPositiveFeedback +
  previousNeutralFeedback +
  previousNegativeFeedback;

const previousSentimentRate =
  previousTotal > 0
    ? {
        positive: Number(
          ((previousPositiveFeedback / previousTotal) * 100).toFixed(1),
        ),
        neutral: Number(
          ((previousNeutralFeedback / previousTotal) * 100).toFixed(1),
        ),
        negative: Number(
          ((previousNegativeFeedback / previousTotal) * 100).toFixed(1),
        ),
      }
    : {
        positive: 0,
        neutral: 0,
        negative: 0,
      };

const sentimentShift = {
    positive: Number(
        (
        sentimentRate.positive - previousSentimentRate.positive
        ).toFixed(1),
    ),
    neutral: Number(
        (
        sentimentRate.neutral - previousSentimentRate.neutral
        ).toFixed(1),
    ),
    negative: Number(
        (
        sentimentRate.negative - previousSentimentRate.negative
        ).toFixed(1),
    ),
    };

    return NextResponse.json({
      period: {
        start: periodStart,
        end: periodEnd,
      },

      summary: {
        totalFeedback,
        positiveFeedback,
        neutralFeedback,
        negativeFeedback,
        sentimentRate,

        previousPeriod: {
            start: previousPeriodStart,
            end: previousPeriodEnd,
            totalFeedback: previousTotal,
            sentimentRate: previousSentimentRate,
        },

        sentimentShift,
},

      topThemes: themes.map((theme) => ({
        id: theme.id,
        name: theme.name,
        description: theme.description,
        color: theme.color,
        feedbackCount: theme._count.feedbackThemes,
      })),

      recentFeedback,

      reports,
    });
  } catch (error) {
    console.error("Reports GET error:", error);

    return NextResponse.json(
      { error: "Failed to load report data" },
      { status: 500 },
    );
  }

  
}


