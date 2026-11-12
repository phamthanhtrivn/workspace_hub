# AI service cleanup

Simplify the six reviewed areas while preserving authorization, resumable work and the rule against replaying unknown provider outcomes.

- [x] Share quota admission; remove provider-level retry loops.
- [x] Separate feature model configuration and update environment documentation.
- [x] Share in-flight authorization checks across job checkpoints and pollers.
- [x] Give summary checkpoints explicit keys and migrate old checkpoints on read.
- [x] Remove unreachable RAG route writes and trivial unused wrappers; preserve old route reads.
- [x] Run API lint/build, regression tests and focused quota/checkpoint/RAG checks.

Validation: API lint, typecheck and build passed; 88 Node tests and 6 Python
route/cache tests passed. The AI environment contract passes. The full local
environment validator still reports 14 pre-existing issues outside AI.
Live LLM, Qdrant and speech-model integration was not exercised.

Follow-up correctness fixes: authorize work context immediately before model
submission, count the complete Notebook system prompt in quota admission, claim
summary jobs atomically, link request cancellation to summary artifacts, serialize
fallback conversion with document mutations, and allow text extraction without
Vision. Cleanup now uses a transactional SQL outbox. Apply migration 009 before
starting the updated API/worker; it has not been applied to a live database here.

Final deployment review: not yet approved for production. Production preflight
and Compose now require the runtime service keys rather than legacy aliases;
three deployment regression tests pass (97 tests total). Current deploy/ai/.env
fails preflight for AI_TO_USER_KEY, AI_TO_COMMUNICATION_KEY,
COMMUNICATION_TO_AI_KEY, DATABASE_URL and POSTGRES_PASSWORD. Secrets were not
printed or changed during this review. Local Compose syntax validation passes.
Docker daemon is unavailable, so image build, real PostgreSQL migration and live
readiness/provider integration remain unverified.

Resolved concurrency findings: notebook deletion now drains active indexing and
fallback under a shared/exclusive scope guard, rejects late mutations, and keeps
source cleanup repeatable. Independent uploads remain parallel. This guard is
process-local and requires the existing single RAG process/replica deployment.
Summary claims now assign a UUID run_id; every worker write and poll is fenced
by that run. Claim returns the current checkpoint atomically, avoiding stale
pre-claim snapshots. Migration 010 must run before the updated summary worker.
Concurrency regressions cover overlapping delete/index/fallback, nested work,
parallel uploads, and both success/failure from an old run after explicit resume.
Post-fix validation: 92 Node tests and 9 Python tests passed (101 total); API
lint/typecheck/build and syntax parsing of all 20 worker Python files passed.
Migrations 009/010 and live stack startup have not been executed here.
