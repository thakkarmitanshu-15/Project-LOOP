import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { classifyFeedback } from "@/lib/ai";
import { generateEmbedding } from "@/lib/embeddings";

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
                    gte: new Date(
                      `${dateFrom}T00:00:00.000Z`,
                    ),
                  }
                : {}),
              ...(dateTo
                ? {
                    lte: new Date(
                      `${dateTo}T23:59:59.999Z`,
                    ),
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
          featureArea: true,
          aiRationale: true,
          needsManualReview: true,
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

async function generateAndSaveEmbedding(
  feedbackId: string,
  content: string,
) {
  try {
    const vector = await generateEmbedding(content);

    await prisma.embedding.upsert({
      where: {
        feedbackId,
      },
      update: {
        vector: JSON.stringify(vector),
      },
      create: {
        feedbackId,
        vector: JSON.stringify(vector),
      },
    });

    return true;
  } catch (error) {
    console.error(
      `Embedding generation failed for feedback ${feedbackId}:`,
      error,
    );

    return false;
  }
}

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
    if (!themeName) continue;

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

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.workspaceId) {
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

    const result = createFeedbackSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid feedback data",
          details: result.error.flatten(),
        },
        { status: 400 },
      );
    }

    /*
     * Step 1:
     * Save the feedback first.
     *
     * Feedback must never be lost because an AI service
     * or embedding service is unavailable.
     */
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

    /*
     * Step 2:
     * Generate and save the semantic embedding.
     *
     * Embedding failure must not prevent the feedback
     * from being created.
     */
    const embeddingSaved = await generateAndSaveEmbedding(
      feedback.id,
      feedback.content,
    );

    /*
     * Step 3:
     * Automatically classify the newly created feedback.
     */
    try {
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

      const classification = await classifyFeedback(
        feedback.content,
        themes.map((theme) => theme.name),
      );

      /*
       * Reuse an existing workspace theme when possible.
       * If Claude suggests a genuinely new theme, create it
       * inside this workspace and assign the feedback to it.
       */
      const matchedThemes = await resolveFeedbackThemes(
        classification.themes,
        session.user.workspaceId,
      );

      /*
       * Step 4:
       * Save the AI classification and theme relationships.
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

        if (matchedThemes.length > 0) {
          await tx.feedbackTheme.createMany({
            data: matchedThemes.map((theme) => ({
              feedbackId: feedback.id,
              themeId: theme.id,
              confidence: 1,
            })),
          });
        }
      });

      /*
       * Step 5:
       * Return the newly created feedback together with
       * its AI classification and embedding status.
       */
      return NextResponse.json(
        {
          feedback: {
            ...feedback,
            sentiment: classification.sentiment,
            sentimentScore:
              classification.sentimentScore,
            featureArea: classification.featureArea,
            aiRationale: classification.rationale,
            needsManualReview: false,
            feedbackThemes: matchedThemes.map(
              (theme) => ({
                confidence: 1,
                theme: {
                  id: theme.id,
                  name: theme.name,
                },
              }),
            ),
          },
          classification,
          embeddingSaved,
        },
        { status: 201 },
      );
    } catch (classificationError) {
      /*
       * The feedback itself has already been saved.
       *
       * If AI classification fails after both attempts,
       * flag the record for manual review instead of
       * deleting it.
       */
      console.error(
        "Automatic AI classification failed:",
        classificationError,
      );

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
          feedback: {
            ...feedback,
            needsManualReview: true,
          },
          classification: null,
          embeddingSaved,
          message:
            embeddingSaved
              ? "Feedback created successfully, but AI classification failed. The feedback has been flagged for manual review."
              : "Feedback created successfully, but AI classification and embedding generation failed. The feedback has been flagged for manual review and its embedding can be generated later.",
        },
        { status: 201 },
      );
    }
  } catch (error) {
    console.error("Create feedback API error:", error);

    return NextResponse.json(
      {
        error:
          "Something went wrong while creating feedback",
      },
      { status: 500 },
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
        {
          error:
            "You do not have permission to update feedback",
        },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();

    const updateSchema = z.object({
      id: z.string().min(1),
      status: z.enum(["NEW", "REVIEWED", "ACTIONED"]),
    });

    const validationResult =
      updateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details:
            validationResult.error.flatten()
              .fieldErrors,
        },
        { status: 400 },
      );
    }

    const { id, status } = validationResult.data;

    const existingFeedback =
      await prisma.feedback.findFirst({
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

    const updatedFeedback =
      await prisma.feedback.update({
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
      {
        error:
          "Something went wrong while updating feedback",
      },
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

    if (
      typeof body.csv !== "string" ||
      !body.csv.trim()
    ) {
      return NextResponse.json(
        { error: "CSV data is required" },
        { status: 400 },
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
        { status: 400 },
      );
    }

    const headers = parseCsvLine(lines[0]).map(
      (header) => header.trim(),
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
        (header, index) =>
          headers[index] === header,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid CSV headers. Expected: content,channel,customerLabel,sourceRef",
        },
        { status: 400 },
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
        customerLabel:
          values[2] || undefined,
        sourceRef:
          values[3] || undefined,
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
        { status: 400 },
      );
    }

    /*
     * CSV feedback is inserted one record at a time instead
     * of using createMany so each imported item can receive
     * its own embedding.
     *
     * Embedding failures do not prevent the feedback from
     * being imported.
     */
    let imported = 0;
    let embeddingsSaved = 0;
    let classified = 0;
    let classificationPending = 0;

    let themes = await prisma.theme.findMany({
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

    for (const row of validRows) {
      const feedback = await prisma.feedback.create({
        data: {
          content: row.content,
          channel: row.channel,
          customerLabel:
            row.customerLabel || null,
          sourceRef:
            row.sourceRef || null,
          workspaceId: session.user.workspaceId,
        },
        select: {
          id: true,
          content: true,
        },
      });

      imported++;

      const embeddingSaved =
        await generateAndSaveEmbedding(
          feedback.id,
          feedback.content,
        );

      if (embeddingSaved) {
        embeddingsSaved++;
      }

      try {
        const classification = await classifyFeedback(
          feedback.content,
          themes.map((theme) => theme.name),
        );

        const matchedThemes = await resolveFeedbackThemes(
          classification.themes,
          session.user.workspaceId,
        );

        /*
         * Refresh the available theme list so a newly created
         * theme can be reused by the next CSV row.
         */
        themes = await prisma.theme.findMany({
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

          if (matchedThemes.length > 0) {
            await tx.feedbackTheme.createMany({
              data: matchedThemes.map((theme) => ({
                feedbackId: feedback.id,
                themeId: theme.id,
                confidence: 1,
              })),
            });
          }
        });

        classified++;
      } catch (classificationError) {
        console.error(
          `CSV AI classification failed for feedback ${feedback.id}:`,
          classificationError,
        );

        await prisma.feedback.update({
          where: {
            id: feedback.id,
          },
          data: {
            needsManualReview: true,
          },
        });

        classificationPending++;
      }
    }

    return NextResponse.json({
      message: "CSV imported successfully",
      imported,
      classified,
      classificationPending,
      embeddingsSaved,
      embeddingsPending:
        imported - embeddingsSaved,
      errors,
    });
  } catch (error) {
    console.error("CSV import API error:", error);

    return NextResponse.json(
      {
        error:
          "Something went wrong while importing CSV",
      },
      { status: 500 },
    );
  }
}