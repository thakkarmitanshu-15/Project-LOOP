import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";


const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name must be less than 100 characters"),

  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .transform((email) => email.toLowerCase()),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100, "Password is too long"),

  workspaceName: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters long")
    .max(100, "Workspace name must be less than 100 characters"),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const validationResult = signupSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, email, password, workspaceName } = validationResult.data;

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "An account with this email already exists",
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const transactionResult = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: Role.ADMIN,
          workspaceId: workspace.id,
        },
      });

      return {
        workspace,
        user,
      };
    });

    return NextResponse.json(
      {
        message: "Account and workspace created successfully",
        user: {
          id: transactionResult.user.id,
          name: transactionResult.user.name,
          email: transactionResult.user.email,
          role: transactionResult.user.role,
          workspaceId: transactionResult.user.workspaceId,
        },
        workspace: {
          id: transactionResult.workspace.id,
          name: transactionResult.workspace.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Signup error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while creating your account",
      },
      { status: 500 },
    );
  }
}