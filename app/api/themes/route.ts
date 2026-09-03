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

    const themes = await prisma.theme.findMany({
      where: {
        workspaceId: session.user.workspaceId,
      },
      orderBy: {
        name: "asc",
      },
     select: {
        id: true,
        name: true,
        description: true,
        color: true,
        _count: {
            select: {
            feedbackThemes: true,
            },
  },
},
    });

    return NextResponse.json({
      themes,
    });
  } catch (error) {
    console.error("Themes error:", error);

    return NextResponse.json(
      { error: "Failed to load themes" },
      { status: 500 }
    );
  }
}