import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const workspaceId = session.user.workspaceId;

    const [
      totalFeedback,
      positiveFeedback,
      neutralFeedback,
      negativeFeedback,
      channelGroups,
      statusGroups,
      dailyFeedback,
      themeFeedback,
    ] = await Promise.all([
      prisma.feedback.count({
        where: {
          workspaceId,
        },
      }),

      prisma.feedback.count({
        where: {
          workspaceId,
          sentiment: "POS",
        },
      }),

      prisma.feedback.count({
        where: {
          workspaceId,
          sentiment: "NEU",
        },
      }),

      prisma.feedback.count({
        where: {
          workspaceId,
          sentiment: "NEG",
        },
      }),

      prisma.feedback.groupBy({
        by: ["channel"],
        where: {
          workspaceId,
        },
        _count: {
          _all: true,
        },
        orderBy: {
          _count: {
            channel: "desc",
          },
        },
      }),

      prisma.feedback.groupBy({
        by: ["status"],
        where: {
          workspaceId,
        },
        _count: {
          _all: true,
        },
      }),

      prisma.feedback.findMany({
        where: {
          workspaceId,
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),

      prisma.feedbackTheme.findMany({
      where: {
        feedback: {
          workspaceId,
        },
      },
      select: {
        theme: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        feedback: {
          select: {
            createdAt: true,
          },
        },
      },
      orderBy: {
        feedback: {
          createdAt: "asc",
        },
      },
    }),
    ]);

    const sentimentTotal =
      positiveFeedback +
      neutralFeedback +
      negativeFeedback;

    const sentimentPercentages = {
      positive:
        sentimentTotal > 0
          ? Number(((positiveFeedback / sentimentTotal) * 100).toFixed(1))
          : 0,

      neutral:
        sentimentTotal > 0
          ? Number(((neutralFeedback / sentimentTotal) * 100).toFixed(1))
          : 0,

      negative:
        sentimentTotal > 0
          ? Number(((negativeFeedback / sentimentTotal) * 100).toFixed(1))
          : 0,
    };

    const feedbackByChannel = channelGroups.map(
  (group: {
    channel: string;
    _count: {
      _all: number;
    };
  }) => ({
    channel: group.channel,
    count: group._count._all,
  }),
);

    const feedbackByStatus = statusGroups.map((group) => ({
      status: group.status,
      count: group._count._all,
    }));

    const feedbackByDateMap = new Map<string, number>();

    for (const feedback of dailyFeedback) {
      const date = feedback.createdAt.toISOString().slice(0, 10);

      feedbackByDateMap.set(
        date,
        (feedbackByDateMap.get(date) || 0) + 1
      );
    }

    const feedbackOverTime = Array.from(
      feedbackByDateMap.entries()
    ).map(([date, count]) => ({
      date,
      count,
    }));

    const themeFeedbackMap = new Map<
        string,
        {
          themeId: string;
          theme: string;
          color: string | null;
          dates: Map<string, number>;
        }
      >();

      for (const item of themeFeedback) {
        const date = item.feedback.createdAt
          .toISOString()
          .slice(0, 10);

        const existing = themeFeedbackMap.get(item.theme.id);

        if (existing) {
          existing.dates.set(
            date,
            (existing.dates.get(date) || 0) + 1
          );
        } else {
          themeFeedbackMap.set(item.theme.id, {
            themeId: item.theme.id,
            theme: item.theme.name,
            color: item.theme.color,
            dates: new Map([[date, 1]]),
          });
        }
      }

      const themeTrends = Array.from(
        themeFeedbackMap.values()
      ).flatMap((theme) =>
        Array.from(theme.dates.entries()).map(
          ([date, count]) => ({
            themeId: theme.themeId,
            theme: theme.theme,
            color: theme.color,
            date,
            count,
          })
        )
      );

    return NextResponse.json({
      summary: {
        totalFeedback,
        positiveFeedback,
        neutralFeedback,
        negativeFeedback,
        sentimentPercentages,
      },

      feedbackByChannel,

      feedbackByStatus,

      feedbackOverTime,

      themeTrends,
    });
  } catch (error) {
    console.error("Analytics error:", error);

    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 }
    );
  }
}