# Local environment contract

Keep each private `.env` in its service directory. Node services load their
own file; User Service needs its variables supplied by the IDE or terminal.
The frontend uses `frontend/web/.env` for host development and `.env.docker`
for its Docker build. Neither private values nor example env files are stored
in the repository.

Run from the repository root:

```powershell
node backend/scripts/prepare-local-security-env.mjs
node backend/scripts/validate-local-env.mjs
node backend/scripts/check-ai-infrastructure.mjs --env backend/ai-service/api/.env
```

Preparation is a dry run unless `--write` is supplied. It generates a distinct
credential for each caller/receiver edge only when missing, preserves existing
provider keys and database URLs, and backs up each changed file under ignored
`.tmp/security-env-backups`. The validator reports variable **names** only.
Its reader inventory is `docs/local-env-contract.json`; the 16 caller/receiver
edges and route scopes are defined in `backend/scripts/local-security/contract.mjs`.

The current local setup uses the same `postgres` username/password from
`backend/docker/.env` in all seven application `.env` files. Each service still
uses its own database on the single `wh_postgres` container, including AI's
`notebook_db`. This shared administrator credential does not provide database
permission isolation. The private, Git-ignored
`backend/.env.security-db-plan.json` remains available for migration tooling
and must not be published. Restricted `wh_*` roles are an optional later cutover.

Compose needs both infrastructure and LiveKit interpolation files:

```powershell
docker compose --env-file backend/docker/.env --env-file backend/livekit/.env -f backend/docker/docker-compose.host.yml config --quiet
```

For host services, use the published PostgreSQL/Redis/Kafka ports and local
service URLs already configured on this machine. Kong inside Docker reaches
host services via `host.docker.internal`. Optional flags remain at their
existing values; a disabled feature does not require unused optional keys.
Production/CI still have a separate legacy contract and need their own rollout.

User Service requires `FRONTEND_URL` to match the browser frontend origin,
including its scheme and port (for example, `http://localhost:3000`). Cookie-based
refresh and logout reject other origins before changing the session. Browser
requests must supply a matching `Origin` or `Referer`; a native client without
browser Fetch Metadata can continue using the refresh cookie without those headers.
Supply this setting to the User JVM through the same IDE or terminal environment
as its other variables; merely editing `.env` does not load it into Java.

Local S3 credentials, private asset references and bucket requirements are
documented in [local S3](local-s3.md).

AI model settings are independent per feature. `CONVERSATION_AI_MODEL` and
`CONVERSATION_AI_MAX_TOKENS` apply only to chat mentions/attachments;
`WORK_ASSISTANT_MODEL` and `WORK_ASSISTANT_MAX_TOKENS` apply to the work assistant;
`MEETING_SUMMARY_MODEL` and `MEETING_SUMMARY_MAX_TOKENS` apply to meeting summaries.
Models default to `LLM_MODEL`. The work assistant defaults to 1,800 output tokens
(maximum 2,200); conversation and meeting token settings default to `LLM_MAX_TOKENS`,
with the existing per-stage caps still applied.

Rename `CONVERSATION_AI_QUOTA_WAIT_MS` to `LLM_QUOTA_WAIT_MS` (default 60,000,
range 0–60,000). It bounds waiting for local minute-quota admission, without
retrying a provider request. Notebook chat continues to fail immediately on a
minute quota so its streaming request stays within the gateway timeout.
Remove `MEETING_STT_CONCURRENCY`: the local speech pipeline is always serial.
Existing private env files in this workspace have been updated for these names.
Explicit Conversation AI model/token overrides were copied into the new feature
settings where needed to preserve their previous effective values.

Summary checkpoints from the old `synthesis:...` source-ID representation remain
readable. RAG promotes existing SQLite routes to Qdrant when first read; new
caches store only embedding vectors. No database reset or re-index is required.

Before running the updated API and worker, apply migration
`009_cleanup_outbox.sql` with the normal AI migration command (`npm run migrate`
from `backend/ai-service/api` after building). Source/notebook deletion writes a
cleanup outbox entry in the same transaction; the worker drains committed entries
on startup and every 30 seconds. Failed cleanup remains available for retry.
The migration also links chat requests to summary artifacts so cancellation can
stop the corresponding background summary.
