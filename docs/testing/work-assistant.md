# Work assistant: context, rollout and verification

## Conversation boundaries

Dashboard, Projects, Calendar and each Project Detail have separate conversations.
Session APIs require `contextType` (`dashboard`, `projects`, `calendar`,
`project_detail`); only Project Detail requires and accepts `projectId`. The message
audience must match. History, session lists and cursors are checked against owner
and context; Project Detail also checks current membership. Model data scope comes
from the stored session, and history comes only from that session.

Restore selects `updated_at DESC, id DESC`, creating only when no conversation
exists. A transaction advisory lock prevents duplicate concurrent restores. New
Conversation explicitly creates an empty conversation in the current context.
Empty conversations can be restored, and completing an answer updates its session.

The open panel follows route changes, resets conversation selection and drafts,
and cancels the previous stream. Query keys include user, context and project;
invalidations stay within the affected context. Inactive histories are evicted so
revisits fetch the latest session. Earlier-message pagination pins its session ID.
Server cancellation frees the active request slot before a new context sends.
Failed/canceled drafts are discarded; only completed, authorized answers persist.

Model history keeps up to 20 messages with a 12,000-byte serialized JSON budget,
prioritizing newer text. User messages are limited to 1,000 characters and assistant
messages to 1,500. Long older details can be lost; this is not lossless memory.

## Migration

Migration `backend/ai-service/api/migrations/008_work_assistant_contexts.sql` adds
the context column, project consistency constraint and latest-session index. Legacy
sessions with no project become Dashboard conversations; existing project sessions
become Project Detail conversations. Old mixed personal history is preserved only
in Dashboard, without copying it into other pages. The migration is repeatable.

Deploy database, API and frontend together. Stop old API writers, run `npm run build`
and `npm run migrate` from `backend/ai-service/api` with its normal database
configuration, then start the updated API/frontend. Older clients without a context
receive HTTP 400; older API writers cannot insert the required context column.
Rollback requires the matching pre-migration database snapshot and application.

## Tests

From the repository root:

```powershell
node --test backend/security-tests/work-assistant-streaming.test.mjs backend/security-tests/work-assistant-streaming-frontend.test.mjs backend/security-tests/work-assistant-frontend.test.mjs backend/security-tests/work-assistant-context-frontend.test.mjs
node backend/security-tests/work-assistant-runtime.mjs
```

Build the AI API before runtime acceptance. The runner needs Docker with local
`wh_postgres`/`wh_redis` images and frontend Playwright/Edge. It starts the compiled
API, isolated PostgreSQL/Redis, Next.js and the browser, then cleans its containers
and processes. Authentication, work services and model are fixtures; the normal
application database is untouched. The default run makes no paid provider calls.
Artifacts are generated under `workspacehub-work-assistant-runtime` in the OS
temporary directory (`result-fixture.json` and browser screenshots).

Coverage includes 40 concurrent restores across five contexts, latest/empty session
restoration, New Conversation, owner/project authorization, cursor pagination,
model input isolation, refresh, navigation while streaming, late results, rapid
navigation and pagination after another tab updates the latest conversation.

## Optional live model check

```powershell
node backend/security-tests/work-assistant-runtime.mjs --live-context
```

This uses the provider configuration in `backend/ai-service/.env`, at most six
requests, synthetic histories only, normal API token admission and no retries.
Requests are spaced for quota; spacing is excluded from response timing. Expected
facts are derived from the actual model payload after history truncation. Results
are generated as `result-live-context.json` in the same temporary directory;
failures return a nonzero exit code.

The 2026-11-10 sample used `gpt-6.1-sol`: 26/26 transmitted facts recalled, no
foreign-context marker observed, and a new conversation sent zero history.
Four of 30 original facts were truncated from long histories. Strict cases passed
5/6: Project A recalled its secret but returned null for the repeated field
`other_contexts.project_a`. Median first text was 3.967 s and completion 5.849 s;
the slowest case took 19.307 s, excluding browser rendering. This is six observations,
not a production guarantee. Earlier prompts also elicited guesses when an old fact
was absent, so a missing fact must not be treated as reliable model memory.

After cleanup, all 30 regression tests, frontend source typecheck (excluding stale
generated `.next` routes), ESLint and database/browser acceptance passed, including
all 13 context checks. One earlier browser run timed out during navigation; an
isolated rerun passed. Detailed generated payloads stay outside source control.
