import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedRole = "ADMIN" | "ANALYST" | "VIEWER";
type SeedSentiment = "POS" | "NEU" | "NEG";
type SeedStatus = "NEW" | "REVIEWED" | "ACTIONED";

const channels = [
  "Support",
  "App Store",
  "NPS",
  "Sales",
  "Community",
];

const themes = [
  {
    name: "Onboarding",
    description:
      "Feedback about setup, onboarding, and getting started.",
    color: "#6366F1",
  },
  {
    name: "Performance",
    description:
      "Feedback about speed, loading, crashes, and reliability.",
    color: "#F59E0B",
  },
  {
    name: "Billing",
    description:
      "Feedback about payments, invoices, and pricing.",
    color: "#10B981",
  },
  {
    name: "Authentication",
    description:
      "Feedback about login, security, and account access.",
    color: "#EF4444",
  },
  {
    name: "Mobile Experience",
    description:
      "Feedback about the mobile application experience.",
    color: "#8B5CF6",
  },
  {
    name: "Dashboard",
    description:
      "Feedback about dashboards, analytics, and reporting.",
    color: "#06B6D4",
  },
];

const feedbackTemplates: Array<{
  content: string;
  sentiment: SeedSentiment;
  sentimentScore: number;
  theme: string;
}> = [
  {
    content:
      "The onboarding process was confusing and I wasn't sure what to do next.",
    sentiment: "NEG",
    sentimentScore: -0.78,
    theme: "Onboarding",
  },
  {
    content:
      "Getting started was surprisingly easy and the setup guide was helpful.",
    sentiment: "POS",
    sentimentScore: 0.82,
    theme: "Onboarding",
  },
  {
    content:
      "The dashboard takes too long to load when I have a lot of data.",
    sentiment: "NEG",
    sentimentScore: -0.71,
    theme: "Performance",
  },
  {
    content:
      "The application feels fast and responsive compared with the previous version.",
    sentiment: "POS",
    sentimentScore: 0.76,
    theme: "Performance",
  },
  {
    content:
      "I was charged twice for the same subscription.",
    sentiment: "NEG",
    sentimentScore: -0.91,
    theme: "Billing",
  },
  {
    content:
      "The billing information is clear and the invoices are easy to download.",
    sentiment: "POS",
    sentimentScore: 0.74,
    theme: "Billing",
  },
  {
    content:
      "I keep getting logged out when I try to access my account.",
    sentiment: "NEG",
    sentimentScore: -0.84,
    theme: "Authentication",
  },
  {
    content:
      "Login worked perfectly and setting up my account was straightforward.",
    sentiment: "POS",
    sentimentScore: 0.79,
    theme: "Authentication",
  },
  {
    content:
      "The mobile app crashes whenever I open the reports section.",
    sentiment: "NEG",
    sentimentScore: -0.88,
    theme: "Mobile Experience",
  },
  {
    content:
      "The mobile experience is convenient and makes checking updates much easier.",
    sentiment: "POS",
    sentimentScore: 0.81,
    theme: "Mobile Experience",
  },
  {
    content:
      "The dashboard has useful information but I would like more filtering options.",
    sentiment: "NEU",
    sentimentScore: 0.05,
    theme: "Dashboard",
  },
  {
    content:
      "The new dashboard makes it much easier to understand our customer activity.",
    sentiment: "POS",
    sentimentScore: 0.86,
    theme: "Dashboard",
  },
];

async function main() {
  console.log("Starting LOOP database seed...");

  // Clear existing demo data.
  await prisma.feedbackTheme.deleteMany();
  await prisma.embedding.deleteMany();
  await prisma.report.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.theme.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  // Create demo workspace.
  const workspace = await prisma.workspace.create({
    data: {
      name: "LOOP Demo Workspace",
    },
  });

  console.log(`Created workspace: ${workspace.name}`);

  // Hash demo account passwords.
  const adminPassword = await bcrypt.hash(
    "Admin@123",
    12,
  );

  const analystPassword = await bcrypt.hash(
    "Analyst@123",
    12,
  );

  const viewerPassword = await bcrypt.hash(
    "Viewer@123",
    12,
  );

  // Create demo users.
  await prisma.user.create({
    data: {
      name: "Demo Admin",
      email: "admin@loop-demo.com",
      passwordHash: adminPassword,
      role: "ADMIN" as SeedRole,
      workspaceId: workspace.id,
    },
  });

  await prisma.user.create({
    data: {
      name: "Demo Analyst",
      email: "analyst@loop-demo.com",
      passwordHash: analystPassword,
      role: "ANALYST" as SeedRole,
      workspaceId: workspace.id,
    },
  });

  await prisma.user.create({
    data: {
      name: "Demo Viewer",
      email: "viewer@loop-demo.com",
      passwordHash: viewerPassword,
      role: "VIEWER" as SeedRole,
      workspaceId: workspace.id,
    },
  });

  console.log("Created demo users.");

  // Create themes.
  const createdThemes = new Map<string, string>();

  for (const theme of themes) {
    const createdTheme = await prisma.theme.create({
      data: {
        name: theme.name,
        description: theme.description,
        color: theme.color,
        workspaceId: workspace.id,
      },
    });

    createdThemes.set(
      createdTheme.name,
      createdTheme.id,
    );
  }

  console.log(
    `Created ${createdThemes.size} themes.`,
  );

  // Create 120 realistic feedback records.
  for (let i = 0; i < 120; i++) {
    const template =
      feedbackTemplates[
        i % feedbackTemplates.length
      ];

    const channel =
      channels[i % channels.length];

    const status: SeedStatus =
      i % 3 === 0
        ? "NEW"
        : i % 3 === 1
          ? "REVIEWED"
          : "ACTIONED";

    const feedback =
      await prisma.feedback.create({
        data: {
          content: `${template.content} [Demo feedback ${
            i + 1
          }]`,

          channel,

          sourceRef: `${channel
            .toLowerCase()
            .replace(/\s+/g, "-")}-${1000 + i}`,

          customerLabel: `Demo Customer ${(
            (i % 30) +
            1
          )
            .toString()
            .padStart(2, "0")}`,

          sentiment:
            template.sentiment as "POS" | "NEU" | "NEG",

          sentimentScore:
            template.sentimentScore,

          status:
            status as
              | "NEW"
              | "REVIEWED"
              | "ACTIONED",

          workspaceId: workspace.id,

          createdAt: new Date(
            Date.now() -
              (120 - i) *
                24 *
                60 *
                60 *
                1000,
          ),
        },
      });

    const themeId = createdThemes.get(
      template.theme,
    );

    if (themeId) {
      await prisma.feedbackTheme.create({
        data: {
          feedbackId: feedback.id,
          themeId,
          confidence:
            0.75 + (i % 20) / 100,
        },
      });
    }
  }

  console.log(
    "Created 120 feedback items.",
  );

  console.log(
    "LOOP seed completed successfully.",
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });