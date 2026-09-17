import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { generateVocReport } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const reportQuerySchema = z.object({
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
});

const reportGenerationSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
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

    const periodEnd = validation.data.periodEnd
      ? new Date(validation.data.periodEnd)
      : new Date(now);

    const periodStart = validation.data.periodStart
      ? new Date(validation.data.periodStart)
      : new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000,
        );

    /*
     * The Reports UI sends calendar dates such as:
     *
     * 2026-08-18
     * 2026-09-17
     *
     * Normalize them to cover the complete selected days.
     */
    if (validation.data.periodStart) {
      periodStart.setUTCHours(0, 0, 0, 0);
    }

    if (validation.data.periodEnd) {
      periodEnd.setUTCHours(23, 59, 59, 999);
    }

    if (periodStart > periodEnd) {
      return NextResponse.json(
        { error: "Period start must be before period end" },
        { status: 400 },
      );
    }

    const periodDuration =
      periodEnd.getTime() - periodStart.getTime();

    const previousPeriodEnd = new Date(
      periodStart.getTime(),
    );

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
              (
                (positiveFeedback / totalFeedback) *
                100
              ).toFixed(1),
            ),
            neutral: Number(
              (
                (neutralFeedback / totalFeedback) *
                100
              ).toFixed(1),
            ),
            negative: Number(
              (
                (negativeFeedback / totalFeedback) *
                100
              ).toFixed(1),
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
              (
                (previousPositiveFeedback /
                  previousTotal) *
                100
              ).toFixed(1),
            ),
            neutral: Number(
              (
                (previousNeutralFeedback /
                  previousTotal) *
                100
              ).toFixed(1),
            ),
            negative: Number(
              (
                (previousNegativeFeedback /
                  previousTotal) *
                100
              ).toFixed(1),
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
          sentimentRate.positive -
          previousSentimentRate.positive
        ).toFixed(1),
      ),

      neutral: Number(
        (
          sentimentRate.neutral -
          previousSentimentRate.neutral
        ).toFixed(1),
      ),

      negative: Number(
        (
          sentimentRate.negative -
          previousSentimentRate.negative
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

      topThemes: themes.map(
        (theme: {
          id: string;
          name: string;
          description: string | null;
          color: string | null;
          _count: {
            feedbackThemes: number;
          };
        }) => ({
          id: theme.id,
          name: theme.name,
          description: theme.description,
          color: theme.color,
          feedbackCount: theme._count.feedbackThemes,
        }),
      ),

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

export async function POST(request: Request) {
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

    const body = await request.json();

    const validation =
      reportGenerationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid report period" },
        { status: 400 },
      );
    }

    const { periodStart, periodEnd } =
      validation.data;

    if (periodStart > periodEnd) {
      return NextResponse.json(
        {
          error:
            "Period start must be before end date",
        },
        { status: 400 },
      );
    }

    const workspaceId =
      session.user.workspaceId;

    const feedbackWhere = {
      workspaceId,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    };

    const previousPeriodDuration =
      periodEnd.getTime() -
      periodStart.getTime();

    const previousPeriodEnd =
      new Date(periodStart.getTime());

    const previousPeriodStart =
      new Date(
        periodStart.getTime() -
          previousPeriodDuration,
      );

    const [
      totalFeedback,
      positiveFeedback,
      neutralFeedback,
      negativeFeedback,
      previousPositiveFeedback,
      previousNeutralFeedback,
      previousNegativeFeedback,
      themes,
      feedback,
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
          workspaceId,
          createdAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd,
          },
          sentiment: "POS",
        },
      }),

      prisma.feedback.count({
        where: {
          workspaceId,
          createdAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd,
          },
          sentiment: "NEU",
        },
      }),

      prisma.feedback.count({
        where: {
          workspaceId,
          createdAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd,
          },
          sentiment: "NEG",
        },
      }),

      prisma.theme.findMany({
        where: {
          workspaceId,
        },
        select: {
          id: true,
          name: true,
          description: true,
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
        take: 50,
      }),
    ]);

    if (totalFeedback === 0) {
      return NextResponse.json(
        {
          error:
            "No feedback exists for the selected period.",
        },
        { status: 400 },
      );
    }

    const currentTotal =
      positiveFeedback +
      neutralFeedback +
      negativeFeedback;

    const previousTotal =
      previousPositiveFeedback +
      previousNeutralFeedback +
      previousNegativeFeedback;

    const sentimentRate =
      currentTotal > 0
        ? {
            positive:
              (positiveFeedback /
                currentTotal) *
              100,

            neutral:
              (neutralFeedback /
                currentTotal) *
              100,

            negative:
              (negativeFeedback /
                currentTotal) *
              100,
          }
        : {
            positive: 0,
            neutral: 0,
            negative: 0,
          };

    const previousSentimentRate =
      previousTotal > 0
        ? {
            positive:
              (previousPositiveFeedback /
                previousTotal) *
              100,

            neutral:
              (previousNeutralFeedback /
                previousTotal) *
              100,

            negative:
              (previousNegativeFeedback /
                previousTotal) *
              100,
          }
        : {
            positive: 0,
            neutral: 0,
            negative: 0,
          };

    const sentimentShift = {
      positive: Number(
        (
          sentimentRate.positive -
          previousSentimentRate.positive
        ).toFixed(1),
      ),

      neutral: Number(
        (
          sentimentRate.neutral -
          previousSentimentRate.neutral
        ).toFixed(1),
      ),

      negative: Number(
        (
          sentimentRate.negative -
          previousSentimentRate.negative
        ).toFixed(1),
      ),
    };

    const report = await generateVocReport(
      periodStart,
      periodEnd,
      totalFeedback,
      {
        positive: positiveFeedback,
        neutral: neutralFeedback,
        negative: negativeFeedback,
      },
      sentimentShift,
      themes.map(
        (theme: {
          id: string;
          name: string;
          description: string | null;
          _count: {
            feedbackThemes: number;
          };
        }) => ({
          name: theme.name,
          description: theme.description,
          feedbackCount:
            theme._count.feedbackThemes,
        }),
      ),
      feedback,
    );

    const savedReport =
      await prisma.report.create({
        data: {
          title: `Voice of Customer Report — ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}`,
          periodStart,
          periodEnd,
          contentJson: report,
          workspaceId,
          generatedBy: session.user.id,
        },

        select: {
          id: true,
          title: true,
          periodStart: true,
          periodEnd: true,
          contentJson: true,
          createdAt: true,
          generatedBy: true,
        },
      });

    return NextResponse.json(
      {
        message: "Report generated successfully",
        report: savedReport,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Reports POST error:",
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to generate report",
      },
      { status: 500 },
    );
  }
}