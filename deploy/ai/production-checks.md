# AI production verification

This records reproducible checks, not a guarantee of zero defects. No production
deployment or registry publishing was performed. Existing local AI databases
remain deleted; integration data lives in temporary Docker containers.

## Verified locally

- Verification on 2026-11-12: 131 Node tests (including Docker integration and
  production Compose rendering) and 9 Python tests pass.
- API and RAG production images build from pinned base-image digests. The RAG
  build checks dependency consistency and native Torch/torchvision imports.
- Frontend production build succeeds. Inter is bundled locally, including its
  license, so Google Fonts is no longer a build-time network dependency.
- API lint/types and the AI/Work Assistant UI lint pass. Runtime Node dependencies
  in API and frontend report zero known npm audit findings at verification time.
- The regression gate covers quotas, authorization, SSE parsing, cancellation,
  resumable summaries, schema readiness, routing and concurrent scope deletion.
- Real API/worker containers run with temporary PostgreSQL/Redis. Tests exercise
  failed migration-history rollback, concurrent migrators, authenticated HTTP,
  source indexing, chat, summary, cancellation, permission revocation, a PostgreSQL
  dump/restore drill, Redis snapshot restore, cleanup outbox processing and clean
  SIGTERM exit. Migration checks use the built production image.
- The same HTTP test passes with real RAG/Qdrant and the cached local multilingual
  embedding model mounted read-only. Cleanup verifies zero remaining scoped
  points across Qdrant collections. Every collection is snapshotted/restored into
  a temporary collection and exact point counts are compared before cleanup.
- A separate synthetic diagnostic using the currently configured local LLM
  account returned HTTP 200, nonempty text and finish reason `stop`. This does
  not verify a different production account or its quota/capacity.

## Reproduce

Install the API, Communication and frontend locked Node dependencies; use Node
22.22 or newer in the Node 22 line and Python 3.12. Communication supplies the
TypeScript test loader; its production database is not used.

```sh
node backend/scripts/test-ai.mjs
docker build -t workspacehub-ai:production-check backend/ai-service/api
docker build -t workspacehub-rag:production-check backend/ai-service/rag-worker
AI_TEST_RAG_IMAGE=workspacehub-rag:production-check node backend/scripts/test-ai.mjs --integration
```

The integration test creates uniquely named containers/network and removes them
in `finally`. It uses synthetic User/Document/LLM HTTP boundaries. Real RAG/Qdrant
use an embedding HTTP fixture by default, avoiding paid calls/model downloads in
CI. Set `AI_TEST_MODEL_VOLUME` to an existing Hugging Face model-cache volume to
exercise real local embeddings instead; that volume is mounted read-only.

`.github/workflows/ai-service.yml` runs required lint/build/audit and the complete
regression/integration gate for relevant pull requests. The workflow was added
locally; a GitHub Actions run still needs to execute after the change is pushed.

## Required on the target environment

Supply the actual APP/INFRA addresses, frontend HTTPS origin, registry image
digests and production credentials through private `deploy/ai/.env.production`.
No production credentials or addresses are fabricated by these tests.

```sh
node backend/scripts/check-ai-infrastructure.mjs --env deploy/ai/.env.production --production
docker compose --env-file deploy/ai/.env.production -f deploy/ai/compose.production.yml config --quiet
```

Provision the dedicated `notebook` role/database with the bootstrap procedure in
README, then run migrations 001–010 before the new API/jobs. RAG must remain one
process and one replica: its mutation locks are process-local. Enable optional
Work/Conversation/Vision/Speech features only after configuring their actual
peer services and verifying their flows on staging. The baseline integration
test does not certify those external services, OCR accuracy or speech quality.

Before production traffic, verify TLS/gateway routing and identity-header
replacement on the real domain, the target account's model access/quota, peak
memory/latency, alert delivery and backup retention. `/ready` is a dependency
check, not a throughput or answer-quality guarantee.

## Backup and recovery

Keep matching PostgreSQL, Qdrant and embedding-cache backups; preserve the Redis
AOF/queue state. Pause API/jobs and let active calls settle, then stop RAG before
taking a consistent set. Include every `wh_notebook_*` collection, including
`wh_notebook_manifests_v1`; a vector-only backup loses active generations/routes.
Original files remain owned/backed up by Document Service.

Test restore into separate storage/database/network before modifying production.
Compare migration ledger, notebook/source counts, completed artifacts and scoped
retrieval. Automated drills cover PostgreSQL, Redis and Qdrant on temporary
infrastructure. Backup retention, off-server storage and alert delivery still
need verification on the target environment. Do not use FLUSHALL or remove
shared database volumes.

Rollback by stopping API/jobs or disabling AI, preserving database, queue and
Qdrant data. Reverting application images after schema changes requires checking
their compatibility; never automatically reverse migrations or delete data.
