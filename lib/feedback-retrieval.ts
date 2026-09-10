import { prisma } from "@/lib/db";

function extractKeywords(question: string) {
  const stopWords = new Set([
    "what",
    "are",
    "the",
    "main",
    "is",
    "of",
    "in",
    "on",
    "for",
    "to",
    "and",
    "or",
    "a",
    "an",
    "do",
    "does",
    "did",
    "how",
    "why",
    "which",
    "with",
    "from",
    "about",
    "customer",
    "customers",
    "feedback",
  ]);

  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length >= 3 &&
        !stopWords.has(word),
    );
}

export async function retrieveFeedback(
  workspaceId: string,
  question: string,
  limit = 10,
) {
  const normalizedQuestion = question.toLowerCase();

  const complaintIntent =
    normalizedQuestion.includes("complaint") ||
    normalizedQuestion.includes("problem") ||
    normalizedQuestion.includes("issue") ||
    normalizedQuestion.includes("frustrat") ||
    normalizedQuestion.includes("negative") ||
    normalizedQuestion.includes("bad") ||
    normalizedQuestion.includes("worst") ||
    normalizedQuestion.includes("pain point");

  const keywords = extractKeywords(question);

  // For broad complaint/problem questions,
  // prioritize negative customer feedback.
  if (complaintIntent) {
    const negativeFeedback = await prisma.feedback.findMany({
      where: {
        workspaceId,
        sentiment: "NEG",
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

    if (negativeFeedback.length > 0) {
      return negativeFeedback;
    }
  }

  // Normal keyword-based retrieval.
  if (keywords.length === 0) {
    return [];
  }

  const feedback = await prisma.feedback.findMany({
    where: {
      workspaceId,
      OR: keywords.map((keyword) => ({
        content: {
          contains: keyword,
          mode: "insensitive",
        },
      })),
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
    take: 50,
  });

  const scoredFeedback = feedback
    .map((item) => {
      const content = item.content.toLowerCase();

      const score = keywords.reduce(
        (total, keyword) =>
          total + (content.includes(keyword) ? 1 : 0),
        0,
      );

      return {
        item,
        score,
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (
        b.item.createdAt.getTime() -
        a.item.createdAt.getTime()
      );
    })
    .slice(0, limit)
    .map((result) => result.item);

  return scoredFeedback;
}