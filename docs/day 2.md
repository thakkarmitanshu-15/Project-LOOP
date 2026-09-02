LOOP — AI Customer-Feedback Intelligence Platform

LOOP is a multi-tenant customer-feedback intelligence platform designed to collect, organize, analyze, and eventually interpret customer feedback using AI.

The project is being developed as an internship project using Next.js, TypeScript, PostgreSQL, Prisma, NextAuth, Tailwind CSS, Recharts, Zod, and Anthropic Claude.

Current Project Status

Completed

User authentication with NextAuth

User signup and login

Multi-tenant workspace architecture

Role-based access control

Admin, Analyst, and Viewer roles

Workspace-scoped API authorization

Feedback management

Feedback detail view

Feedback search and filtering

Pagination

Feedback status workflow

Manual feedback ingestion

CSV bulk feedback import

Analytics API

Real-data analytics dashboard

Recharts visualizations

In Progress

AI-powered feedback classification

AI sentiment analysis

AI theme extraction

Theme trend analysis

Ask LOOP

AI-generated insights

Planned

Voice-of-Customer reports

Report generation

Production-ready UI refinement

Documentation and demo preparation

Deployment

Technology Stack

Frontend

Next.js 14

React

TypeScript

Tailwind CSS

Recharts

Backend

Next.js Route Handlers

NextAuth

Prisma ORM

Database

PostgreSQL

AI

Anthropic Claude API

Validation

Zod

Architecture

The application follows a server-side API architecture:

Browser
   ↓
Next.js UI
   ↓
Next.js Route Handlers
   ↓
Authentication / Authorization
   ↓
Prisma
   ↓
PostgreSQL

AI requests will also be handled server-side:

Browser
   ↓
Next.js API Route
   ↓
Anthropic Claude API

API routes are responsible for authentication, authorization, workspace scoping, validation, database operations, and AI communication.

Multi-Tenancy

LOOP uses workspace-based multi-tenancy.

Each user belongs to a workspace and every feedback record is associated with a workspace.

API queries are scoped using the authenticated user's workspace ID.

Example:

where: {
  workspaceId: session.user.workspaceId
}

This prevents users from accessing feedback belonging to another workspace.

Roles

LOOP currently supports three roles:

ADMIN

Manage workspace data

Create feedback

Import CSV feedback

Update feedback status

Access analytics

ANALYST

Create feedback

Import CSV feedback

Update feedback status

Access analytics

VIEWER

View feedback

View analytics

Cannot create or modify feedback

Feedback Management

The Feedback Inbox currently supports:

Search by feedback content

Sentiment filtering

Status filtering

Channel filtering

Pagination

Feedback detail pages

Status updates

Supported feedback channels currently include:

Support

App Store

NPS

Sales

Community

Feedback Ingestion

Manual Ingestion

Admin and Analyst users can add individual feedback records through the Feedback Inbox.

CSV Import

Bulk feedback can be imported using CSV.

Required columns:

content,channel,customerLabel,sourceRef

Example:

content,channel,customerLabel,sourceRef
"The dashboard is very easy to use",Support,Customer A,SUP-001
"Mobile application crashes frequently",App Store,Customer B,APP-002

Analytics Dashboard

The dashboard currently displays real data retrieved from PostgreSQL through the analytics API.

KPI Metrics

Total feedback

Positive feedback

Neutral feedback

Negative feedback

Sentiment percentages

Visualizations

Feedback by Channel

A Recharts bar chart showing the volume of feedback received through each channel.

Feedback Volume Over Time

A Recharts area chart showing weekly feedback volume.

Sentiment Distribution

A Recharts donut chart showing the distribution of positive, neutral, and negative feedback.

Workflow Status

The dashboard also displays:

New feedback

Reviewed feedback

Actioned feedback

API Routes

Current API routes include:

/api/auth/[...nextauth]
/api/signup
/api/feedback
/api/feedback/[id]
/api/analytics

Feedback API

Supports:

GET — list feedback

POST — create feedback

PUT — bulk CSV import

PATCH — update feedback status

All feedback operations are workspace-scoped.

Analytics API

GET /api/analytics

Returns:

Summary metrics

Feedback by channel

Feedback by status

Feedback volume over time

Database

The project uses Prisma with PostgreSQL.

Core models include:

Workspace

User

Feedback

Theme

FeedbackTheme

Embedding

Report

The database schema is located at:

prisma/schema.prisma

Demo Data

The project includes a Prisma seed script for development.

Seeded demo users:

Admin
Email: admin@loop-demo.com
Password: Admin@123

Analyst
Email: analyst@loop-demo.com
Password: Analyst@123

Viewer
Email: viewer@loop-demo.com
Password: Viewer@123

The seed also creates demo themes and feedback records.

These credentials are for local development/demo purposes only and must not be used in production.

Local Development

1. Install dependencies

npm install

2. Configure environment variables

Create:

.env

Required variables:

DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/loop?schema=public"
NEXTAUTH_SECRET="your-secret"

3. Generate Prisma Client

npx prisma generate

4. Run database migrations

npx prisma migrate dev

5. Seed development data

npx prisma db seed

6. Start the development server

npm run dev

The application will be available at:

http://localhost:3000

Project Structure

loop/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── signup/
│   │   ├── feedback/
│   │   └── analytics/
│   │
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── Analytics.tsx
│   │   ├── ChannelChart.tsx
│   │   ├── FeedbackTrendChart.tsx
│   │   ├── SentimentChart.tsx
│   │   └── LogoutButton.tsx
│   │
│   ├── feedback/
│   ├── login/
│   ├── signup/
│   └── layout.tsx
│
├── lib/
│   ├── auth.ts
│   └── db.ts
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── types/
│   └── next-auth.d.ts
│
├── middleware.ts
├── package.json
└── README.md

Development Milestones

M1 — Foundation

Status: Completed

Authentication, workspaces, roles, database models, and basic feedback management have been implemented.

M2 — Core Application

Status: Substantially Completed

Feedback ingestion, CSV import, inbox filtering, status workflow, analytics API, and dashboard visualizations have been implemented.

M3 — AI Intelligence

Status: Next

Planned functionality:

Claude-powered sentiment classification

Theme extraction

Theme assignment

Confidence scoring

AI insights

Ask LOOP

M4 — Production

Status: Planned

Planned functionality:

Voice-of-Customer reports

Report generation

Final UI polish

Documentation

Demo preparation

Deployment

Validation

Before committing changes, run:

npx tsc --noEmit

For a production build, run:

npm run build

The project should compile without TypeScript errors.

Security Notes

Environment variables must not be committed.

.env should remain in .gitignore.

.env.example should contain placeholders only.

Anthropic API credentials will be used only from server-side code.

Database queries must remain workspace-scoped.

Demo credentials are intended only for local development.

License

This project is developed as an internship project.