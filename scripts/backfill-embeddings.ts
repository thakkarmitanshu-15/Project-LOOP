import { prisma } from "../lib/db";
import { generateEmbedding } from "../lib/embeddings";

const DELAY_MS = 4000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const feedback = await prisma.feedback.findMany({
    where: {
      embedding: null,
    },
    select: {
      id: true,
      content: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(
    `Found ${feedback.length} feedback items without embeddings.`,
  );

  let successful = 0;
  let failed = 0;

 for (let index = 0; index < feedback.length; index++) {
  const item = feedback[index];
    try {
      console.log(
        `[${index + 1}/${feedback.length}] Embedding feedback ${item.id}...`,
      );

      const vector = await generateEmbedding(item.content);

      await prisma.embedding.create({
        data: {
          feedbackId: item.id,
          vector: JSON.stringify(vector),
        },
      });

      successful++;

      console.log(
        `  ✓ Saved embedding (${vector.length} dimensions)`,
      );
    } catch (error) {
      failed++;

      console.error(
        `  ✗ Failed for feedback ${item.id}:`,
        error instanceof Error ? error.message : error,
      );
    }

    if (index < feedback.length - 1) {
      console.log(`  Waiting ${DELAY_MS / 1000}s...`);
      await sleep(DELAY_MS);
    }
  }

  console.log("\nEmbedding backfill complete.");
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });