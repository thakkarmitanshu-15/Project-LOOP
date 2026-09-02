# LOOP — AI Customer-Feedback Intelligence Platform

LOOP is a multi-tenant customer-feedback intelligence platform designed to collect, organize, analyze, and eventually interpret customer feedback using AI.

The project is being developed as an internship project using Next.js, TypeScript, PostgreSQL, Prisma, NextAuth, Tailwind CSS, and Anthropic Claude.

---

## Current Project Status

### Completed

- User authentication with NextAuth
- User signup and login
- Multi-tenant workspace architecture
- Role-based access control
- Admin, Analyst, and Viewer roles
- Workspace-scoped API authorization
- Feedback management
- Feedback detail view
- Feedback search and filtering
- Pagination
- Feedback status workflow
- Manual feedback ingestion
- CSV bulk feedback import
- Analytics API
- Real-data analytics dashboard
- Recharts visualizations

### In Progress

- AI-powered feedback classification
- AI sentiment analysis
- AI theme extraction
- Theme trend analysis
- Ask LOOP
- AI-generated insights

### Planned

- Voice-of-Customer reports
- Report generation
- Production-ready UI refinement
- Documentation and demo preparation
- Deployment

---

## Technology Stack

### Frontend

- Next.js 14
- React
- TypeScript
- Tailwind CSS
- Recharts

### Backend

- Next.js Route Handlers
- NextAuth
- Prisma ORM

### Database

- PostgreSQL

### AI

- Anthropic Claude API

### Validation

- Zod

---

## Architecture

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

---

## Multi-Tenancy

LOOP uses workspace-based multi-tenancy.

Each user belongs to a workspace and every feedback record is associated with a workspace.

API queries are scoped using the authenticated user's workspace ID.

Example:

```ts
where: {
  workspaceId: session.user.workspaceId
}