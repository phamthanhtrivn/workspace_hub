# Conversation AI (LangChain)

Type `@ai tóm tắt hội thoại` or `@ai cách ngủ ngon` at the start of a message.
Channels, direct conversations and their threads are supported. `ai` appears in
mention suggestions. Conversation history reads text only. Use an attachment’s “Tóm tắt bằng AI” menu action to summarize an explicitly selected PDF, DOCX, TXT or MD file.

## Local setup

1. From repo root: `node backend/scripts/configure-conversation-ai.mjs`.
2. In backend/communication-service: `npx prisma migrate deploy`, with the same
   DATABASE_URL as runtime (.env.local overrides .env during development).
3. Run `npm run build` in both services, restart Communication Service and AI API
   (`npm start`), and start the AI worker (`npm run worker`). Redis and PostgreSQL
   must be available. Refresh the frontend.

The setup script creates a dedicated shared AI_COMMUNICATION_SERVICE_KEY without
printing it and enables CONVERSATION_AI_ENABLED in local service env files.
If deploy/ai/.env already exists, the setup script also synchronizes its conversation
key and enables the bot with COMMUNICATION_SERVICE_URL=http://host.docker.internal:8083.
The Docker stack reads deploy/ai/.env, while a host AI process reads backend/ai-service/.env.
Use the configured gateway JWT_SECRET_KEY in Communication Service for signed socket authentication.
Disable with CONVERSATION_AI_ENABLED=false on both services.

## Data and execution

The history tool has no model-selectable conversation/user IDs. Communication
Service validates channel + space membership or direct participation, checks the
trigger and thread root still exist and were not recalled, and rechecks permission
before returning history or publishing the answer. It takes at most 30 preceding
TEXT messages, excludes deleted/recalled/system/AI messages and later messages,
and orders them oldest first. Threads include only their root and replies.
Each message excerpt is at most 2,000 characters, with a shared 24 KB history budget; shortened excerpts are marked truncated. History and speaker names are
sent to LLM_BASE_URL, explicitly approved by the project owner. No content/keys
are logged. Keep LangSmith tracing disabled for real conversation data.

Requests are registered in the message transaction and dispatch is scheduled immediately
after commit. A 10-second recovery sweep retries missed dispatches, with at most four
queue HTTP requests in flight per sweep. Conversation jobs run in a dedicated
conversation-ai-jobs queue/worker, independent of indexing and summaries. Readiness
requires its heartbeat when conversation AI is enabled. Existing active jobs on the
legacy notebook queue finish there; they are not duplicated into the new lane. Atomic claim tokens prevent replaying provider calls after
crashes or duplicate jobs. Finished answers are checkpointed in the BullMQ job
before delivery, so delivery retries reuse the result without another model call.
The worker revalidates membership and the question hash before model turns and
every 5 seconds while generating; revocation aborts the active request. Completion saves the deterministic reply ID and an outbox event in the same transaction.
A durable outbox retries socket publication with backoff (up to 5 minutes) and a
30-second lease; expired leases recover after restart. Permission is rechecked on
each publication attempt; revoked/deleted sources cancel delivery. Delivery retries
cannot create duplicate message rows. Socket events may repeat that same ID;
clients should retain their existing message upsert-by-ID behavior.
A RUNNING request with no successful validation heartbeat for 5 minutes gets an error reply; send a new @ai request
to retry. Limit: 10 requests per user/minute. Configured model quota limits apply per model; Conversation and Notebook share counters when using the same model.

## Verification

- AI Service: `npm test`.
- Communication Service: `npm test -- --runInBand`.
- After building Communication Service: `node --test test/conversation-ai-db.cjs`.
  This uses PGlite from AI Service dev dependencies to execute PostgreSQL SQL.
- Provider tool calling was verified using synthetic data only.

## Reliability audit (2026-10-24)

- Added migration `20261024000100_conversation_ai_reliability`: question hash,
  dispatch schedule/attempts, and an index for due requests. Apply all migrations
  before restarting services.
- Dispatch atomically reserves a batch with SKIP LOCKED. Successful queue sends
  are checked again after 30 seconds until claimed; failures back off to at most
  5 minutes. Old queued requests no longer monopolize the first 20 slots.
- History ignores blank/null text and compares the cutoff against the original
  PostgreSQL timestamp, avoiding JS Date precision loss. Speaker names are bounded.
- Client AI/SYSTEM types are rejected at public send entry points. Internal system
  messages remain available; bot names require the reserved sender ID in the UI.
- Negated summary instructions do not force a history read. Empty explicit summaries
  return a local explanation. Repeated tool calls reuse one history copy in context.
- No retry can retract data already received by a provider. Permission polling
  limits continued generation and later calls; it does not undo an earlier send.
- A crash before the generated answer checkpoint is durable still has an unknown
  model outcome. It is not replayed automatically; the user sends a new @ai request.
- Live UI/Redis/PostgreSQL end-to-end verification remains separate from PGlite,
  HTTP authorization, module wiring and mocked-model tests.

## Verified local deployment — 2026-10-24

- PostgreSQL communication schema was compared to the committed pre-AI schema.
  The only drift was an index name; it was aligned before recording the existing
  33-migration baseline. All three AI migrations were then applied; Prisma status
  reports up to date. Existing chat data was preserved.
- Prisma CLI and runtime now share the same .env/.env.local loader.
- Lucide React's missing declaration file was repaired with the lockfile's version;
  frontend `npm run typecheck`, auth tests and answer rendering tests pass.
- Socket identity always verifies JWT signatures. Local Communication Service uses
  the existing gateway JWT key; no token or key is printed by tests.
- AI and Communication production dependency audits report zero known vulnerabilities
  after patched multer/Zod/deepmerge and aligned NestJS packages. Zod migration
  reference: https://zod.dev/v4/changelog.
- Rebuilt/recreated only the Docker AI API and job worker. Database and Redis volumes
  were preserved. No host AI process is needed when this stack owns port 8087.
- `node test/conversation-ai-live.cjs --run` from Communication Service passed using
  PostgreSQL, Docker Redis/BullMQ, the configured model and a real Socket.IO client.
  It tested a general question and a summary from 35 synthetic messages, checked
  no duplicate AI rows, and cleaned its synthetic rows afterward.
- The opt-in live test temporarily binds port 8083; stop a normal Communication
  process before rerunning it. It uses the configured model quota. It does not
  automate browser login or the complete visual UI flow.

## Extended regression verification ? 2026-10-24

See [CONVERSATION_AI_TEST_REPORT.md](CONVERSATION_AI_TEST_REPORT.md) for the full
217-test results, full frontend build/lint findings, live checks and environment limits.
Thread AI replies now include followers for unread updates. Once history is loaded,
the agent disables further tool requests to avoid redundant provider turns.
The live runner supports `--existing-server` and an optional Chromium `--browser`
flow; it waits for database/HTTP startup and spaces model scenarios to respect quotas.

## Model comparison ? 2026-10-24

See [MODEL_EVALUATION.md](MODEL_EVALUATION.md) for the three-model synthetic
comparison, provider pricing snapshot and protocol regression. Prefetched history
is now represented as an assistant tool call followed by its ToolMessage result,
so models can use it without a redundant retrieval turn. @ai now uses a dedicated
model and output budget; see the configuration below.


## Conversation model and token budget

Optional `CONVERSATION_AI_MODEL` and `CONVERSATION_AI_MAX_TOKENS` override the
Notebook defaults for @ai only. Unset values inherit `LLM_MODEL` and
`LLM_MAX_TOKENS`. Values are validated at startup; budget range is 256–8192.

The current host and Docker configuration uses `gpt-6.1-sol` with an output cap
of 2048 per provider call. Notebook remains `deepseek-v4.1-flash` with 4096.
The agent defaults to concise replies, expands on request, and continues to
avoid reading history for general knowledge questions. Quota reservations use
the selected conversation output budget and are recorded against its model ID.

For Docker, edit `deploy/ai/.env` then recreate `notebook-api` and `notebook-jobs`;
for host processes, edit `backend/ai-service/.env` and restart API/worker.
The benchmark runner reports these effective override values as well.

Post-switch verification: all five live API scenarios and the Chromium mention /
reply flow passed with Sol; completion replay and rate-limit rollback passed.
Auth/profile are synthetic test fixtures, while chat, DB, Socket.IO, queue and
model calls are real. Calendar/Pomodoro still return unrelated HTTP 502 because
that service is unavailable. See MODEL_EVALUATION.md for the measured token usage.

## Persistent demo conversations

From repository root (after building Communication Service), run:

```powershell
node backend/communication-service/scripts/seed-conversation-ai-demo.cjs --run --owner-email YOUR_EXISTING_ACCOUNT_EMAIL
```

The script resolves the owner in User Service, then atomically creates a demo
space in Communication DB. It reads normal service env files; `USER_DATABASE_URL`
can override the User DB connection, otherwise the same PostgreSQL connection
is used with database `user_db`. Without `--run` it only prints usage.

The space `AI Playground · Dữ liệu mẫu` includes `du-an-demo` (35 top-level
messages and 3 thread replies), `huong-dan-test` (8 tips), and a DM with Minh
(6 top-level messages and 2 thread replies). Minh, Hà and Lan are synthetic
Communication profiles, without login accounts. Only the selected existing
account is added as the real owner. Existing chats and profile values are
preserved. Stable IDs make reruns insert missing fixture rows without duplicating
or overwriting existing messages. The script prints the owner's direct chat URL.

Refresh chat and select that space. In `du-an-demo`, try:

- `@ai tóm tắt hội thoại`: the first request sees only the last 30 of 35 main
  messages, excluding the five explicitly marked old entries. Thread replies
  are separate from channel history.
- `@ai Ai phụ trách frontend và deadline?`: Minh, Thursday 16:00.
- `@ai Lịch demo cuối cùng là khi nào?`: Monday 09:00; Friday 17:00 was canceled.
- `@ai Ai nhận việc tích hợp SSO và deadline?`: both remain unspecified.
- Open PAY-01's thread and request a summary to check thread-only context.
- In the guide channel, try `@ai Cho tôi 3 cách ngủ ngon` for general knowledge.

Verification on 2026-10-24: rerunning preserved counts; space, channels and both
message endpoints returned HTTP 200 through Kong for the owner. Chromium
rendered the space, latest message and demo participant without page errors;
auth/profile were fixtures, chat data came from the real API. Seeding and this
read-only UI check do not call the external model.

## Current time in conversation replies

Every @ai request now includes a fresh server clock snapshot formatted in
`Asia/Ho_Chi_Minh` (UTC+07:00), including weekday, date and time. Questions about
today/now and relative dates use that clock; old conversation timestamps cannot
replace it. This provides time context only, without live news/weather access.
Notebook evidence-only answers keep their existing behavior.

Verified on 2026-10-24: three regression tests first failed without clock context,
then passed after the fix, including UTC day/year boundaries and two requests
across Vietnam midnight. The full AI suite passed 97/97. Rebuilt/recreated the
AI API and worker; a real queued @ai request asking “hôm nay là ngày mấy” replied
“thứ Bảy, ngày 24 tháng 10 năm 2026” and was delivered over Socket.IO. Temporary
QA data was removed afterward. Model selection and token caps are unchanged.

## Worker interruption recovery — 2026-10-24

A deployment interrupted an active conversation request before its answer checkpoint
was saved. After BullMQ retried it, the request was already claimed, so the old
processor returned without a reply and SQL remained RUNNING until lease cleanup.
The affected request was closed through the normal authenticated completion path
with a visible interruption message; the provider call was not replayed.

Conversation jobs now persist `claimToken` in BullMQ before calling the model.
If a retried job has that claim but no saved answer, the worker checkpoints a
clear interruption reply and completes it as FAILED. A saved answer still takes
precedence and is delivered without regeneration. Failure to persist the claim
cannot call the model. A crash in the small gap between SQL claim and Redis
checkpoint still relies on the existing abandoned-request timeout.

The Docker worker has `stop_grace_period: 4m`, allowing its existing SIGTERM
handler to finish active jobs, checkpoint and deliver. During this update the
old worker was drained explicitly before replacing containers. Hard kills and
host failures can still interrupt generation, so the recovery path remains needed.

Verification: all 100 AI tests passed. Three new regression checks failed before
the fix and passed after. A real queued fixture carrying only a saved claim was
recovered into an interruption reply, and a new request asking “hôm nay task của
tôi là gì” completed normally. Both replies were delivered through Socket.IO;
the temporary fixture was removed. The original user's interruption notification
was confirmed PUBLISHED. Conversation AI currently has chat history access,
without a tool querying the user's Project task database.

## Project tasks in @ai — 2026-10-24

The read-only LangChain tool `get_my_tasks` now reads real assignments from
Project Service. Try `@ai hôm nay task của tôi là gì`, `@ai task nào của tôi đang
quá hạn`, or `@ai liệt kê tất cả task chưa hoàn thành của tôi`.

The model selects only `today`, `overdue`, or `open`. It cannot select a user ID,
project ID, SQL, endpoint or mutation. Communication Service binds the sender
from the claimed message, checks chat access and unchanged trigger, derives the
linked project from the channel's space, and revalidates access after querying.
A linked project space restricts the lookup to that project. Other spaces and DMs
look across projects the sender owns or is an ACTIVE member of. As requested by
the sender, results are posted into the same conversation; they are visible to
its participants.

Project Service independently enforces assignment, current project access,
non-archived projects/tasks, non-deleted tasks and unfinished status. It returns
at most 30 tasks with a `hasMore` marker. The user lookup uses
`idx_task_assignees_user`; V21 is idempotent for installations with the V2 index.
Only titles, project names, status, priority, dates and task links reach the
configured model provider. Descriptions, comments, documents and assignee
profiles are omitted. Treat all returned text as untrusted data.

Today uses `Asia/Ho_Chi_Minh`: unfinished work due today or earlier, or scheduled
across today. Overdue deadlines and due-today tasks are labelled separately;
all-day tasks remain valid through the end of their Vietnam calendar day.
`overdue` uses the actual current time for timed tasks; `open` includes undated
and future assignments. Lists are snapshots at query time, not a planning calendar.

Project outage is returned to the agent as unavailable, distinct from a successful
empty result. The model must not infer database assignments from chat instead.
One task filter is read per request, cached alongside its tool result. Pure
conversation summaries stay scoped to chat and do not fetch Project tasks.
History/clock support, GPT-6.1 Sol selection, output budgets and interruption
checkpoint recovery remain enabled. Creating or changing tasks is not supported.

Setup from repository root:

```powershell
node backend/scripts/configure-conversation-project-ai.mjs
```

This synchronizes a dedicated `AI_PROJECT_SERVICE_KEY` between Project and
Communication, preserving existing keys and other env values. Project's
`POST /internal/conversation-tasks` requires that key even when user identity
headers or a bearer token are supplied. No shared-key/local-key fallback is used.
The AI process receives no Project credential; it calls Communication's existing
claim-bound internal action `tasks`. Configure `PROJECT_SERVICE_URL` on
Communication (`http://localhost:8082` for host development), then restart both
services and deploy the AI worker/API. Windows Docker Desktop in this session
required `node --dns-result-order=ipv4first dist/main.js` for stable Kafka access
in Project and Communication. Drain active workers before replacement.

Verification: AI 107/107 tests, Communication 92/92 tests, Project 29/29 tests;
targeted backend lint and TypeScript builds passed. The opt-in live test
`node --dns-result-order=ipv4first test/conversation-project-tasks-live.cjs --run
--model` (from Communication Service) created isolated Project/Communication QA
fixtures and checked real DB filtering, wrong-key denial, ignored actor/project
injection, linked-project scope, all-day/date handling, model tool retrieval and
Socket.IO delivery. The real answer included QA task names absent from chat,
proving Project retrieval; it separated overdue/today/ongoing work correctly.
The test removes its fixture rows. Without `--model` it checks only DB/API access;
without `--run` it does nothing. It never calls the model for real user task data.


## AI typing animation

Communication publishes a server-only `ai_typing` event after a successful claim, on the existing five-second permission heartbeat, and after a completion transaction commits (including failure replies). Events contain only `requestId`, `chatId`, `chatType`, `threadParentId` and `isTyping`, and target the current channel/DM member rooms. Presence delivery is best effort and cannot fail generation or persistence. No additional model calls or tokens are used.

The client displays **AI đang soạn tin** with three staggered dots separately in the main chat and each thread. Request IDs keep concurrent jobs independent. Completion events and AI replies carrying `aiRequestId` settle their request, and a sixty-second tombstone ignores late heartbeats. Missing heartbeats expire after twenty seconds; disconnect and scope changes clear presence and timers. A reconnect or opening an already-running chat recovers on the next valid heartbeat. Queued jobs do not claim to be typing before a worker starts. The animation respects reduced-motion preferences and announces one accessible status.

Validation (2026-10-24): Communication 108/108 tests; frontend typing plus conversation rendering 13/13; Communication and Next production builds passed. New/changed typing modules pass lint and frontend types. Existing lint findings in the large thread view and publisher are unchanged. Chromium used a temporary QA chat and the real socket/model: indicator and three dots visible while generating, indicator hidden after `BROWSER_OK`, no browser JavaScript errors. Unrelated Calendar/Pomodoro endpoints still return 502 in this local environment. QA data was removed by the live harness.

```powershell
# Communication service
npx jest --runInBand
# Frontend
node --test scripts/ai-typing.test.mjs scripts/conversation-ai.test.mjs
npm run typecheck
npm run build
# Communication service: opt-in live browser/model verification
node --dns-result-order=ipv4first test/conversation-ai-live.cjs --run --existing-server --browser-only
```


## Summarize a chat attachment

In a channel or DM, open the attachment message’s options and choose **Tóm tắt bằng AI**. Messages containing multiple eligible files show one action per filename. The action sends a normal `@ai` TEXT request with `attachmentMediaId` using the current message’s chat and thread scope; the resulting AI message is posted in that same scope. The existing typing indicator, quota, checkpoint, cancellation and durable outbox apply. The action accepts files up to 20 MiB; it does not add Notebook sources or vector entries.

Apply Communication migration `20261024000200_conversation_ai_attachments` before updating the service. It adds nullable `attachment_media_id` and `attachment_hash` columns. Registration validates the selected media in the send transaction and stores its immutable metadata fingerprint. Membership, source message, thread root, source scope and fingerprint are revalidated on claim, every five seconds, before/after granting a short-lived signed S3 URL, on completion and on outbox delivery. Only a generated `chat-media/<chatId>/...` key belonging to the current conversation is accepted. Ordinary `@ai` requests cannot invoke the attachment endpoint. The model receives no attachment IDs, signed URL, storage credentials or unrelated chat history.

The worker reuses the bounded download reader and authenticated RAG `/extract` pipeline, including existing OCR. `VISUAL_ENABLED=true` must be set on the RAG worker for this extraction path. Raw files and OCR images are processed internally. Only text excerpts and the filename go to the configured Conversation model via LangChain. The user explicitly approved this use of `https://vibi.top/v1` on 2026-10-24. Each request uses one model call, at most 1,536 output tokens and a shared 24,000-byte text budget spread across readable pages. Long-document results always disclose that they summarize excerpts; graphics not interpreted separately are also disclosed. This first version does not provide full coverage of long files or visual reasoning over charts. Empty/OCR-unreadable, encrypted and oversized files fail with safe messages instead of fabricated summaries.

Verification (2026-10-24): AI 118/118 tests (run sequentially to fit local RAM), Communication 132/132, PostgreSQL integration 2/2, frontend 17/17. Both backend builds and Next production build/typecheck passed; Next build used `CIRCLE_NODE_TOTAL=3` to keep two workers. New modules and menu lint clean; existing unrelated lint debt remains. A real Chromium click on the summary menu uploaded/downloaded a temporary synthetic PDF through S3, extracted it through RAG and received a real model summary preserving owner Lan and budget 420; typing appeared and disappeared, with no JavaScript errors. The harness removed its S3 object and QA chat. Existing unrelated Calendar/Pomodoro 502 responses remain outside this feature.

For the opt-in live PDF menu test:

```powershell
# Communication service, existing local services running
$env:PYTHONIOENCODING='utf-8'
node --dns-result-order=ipv4first test/conversation-ai-live.cjs --run --existing-server --browser-only --attachment
```

Local activation also pinned Communication’s DB hostname to `127.0.0.1` through `.env.local` after repeated startup P1001 failures with `localhost`. Credentials and the target database were unchanged. Drain the worker before service restarts.
