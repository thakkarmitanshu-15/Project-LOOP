## Day 15 — Ask LOOP & Voice-of-Customer Foundation

### Work Completed

- Added the initial Ask LOOP interface for asking questions about customer feedback.
- Added an authenticated `/api/ask` API route.
- Added workspace-scoped feedback retrieval for Ask LOOP.
- Added server-side Anthropic Claude integration for Ask LOOP.
- Added structured JSON response handling with Zod validation.
- Added supporting feedback IDs so AI answers can be connected to source feedback.
- Added an evidence section to the Ask LOOP interface showing the retrieved feedback.

### Voice-of-Customer Reports

- Added the Voice-of-Customer Reports page.
- Added the `/api/reports` API route.
- Added reporting-period selection.
- Added feedback volume summary for the selected period.
- Added positive, neutral, and negative sentiment statistics.
- Added previous-period comparison.
- Added sentiment shift calculations in percentage points.
- Added top themes for the selected period.
- Added representative customer feedback.
- Added the saved reports section as the foundation for report management.

### UI & Navigation

- Added Ask LOOP and Reports to the shared navigation.
- Maintained the existing corporate SaaS visual style across the new features.
- Added sentiment-shift cards to the Reports interface.

### Testing & Validation

- Verified the new routes and pages compile successfully.
- Verified workspace-scoped data access for the new API functionality.
- Tested the Claude API integration and confirmed that the API request reaches Anthropic.

### Current Limitations

- Live Claude testing is currently blocked because the Anthropic account has insufficient API credits.
- Ask LOOP currently uses keyword-based feedback retrieval.
- Semantic embedding/vector retrieval required by the project specification is still pending.
- The full AI classification structure specified in the project documentation is not yet considered complete.

### GitHub Checkpoint

- Prepared the completed Day 15 work for version control.
- Changes were committed with:

`feat: add Ask LOOP and VoC reports foundation`

- The `ui-redesign` branch was used for development.
- The changes are intended to be merged into the `main` branch and pushed to GitHub.
- `.env` remains excluded from version control so API keys and database credentials are not exposed.

### Next Step

Continue the AI implementation once the required Anthropic API credits are available, including the remaining classification requirements and semantic retrieval/embedding functionality.