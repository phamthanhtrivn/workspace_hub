# AI Assistant conversation context isolation

The assistant now has independent conversation lists and histories for Dashboard,
Projects, Calendar, and every Project Detail. The current implementation branch is
`fix/ai`.

## Contract and behavior

Session restore/list/create requests and message requests require `contextType`:
`dashboard`, `projects`, `calendar`, or `project_detail`. Only `project_detail`
accepts and requires `projectId`. Message `audience` must agree with the context.
Responses identify their `contextType` and nullable `projectId`.

The session resolver filters by `(owner_id, context_type, project_id)`, orders by
`updated_at DESC, id DESC`, and creates a row only when no conversation exists.
The existing transaction advisory lock serializes concurrent restores and explicit
creation. New Conversation creates a separate empty conversation in that context;
empty conversations participate in latest restoration. Completing an answer updates
the session timestamp, so an older conversation can become the latest again.

Session IDs, list cursors, and message cursors cannot cross the authorized owner,
context, or conversation boundary. Project membership is checked before opening,
listing, creating or generating in a Project Detail, and existing checks during
streaming/final persistence remain. The model receives history from its session
only, and its fresh data scope comes from the session's saved context rather than
an audience override in a request.

The launcher preserves its open state and remounts the panel by user and context
when the route changes. This resets conversation selection and drafts, aborts
history/list requests and streaming, and restores the destination's latest session.
Moving within the same Project Detail preserves the current conversation. Task
reference links can navigate without forcibly closing the panel.

TanStack Query history/list keys include user, context type and project. Inactive
history/list cache entries are removed, ensuring a revisit waits for the latest
server state. Invalidations remain within the affected context. Earlier-message
pagination carries the resolved session ID, preventing a newly updated conversation
in another tab from being appended to the currently loaded history.

Navigation cancels the previous server request before a new context sends a
question. Cancellation atomically marks a running request CANCELED, freeing the
per-user active slot; final persistence requires a matching owner, session and
RUNNING request. Rapid navigation also waits for earlier cancellations when an
intermediate unsent request has no server row. Canceled or failed drafts are not
saved. A result already committed before cancellation remains in its original
conversation. The existing 20-message / 12,000-byte model history budget remains.

## Migration and rollout

`backend/ai-service/api/migrations/008_work_assistant_contexts.sql` adds
`context_type`, validates its relationship with `project_id`, and indexes owner,
context, project and latest ordering. It can be run again safely.

Legacy rows without a project become Dashboard conversations; project rows become
Project Detail conversations. Old personal histories lack a reliable page identity
and may have mixed scopes, so they stay in Dashboard and are not copied into
Projects or Calendar. Message rows are preserved.

Deploy the migration, backend and frontend together. Session APIs intentionally
require the new context contract; older clients without it receive HTTP 400, and
older API binaries do not supply the required database column. Do not run old API
writers against the migrated schema. From `backend/ai-service/api`, with its
normal database configuration available, run `npm run build` then `npm run migrate`
while the old API is stopped, then start the updated backend and frontend. The
local security migration registry also includes migration 008.

For rollback, stop writers, restore a pre-migration database snapshot together with
the matching API/frontend versions. Do not merge the new context histories into a
shared personal conversation.

## Files changed

- Database: `api/migrations/008_work_assistant_contexts.sql`, `api/src/migrate.ts`
  under `backend/ai-service`, and
  `backend/scripts/local-security/local-migrations.mjs`.
- Backend `api/src/modules/work-assistant/`: `work-store.ts`,
  `work-assistant.types.ts`, `work-assistant.schemas.ts`,
  `work-assistant-access.service.ts`, `work-assistant-query.service.ts`,
  `work-assistant-generation.service.ts`, `work-assistant-sse.service.ts`,
  `work-assistant.service.ts`, `work-assistant.controller.ts`.
- Frontend `frontend/web/features/work-assistant/`: `types.ts`,
  `constants/work-assistant.ts`, `api/work-assistant.api.ts`,
  `hooks/use-work-assistant.ts`, `components/work-assistant-launcher.tsx`,
  `components/work-assistant-panel.tsx`.
- Tests `backend/security-tests/`: new
  `work-assistant-context-frontend.test.mjs` and
  `work-assistant-context-runtime.mjs`; updated `work-assistant-runtime.mjs`,
  `work-assistant-streaming.test.mjs`, `work-assistant-streaming-frontend.test.mjs`.
- Plan: `work-assistant-context-isolation.md`; this validation report.

## Verification

Run from the repository root:

```powershell
node --test backend/security-tests/work-assistant-streaming.test.mjs backend/security-tests/work-assistant-streaming-frontend.test.mjs backend/security-tests/work-assistant-frontend.test.mjs backend/security-tests/work-assistant-context-frontend.test.mjs
node backend/security-tests/work-assistant-runtime.mjs
```

The first command exercises the real frontend launcher, panel, hook and SSE client
with controlled HTTP boundaries, alongside existing streaming/model-budget tests.
The runtime command starts the compiled API, real isolated PostgreSQL and Redis,
Next.js and a headless Edge browser. User authorization and work-data services are
fixtures; the provider is a controlled SSE fixture through the actual model SDK.
It does not call a paid model by default. Docker images are reused locally and
isolated containers and processes are removed after the run.

New checks include 40 simultaneous restores across five contexts, repeatable
migration preserving legacy history, updated-at restoration, empty New Conversation
restoration, stable cursor pagination, cross-context and foreign-user rejection,
revoked project membership, actual model input history/data isolation, cancellation
and request ownership, open-panel navigation via real Next.js links through all
five contexts, refresh without duplication, navigation while streaming, delayed
responses, rapid navigation, and pagination after another tab changes the latest
conversation.

Results (2026-11-10):

- Node regression tests: 30/30 passed (24 existing checks and six new frontend
  context/race regressions).
- Real database/API/browser acceptance: all checks passed, including all 13
  context checks; no browser JavaScript errors. Both desktop and mobile layouts
  remain covered by the existing acceptance flow.
- AI API TypeScript build: passed. Frontend source TypeScript check: passed with
  the normal project configuration extended to exclude generated `.next` files.
  A normal full typecheck can include stale route files left by other branches.
- ESLint for all changed backend/frontend TypeScript files: passed using each
  package's actual configuration and locally installed shared tooling (the AI API
  package lacks a local ESLint binary, and the frontend lacks its Prettier plugin).
- In the last runtime fixture run, backend history reads took 3.93–10.72 ms and
  first deltas took 18.47–51.11 ms. The first browser text appeared after 1,410 ms
  through the dev server/browser proxy. Provider completion was deliberately
  delayed by 2.5 seconds. These are local fixture measurements, not production or
  live-model latency guarantees.

The regular application database has not been changed by this test run. Apply
migration 008 as part of the coordinated application rollout described above.
