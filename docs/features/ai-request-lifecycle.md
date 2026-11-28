# AI request caching and replay

## Work Assistant

Dashboard, Projects, Project Detail, and Calendar share one Work Assistant
implementation. Opening a panel reads conversation data; it does not invoke the
model. A submitted question always reads fresh task/calendar context.

History and conversation lists use TanStack React Query's in-memory cache:

- Freshness: 30 seconds (`staleTime`).
- Retention: five minutes after the last observer stops using the query (`gcTime`).
- Keys include the account, context/project, and selected session.
- Reloading the page clears this cache; no conversation cache is persisted to
  browser storage.

A lightweight permission check gates cached content on each panel mount. Its
permission stamp comes from server-side project references and current access,
not project IDs supplied by the browser. A changed stamp or failed verification
clears cached messages and conversation titles for that scope. Account changes
clear the shared QueryClient. Permission notifications, membership events, and
project-socket reconciliation reset Work Assistant queries.

Failed reads wait for an explicit retry or reopening. History has no polling,
window-focus refresh, or automatic error retry. Closing the panel or changing
its keyed account/context/session aborts the stream and requests cancellation.

After an interrupted response, Retry checks the previous request's server state:

- `COMPLETED`: reload the saved answer without invoking the model again.
- `RUNNING`, or an unavailable status endpoint: do not start another generation.
- `NOT_FOUND`: resend with the original request ID, preserving DB idempotency.
- Confirmed failure/cancellation/interruption: an explicit retry uses a new ID.

## Chat attachment summaries

Summary requests share a transaction-scoped DB lock by conversation type, chat,
source thread, immutable storage identity/document revision, and question.
Linked documents are reauthorized through Document Service before a cache lookup.
Changing the file version, question, chat, or thread produces a different key.

Concurrent requests reuse one queued/running request. An available completed
reply opens the shared Document summary dialog. **Generate again** explicitly
creates another generation; concurrent regeneration requests still share active
work. Each explicit action has a unique ID so replaying its HTTP request cannot
create a second generation. Reuse does not publish another question/reply event
or increment thread counts.

Current chat membership, send restrictions, source availability, document access,
and thread availability remain enforced before reuse. Recalled/deleted results
are not reused. Existing historical requests are not backfilled or merged.

The preview uses the application's dialog/theme, renders Markdown without HTML
or external images, and clears its content when relevant access changes arrive.
Idle message components do not register global summary listeners or poll for AI
results. The normal chat socket delivers newly completed answers.

## Local rollout

No environment variables or worker concurrency settings change in this update.
Keep infrastructure, RAG, speech, and the existing jobs worker running. From the
repository root, rebuild only the AI API:

```powershell
docker compose -f backend/docker/compose.yml up -d --no-deps --build notebook-api
Invoke-RestMethod http://127.0.0.1:8087/ready
```

Stop the host Communication dev terminal with Ctrl+C, then use a terminal rooted
at the repository:

```powershell
cd backend/communication-service
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

The migration adds nullable summary-key/action-ID columns and indexes. Existing
credentials, volumes, requests, and messages are preserved. Deploy the AI API and
Communication update before using the updated web client. In a separate terminal:

```powershell
cd frontend/web
npm run dev
```

An already running web dev process uses hot reload; refresh the browser after
backend readiness. The maintained regression tests use mocks for model/document
responses and check cache isolation, permission failures, retry decisions,
concurrency, source revisions, and explicit regeneration. No real meeting/chat
content is sent to a model by these checks.
