import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());

  return values;
}

const csvRowSchema = z.object({
  content: z.string().min(1, "Feedback content is required"),
  channel: z.string().min(1, "Channel is required"),
  customerLabel: z.string().optional(),
  sourceRef: z.string().optional(),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(["NEW", "REVIEWED", "ACTIONED"]).optional(),
  sentiment: z.enum(["POS", "NEU", "NEG"]).optional(),
  channel: z.string().trim().optional(),
  themeId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);

    const queryResult = querySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sentiment: searchParams.get("sentiment") ?? undefined,
      channel: searchParams.get("channel") ?? undefined,
      themeId: searchParams.get("themeId") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: queryResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const {
      page,
      limit,
      search,
      status,
      sentiment,
      channel,
      themeId,
      dateFrom,
      dateTo,
    } = queryResult.data;

    const where = {
      workspaceId: session.user.workspaceId,

      ...(search
        ? {
            content: {
              contains: search,
              mode: "insensitive" as const,
            },
          }
        : {}),

      ...(status
        ? {
            status,
          }
        : {}),

      ...(sentiment
        ? {
            sentiment,
          }
        : {}),

      ...(channel
        ? {
            channel,
          }
        : {}),

      ...(themeId
        ? {
            feedbackThemes: {
              some: {
                themeId,
              },
            },
          }
        : {}),

      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom
                ? {
                    gte: new Date(`${dateFrom}T00:00:00.000Z`),
                  }
                : {}),
              ...(dateTo
                ? {
                    lte: new Date(`${dateTo}T23:59:59.999Z`),
                  }
                : {}),
            },
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
        select: {
          id: true,
          content: true,
          channel: true,
          sourceRef: true,
          customerLabel: true,
          sentiment: true,
          sentimentScore: true,
          status: true,
          createdAt: true,
          feedbackThemes: {
            select: {
              confidence: true,
              theme: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      }),

      prisma.feedback.count({ where }),
    ]);

    return NextResponse.json({
      feedback,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Feedback API error:", error);

    return NextResponse.json(
      { error: "Something went wrong while fetching feedback" },
      { status: 500 },
    );
  }
}


const createFeedbackSchema = z.object({
  content: z.string().min(1, "Feedback content is required"),
  channel: z.string().min(1, "Channel is required"),
  sourceRef: z.string().optional(),
  customerLabel: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "ANALYST"
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const result = createFeedbackSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid feedback data",
          details: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const feedback = await prisma.feedback.create({
      data: {
        content: result.data.content,
        channel: result.data.channel,
        sourceRef: result.data.sourceRef || null,
        customerLabel: result.data.customerLabel || null,
        workspaceId: session.user.workspaceId,
      },
      select: {
        id: true,
        content: true,
        channel: true,
        sourceRef: true,
        customerLabel: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { feedback },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create feedback API error:", error);

    return NextResponse.json(
      { error: "Something went wrong while creating feedback" },
      { status: 500 }
    );
  }
}


export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role === "VIEWER") {
      return NextResponse.json(
        { error: "You do not have permission to update feedback" },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();

    const updateSchema = z.object({
      id: z.string().min(1),
      status: z.enum(["NEW", "REVIEWED", "ACTIONED"]),
    });

    const validationResult = updateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { id, status } = validationResult.data;

    const existingFeedback = await prisma.feedback.findFirst({
      where: {
        id,
        workspaceId: session.user.workspaceId,
      },
    });

    if (!existingFeedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 },
      );
    }

    const updatedFeedback = await prisma.feedback.update({
      where: {
        id,
      },
      data: {
        status,
      },
      select: {
        id: true,
        status: true,
      },
    });

    return NextResponse.json({
      message: "Feedback status updated successfully",
      feedback: updatedFeedback,
    });
  } catch (error) {
    console.error("Feedback update error:", error);

    return NextResponse.json(
      { error: "Something went wrong while updating feedback" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "ANALYST"
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (typeof body.csv !== "string" || !body.csv.trim()) {
      return NextResponse.json(
        { error: "CSV data is required" },
        { status: 400 }
      );
    }

    const lines = body.csv
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);

    if (lines.length < 2) {
      return NextResponse.json(
        {
          error:
            "CSV must contain a header and at least one data row",
        },
        { status: 400 }
      );
    }

    const headers = parseCsvLine(lines[0]).map((header) =>
      header.trim()
    );

    const expectedHeaders = [
      "content",
      "channel",
      "customerLabel",
      "sourceRef",
    ];

    if (
      headers.length !== expectedHeaders.length ||
      !expectedHeaders.every(
        (header, index) => headers[index] === header
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid CSV headers. Expected: content,channel,customerLabel,sourceRef",
        },
        { status: 400 }
      );
    }

    const validRows: {
      content: string;
      channel: string;
      customerLabel?: string;
      sourceRef?: string;
    }[] = [];

    const errors: {
      row: number;
      error: string;
    }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);

      if (values.length !== expectedHeaders.length) {
        errors.push({
          row: i + 1,
          error: "Incorrect number of columns",
        });
        continue;
      }

      const result = csvRowSchema.safeParse({
        content: values[0],
        channel: values[1],
        customerLabel: values[2] || undefined,
        sourceRef: values[3] || undefined,
      });

      if (!result.success) {
        errors.push({
          row: i + 1,
          error: "Invalid feedback data",
        });
        continue;
      }

      validRows.push(result.data);
    }

    if (validRows.length === 0) {
      return NextResponse.json(
        {
          error: "No valid feedback rows found",
          imported: 0,
          errors,
        },
        { status: 400 }
      );
    }

    const result = await prisma.feedback.createMany({
      data: validRows.map((row) => ({
        content: row.content,
        channel: row.channel,
        customerLabel: row.customerLabel || null,
        sourceRef: row.sourceRef || null,
        workspaceId: session.user.workspaceId,
      })),
    });

    return NextResponse.json({
      message: "CSV imported successfully",
      imported: result.count,
      errors,
    });
  } catch (error) {
    console.error("CSV import API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while importing CSV",
      },
      { status: 500 }
    );
  }
}