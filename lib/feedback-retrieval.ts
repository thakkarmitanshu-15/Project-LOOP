import { prisma } from "@/lib/db";
import { generateEmbedding } from "@/lib/embeddings";

const MIN_SIMILARITY = 0.25;

type FeedbackRecord = {
  id: string;
  content: string;
  channel: string;
  sentiment: "POS" | "NEU" | "NEG" | null;
  sentimentScore: number | null;
  status: "NEW" | "REVIEWED" | "ACTIONED";
  createdAt: Date;
};

type EmbeddingRecord = {
  feedbackId: string;
  vector: string;
  feedback: FeedbackRecord;
};

type SemanticFeedback = FeedbackRecord & {
  similarity: number;
};

function cosineSimilarity(
  vectorA: number[],
  vectorB: number[],
): number {
  if (vectorA.length !== vectorB.length) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return (
    dotProduct /
    (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB))
  );
}

function extractKeywords(question: string): string[] {
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

export async function retrieveFeedbackSemantically(
  workspaceId: string,
  question: string,
  limit = 10,
): Promise<SemanticFeedback[]> {
  const queryVector = await generateEmbedding(question);

  const embeddings: EmbeddingRecord[] =
    await prisma.embedding.findMany({
      where: {
        feedback: {
          workspaceId,
        },
      },
      select: {
        feedbackId: true,
        vector: true,
        feedback: {
          select: {
            id: true,
            content: true,
            channel: true,
            sentiment: true,
            sentimentScore: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

  const scoredFeedback = embeddings
    .map(
      (item: EmbeddingRecord): SemanticFeedback | null => {
        let feedbackVector: number[];

        try {
          const parsedVector: unknown =
            JSON.parse(item.vector);

          if (
            !Array.isArray(parsedVector) ||
            !parsedVector.every(
              (value: unknown) =>
                typeof value === "number" &&
                Number.isFinite(value),
            )
          ) {
            return null;
          }

          feedbackVector = parsedVector;
        } catch {
          return null;
        }

        const score = cosineSimilarity(
          queryVector,
          feedbackVector,
        );

        return {
          ...item.feedback,
          similarity: score,
        };
      },
    )
    .filter(
      (
        item,
      ): item is SemanticFeedback =>
        item !== null &&
        item.similarity >= MIN_SIMILARITY,
    )
    .sort(
      (a, b) =>
        b.similarity - a.similarity,
    )
    .slice(0, limit);

  return scoredFeedback;
}

export async function retrieveFeedback(
  workspaceId: string,
  question: string,
  limit = 10,
): Promise<FeedbackRecord[]> {
  const normalizedQuestion =
    question.toLowerCase();

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

  if (complaintIntent) {
    const negativeFeedback: FeedbackRecord[] =
      await prisma.feedback.findMany({
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

  if (keywords.length === 0) {
    return [];
  }

  const feedback: FeedbackRecord[] =
    await prisma.feedback.findMany({
      where: {
        workspaceId,
        OR: keywords.map(
          (keyword: string) => ({
            content: {
              contains: keyword,
              mode: "insensitive",
            },
          }),
        ),
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
    .map(
      (item: FeedbackRecord) => {
        const content =
          item.content.toLowerCase();

        const score = keywords.reduce(
          (
            total: number,
            keyword: string,
          ) =>
            total +
            (content.includes(keyword)
              ? 1
              : 0),
          0,
        );

        return {
          item,
          score,
        };
      },
    )
    .filter(
      (result) => result.score > 0,
    )
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
    .map(
      (result) => result.item,
    );

  return scoredFeedback;
}