import { prisma } from "@/lib/db";

export async function retrieveFeedback(
  workspaceId: string,
  question: string,
  limit = 10,
) {
  return prisma.feedback.findMany({
    where: {
      workspaceId,
      content: {
        contains: question,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      content: true,
      channel: true,
      sentiment: true,
      sentimentScore: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}