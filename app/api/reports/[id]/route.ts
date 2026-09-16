import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  context: {
    params: {
      id: string;
    };
  },
) {
  try {
    const session =
      await getServerSession(authOptions);

    if (
      !session?.user?.id ||
      !session.user.workspaceId
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const report =
      await prisma.report.findFirst({
        where: {
          id: context.params.id,
          workspaceId:
            session.user.workspaceId,
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

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      report,
    });
  } catch (error) {
    console.error(
      "Report GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load report",
      },
      { status: 500 },
    );
  }
}