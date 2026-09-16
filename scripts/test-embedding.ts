import { generateEmbedding } from "../lib/embeddings";

async function main() {
  const text =
    "The mobile app crashes whenever I try to upload a photo.";

  console.log("Generating embedding...");

  const embedding = await generateEmbedding(text);

  console.log("Embedding generated successfully.");
  console.log("Dimensions:", embedding.length);
  console.log("First 10 values:", embedding.slice(0, 10));
}

main().catch((error) => {
  console.error("Embedding test failed:");
  console.error(error);
  process.exit(1);
});