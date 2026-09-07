import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateRoleSchema = z.object({
  role: z.enum(["ANALYST", "VIEWER"]),
});

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    const body = await request.json();

    const validation = updateRoleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 },
      );
    }

    const { role } = validation.data;

    // Never allow an Admin to change their own role.
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 },
      );
    }

    const member = await prisma.user.findFirst({
      where: {
        id: params.id,
        workspaceId: session.user.workspaceId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Workspace member not found" },
        { status: 404 },
      );
    }

    const updatedMember = await prisma.user.update({
      where: {
        id: member.id,
      },
      data: {
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      message: "Member role updated successfully",
      user: updatedMember,
    });
  } catch (error) {
    console.error("Workspace member role update error:", error);

    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 },
    );
  }
}