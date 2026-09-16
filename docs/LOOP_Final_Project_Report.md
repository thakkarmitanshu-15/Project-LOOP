# LOOP — AI Customer-Feedback Intelligence Platform

## Final Project Report

**Project Type:** Internship Project  
**Project Name:** LOOP — AI Customer-Feedback Intelligence Platform  
**Application:** Multi-tenant customer-feedback intelligence platform  
**Development Stack:** Next.js 14, TypeScript, Tailwind CSS, PostgreSQL, Prisma, NextAuth, Zod, Recharts  
**AI Integration:** Free OpenRouter AI model during development; Anthropic Claude specified for the final production configuration

---

# 1. Project Overview

LOOP is a corporate-oriented, multi-tenant AI customer-feedback intelligence platform designed to help product teams collect, organize, classify, search, and analyze customer feedback from a centralized workspace.

The application provides role-based access for **Admin, Analyst, and Viewer** users. Feedback can be entered individually or imported in bulk through CSV. The platform then processes feedback using AI classification, associates feedback with reusable themes, analyzes sentiment and trends, detects theme spikes, provides grounded semantic question answering through **Ask LOOP**, and generates Voice-of-Customer (VoC) reports for selected periods.

The system was developed as an internship project according to the LOOP project brief. The implementation emphasizes secure server-side API processing, workspace isolation, structured AI responses, database-backed analytics, and production-oriented application behavior.

---

# 2. Problem Statement

Customer feedback is commonly distributed across support tickets, application reviews, surveys, sales conversations, and community discussions. When this information is handled manually, product teams face several problems:

- Feedback is difficult to centralize.
- Important recurring issues may be missed.
- Manually categorizing large amounts of feedback is time-consuming.
- Sentiment and theme trends are difficult to identify.
- Finding evidence for a product question requires manually searching through many records.
- Creating periodic customer-feedback reports requires significant manual effort.

LOOP addresses these problems by providing a single workspace-based system that combines feedback management, analytics, AI classification, semantic retrieval, and report generation.

---

# 3. Objectives

The main objectives of LOOP are:

1. Provide secure multi-tenant workspaces.
2. Implement Admin, Analyst, and Viewer role-based access control.
3. Allow individual feedback ingestion.
4. Support bulk feedback import through CSV.
5. Provide a searchable and filterable feedback inbox.
6. Classify feedback using AI.
7. Detect sentiment, sentiment score, feature area, and themes.
8. Reuse existing themes and create new themes when required.
9. Provide theme trends and spike detection.
10. Provide grounded semantic question answering through Ask LOOP.
11. Generate Voice-of-Customer reports from actual database data.
12. Allow generated reports to be saved, viewed, and exported.
13. Provide responsive, accessible, and production-oriented application states.
14. Maintain workspace-level data isolation and server-side authorization.

---

# 4. Scope of the Project

## 4.1 Included Scope

The implemented scope includes:

- Multi-tenant workspace management
- Authentication
- Role-based access control
- Feedback ingestion
- CSV bulk import
- Feedback search, filtering, pagination, and status management
- Sentiment classification
- AI theme classification and clustering
- Theme creation and reuse
- Analytics dashboard
- Theme trends
- Theme spike detection
- Semantic feedback retrieval
- Ask LOOP grounded Q&A
- Voice-of-Customer report generation
- Report storage and viewing
- Report export
- Loading, empty, and error states
- 403 and 404 handling
- Responsive UI
- Basic accessibility improvements
- Workspace isolation

## 4.2 Out of Scope

The project brief does not require real integrations with external feedback systems such as Zendesk, App Store, Twitter, or similar platforms. Seed data and CSV import are therefore used to demonstrate the required functionality.

Billing, native mobile applications, real-time collaboration, and email/SMS notification systems are also outside the required scope.

---

# 5. Technology Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 14 |
| Programming Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | NextAuth |
| Validation | Zod |
| AI | Anthropic Claude API specified by brief |
| Current Development AI Provider | Free OpenRouter AI model |
| Charts | Recharts |
| Deployment Target | Vercel |

The project uses the technologies specified by the internship brief. The semantic retrieval component uses a hosted embeddings provider, which is permitted by the brief for the embedding/search portion of Ask LOOP.

---

# 6. AI Provider Note

The internship brief specifies **Claude (Anthropic)** as the AI agent/provider for LOOP.

Because the required Claude API credits were not available during development, a **free OpenRouter AI model** has been used for the current implementation.

The AI workflow itself has been implemented around the required LOOP functionality:

- AI feedback classification
- Sentiment analysis
- Feature-area extraction
- Theme assignment
- Theme creation/reuse
- Grounded Ask LOOP responses
- Voice-of-Customer report generation

The provider layer can be switched to the Anthropic Claude API when the required credits/API access are available. The current implementation keeps AI calls server-side so that the provider credentials are not exposed to the browser.

---

# 7. System Architecture

LOOP follows a layered architecture:

```text
                    Browser
                       |
                       v
              Next.js Application
                       |
                       v
             Next.js API Route Layer
                       |
        +--------------+--------------+
        |              |              |
        v              v              v
 Authentication     Prisma          AI Service
   / RBAC          ORM Layer           |
        |              |               v
        |              v        AI Provider
        |        PostgreSQL
        |
        +------------------------------+
                       |
                       v
              Workspace-scoped data
```

For Ask LOOP:

```text
Feedback Ingestion
       |
       v
Embedding Generation
       |
       v
Stored Embedding
       |
       v
Semantic Retrieval
       |
       v
Top-K Relevant Feedback
       |
       v
AI Context
       |
       v
Grounded Ask LOOP Answer
       |
       v
Answer + Supporting Feedback IDs
```

The browser does not directly access PostgreSQL or the AI provider. Requests pass through the application's server-side API layer, where authentication, authorization, validation, workspace scoping, database operations, and AI calls are handled.

---

# 8. Multi-Tenant Workspace Design

Each user belongs to a workspace. Application data such as feedback, themes, reports, and embeddings is associated with the corresponding workspace.

API operations use the authenticated user's workspace ID to scope database queries.

This prevents a user from retrieving or modifying data belonging to another workspace.

The project therefore treats workspace isolation as a core security requirement rather than relying only on frontend restrictions.

---

# 9. Authentication and Authorization

LOOP uses **NextAuth Credentials authentication**.

Three roles are implemented:

### Admin

Administrative users can manage workspace-level functionality and perform privileged operations such as managing members.

### Analyst

Analysts can work with feedback and AI analysis features, including classification and other analytical workflows.

### Viewer

Viewers can access permitted read-oriented application functionality but cannot perform analyst/admin operations.

Authorization is enforced on the server-side API layer. The UI also reflects role permissions, but frontend visibility is not treated as the security boundary.

---

# 10. Feedback Management

The feedback module provides the central data-management workflow.

Users can:

- Add individual feedback.
- Import feedback using CSV.
- Search feedback.
- Filter feedback.
- Navigate through paginated results.
- View individual feedback details.
- Change feedback status according to role permissions.
- Trigger manual AI reclassification when required.

Supported feedback information includes:

- Feedback content
- Channel
- Source reference
- Customer label
- Sentiment
- Sentiment score
- Feature area
- AI rationale
- Status
- Creation date
- Workspace association
- Assigned themes

---

# 11. CSV Bulk Import

LOOP supports bulk feedback ingestion through CSV.

The import process validates the expected CSV structure before processing records.

For each imported feedback item, the application can:

1. Validate the row.
2. Create the feedback record.
3. Generate its embedding.
4. Send the feedback for AI classification.
5. Resolve the returned themes against workspace themes.
6. Store sentiment and feature-area information.
7. Record classification or embedding failures for later handling.

The import result reports successful records and pending/error conditions rather than silently failing.

---

# 12. AI Feedback Classification

AI classification is performed on the server.

The classifier receives:

- Feedback text
- Existing workspace theme names

The expected AI response is structured JSON containing:

```text
sentiment
sentimentScore
themes
featureArea
rationale
```

The response is cleaned, parsed, and validated using **Zod**.

The sentiment score is constrained to the range:

```text
-1 to +1
```

The classification process also handles invalid AI output by retrying the classification request and flagging the feedback for manual review if the required structured response cannot be obtained.

This design avoids trusting unvalidated model output.

---

# 13. Theme Clustering and Theme Reuse

LOOP organizes feedback into reusable themes.

The classification process first provides the AI with existing workspace themes. When a suitable theme exists, the system reuses it instead of continuously creating variations of the same theme.

If the AI identifies a genuinely new topic, the application can create a new workspace theme and associate the feedback with it.

Theme associations are stored separately from feedback through the `FeedbackTheme` relationship.

This supports:

- Multiple themes per feedback item
- Theme confidence values
- Theme-level filtering
- Theme counts
- Theme trend analysis
- Theme drill-down

---

# 14. Analytics Dashboard

The dashboard provides an overview of customer feedback using database-backed analytics.

The implemented analytics include:

- Feedback volume
- Sentiment distribution
- Channel distribution
- Feedback trends
- Theme distribution
- Theme trends

The dashboard is designed to give product teams a high-level view of what customers are saying and how the feedback changes over time.

---

# 15. Theme Trends and Spike Detection

Theme trends display theme volume over time.

LOOP also implements spike detection using a rolling historical baseline.

The current spike logic compares a week's theme volume with the preceding four-week average.

A theme is flagged when:

- There is a valid historical baseline.
- Current volume is at least 1.5 times the previous average.
- The increase is at least two feedback items.

This makes spike detection based on observed historical activity rather than a fixed arbitrary threshold.

---

# 16. Ask LOOP

Ask LOOP provides semantic question answering over customer feedback.

The workflow is:

1. Feedback is embedded during ingestion.
2. Embeddings are stored for later retrieval.
3. A user submits a question.
4. The system retrieves the most relevant feedback.
5. Retrieved feedback is passed as context to the AI.
6. The AI generates an answer grounded in that context.
7. The response includes the feedback IDs used to support the answer.

The AI is instructed to answer from the retrieved context rather than inventing unsupported information.

This makes Ask LOOP an evidence-oriented customer-feedback assistant rather than a general-purpose chatbot.

---

# 17. Voice-of-Customer Reports

LOOP provides one-click Voice-of-Customer report generation for a selected period.

Before AI generation, period statistics are calculated from actual database records.

The generated report contains:

- Summary
- Top themes
- Sentiment shifts
- Notable customer quotes
- Recommended actions

Reports are stored in PostgreSQL with:

- Report title
- Period start
- Period end
- Generated content
- Workspace
- Generating user
- Creation timestamp

Reports can subsequently be viewed and exported.

---

# 18. Report Export

Generated VoC reports can be exported so that the results are usable outside the application.

The export functionality is part of the final reporting workflow and completes the report lifecycle:

```text
Select Period
     ↓
Generate Report
     ↓
Save Report
     ↓
View Report
     ↓
Export Report
```

---

# 19. Database Design

The application uses PostgreSQL through Prisma.

Main entities:

```text
Workspace
User
Feedback
Theme
FeedbackTheme
Embedding
Report
```

### Workspace

Stores tenant/workspace information.

### User

Stores authentication information, role, and workspace membership.

### Feedback

Stores customer-feedback records and their AI-derived attributes.

### Theme

Stores reusable workspace-level feedback themes.

### FeedbackTheme

Connects feedback with themes and stores theme confidence.

### Embedding

Stores the semantic representation associated with a feedback item for retrieval.

### Report

Stores generated Voice-of-Customer reports and their metadata.

---

# 20. Project Structure

```text
loop/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   ├── signup/
│   │   ├── analytics/
│   │   ├── themes/
│   │   ├── workspace/members/
│   │   ├── feedback/
│   │   ├── ask/
│   │   └── reports/
│   ├── components/
│   ├── dashboard/
│   ├── feedback/
│   ├── themes/
│   ├── reports/
│   ├── ask/
│   ├── settings/
│   ├── error.tsx
│   ├── forbidden.tsx
│   └── not-found.tsx
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── ai.ts
│   ├── embeddings.ts
│   └── feedback-retrieval.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── scripts/
├── types/
├── middleware.ts
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

---

# 21. Seed Data

The project includes a demonstration seed dataset containing:

- One demo workspace
- Admin, Analyst, and Viewer users
- At least 120 realistic feedback records
- Multiple feedback channels
- Multiple sentiments
- Multiple reusable themes

The seeded data is intended to provide enough variation for the analytics, classification, clustering, trend, and reporting features to be demonstrated.

---

# 22. Demo Credentials

The seeded demonstration workspace contains the following accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@loop-demo.com` | `Admin@123` |
| Analyst | `analyst@loop-demo.com` | `Analyst@123` |
| Viewer | `viewer@loop-demo.com` | `Viewer@123` |

These credentials are intended for local/demo evaluation only.

---

# 23. Validation and Error Handling

The application includes production-oriented handling for:

- Unauthorized requests
- Forbidden requests
- Missing resources
- API errors
- Invalid input
- AI classification failures
- Loading states
- Empty states
- Retry actions
- Failed analytics requests
- Failed report requests
- Failed Ask LOOP requests

Zod is used to validate structured application and AI data where required.

---

# 24. Responsive Design and Accessibility

The application was reviewed at both mobile and desktop viewport sizes.

The hardening phase covered:

- Dashboard
- Feedback
- Themes
- Reports
- Ask LOOP
- Settings

The UI includes responsive layouts, loading states, empty states, error states, keyboard-accessible controls, and appropriate 403/404 handling.

---

# 25. Security Considerations

Security is implemented around the following principles:

- AI credentials remain server-side.
- Database credentials remain server-side.
- The browser does not directly access PostgreSQL.
- The browser does not directly call the AI provider.
- API queries are scoped to the authenticated workspace.
- Role permissions are enforced server-side.
- API inputs are validated.
- Secrets and `.env` files are excluded from source control.
- Workspace isolation is enforced at the API/database layer.

---

# 26. Testing and Verification

The project was incrementally tested during development.

Key validation commands include:

```bash
npx prisma validate
npx tsc --noEmit
npm run lint
```

Functional testing covered:

- Authentication
- Role-based permissions
- Workspace isolation
- Feedback creation
- CSV import
- AI classification
- Manual reclassification
- Theme persistence
- Theme reuse
- Dashboard analytics
- Theme trend analysis
- Spike detection
- Ask LOOP retrieval and grounded responses
- VoC report generation
- Report viewing
- Report export
- Loading and error states
- Responsive behavior

---

# 27. Development Milestones

The project was implemented progressively through the following major stages:

### Milestone 1 — Foundation

- Authentication
- Workspace creation
- RBAC
- Basic feedback CRUD

### Milestone 2 — Core Application

- CSV bulk import
- Feedback inbox
- Search and filtering
- Dashboard analytics

### Milestone 3 — AI Intelligence

- AI classification
- Theme clustering
- Theme trends
- Spike detection
- Ask LOOP semantic retrieval and grounded Q&A

### Milestone 4 — Production Features

- VoC report generation
- Report storage
- Report export
- Responsive UX
- Loading/empty/error states
- Accessibility
- Final documentation and deployment preparation

---

# 28. Local Setup

## Prerequisites

Install:

- Node.js 18 LTS or newer
- Git
- PostgreSQL
- Required AI provider credentials for the current development configuration
- Vercel account if deploying

## Installation

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd loop
npm install
```

Create the environment file:

```text
.env
```

Configure the required environment variables used by the project.

For the final Anthropic configuration, the project brief specifies:

```text
DATABASE_URL
NEXTAUTH_SECRET
ANTHROPIC_API_KEY
```

Run Prisma setup:

```bash
npx prisma migrate dev
npx prisma generate
```

Seed the database:

```bash
npx prisma db seed
```

Start the development server:

```bash
npm run dev
```

Open the application at the local development address shown by Next.js.

---

# 29. Deployment

The intended deployment architecture is:

```text
GitHub
   ↓
Vercel
   ↓
Next.js Application
   ↓
Hosted PostgreSQL
```

Production deployment should configure the required environment variables in the deployment platform.

Before final deployment, the application should be smoke-tested for:

1. Authentication
2. Admin / Analyst / Viewer access
3. Seed data
4. Feedback ingestion
5. AI classification
6. Theme clustering
7. Ask LOOP
8. VoC report generation
9. Report export
10. Workspace isolation
11. Secret protection

---

# 30. Current Project Limitations

The main current limitation is the AI provider configuration.

The internship brief specifies Anthropic Claude, but the development implementation currently uses a free OpenRouter AI model because Claude API credits were not available during development.

The application architecture keeps the AI integration server-side, so the provider can be changed without redesigning the frontend workflows.

Real-time external feedback integrations are also outside the project's required scope and are represented through seed data and CSV ingestion.

---

# 31. Future Enhancements

Possible future improvements include:

- Switching the AI provider from the current OpenRouter configuration to Anthropic Claude.
- Connecting real customer-feedback sources.
- Expanding semantic retrieval capabilities.
- Improving theme similarity and clustering quality.
- Adding richer report formats.
- Adding additional analytics and product-health metrics.
- Introducing more advanced administrative controls.

These enhancements are not required to demonstrate the core LOOP internship project scope.

---

# 32. Conclusion

LOOP demonstrates a complete AI-assisted customer-feedback intelligence workflow within a secure multi-tenant web application.

The project combines:

- Secure authentication and RBAC
- Workspace-isolated data
- Feedback ingestion and bulk import
- AI-powered classification
- Theme clustering and reuse
- Sentiment and trend analytics
- Spike detection
- Semantic retrieval
- Grounded customer-feedback Q&A
- Voice-of-Customer reporting
- Report export
- Responsive and production-oriented UX

The implementation follows the architecture and functional direction defined by the internship project brief while keeping the AI provider integration replaceable for the final Anthropic Claude configuration.

LOOP therefore provides an end-to-end demonstration of how customer feedback can be transformed from raw text into structured, searchable, analyzable, and actionable product intelligence.
