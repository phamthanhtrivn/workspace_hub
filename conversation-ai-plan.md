# Conversation AI with LangChain

- [x] Add a scoped LangChain history tool and authenticated queue endpoint.
- [x] Persist AI requests in Communication Service; authorize history and bot replies.
- [x] Trigger from saved channel/direct messages and preserve thread scope.
- [x] Add AI mention and sender presentation using existing UI components.
- [x] Verify builds, permissions, tool calling, duplicate delivery, and error handling.

History is at most 30 text messages before the triggering message. Deleted,
recalled, system and AI messages are excluded. Provider calls are never replayed
after an unknown outcome. Real model compatibility is checked with synthetic data.

Local database migration could not run: localhost:5433 was unavailable. Frontend typecheck has existing dependency/type errors; backend builds and tests are verified.

## Optimizations
- [x] Dedicated conversation queue/worker and readiness heartbeat.
- [x] Immediate dispatch after commit, bounded parallel requests and recovery sweep.
- [x] Transactional reply outbox with leases, backoff and permission rechecks.
- [x] Actor/time index for per-user rate limits.
- [x] Apply local migrations and run live HTTP/queue/model/database/socket smoke test.
- [ ] Manually verify the authenticated browser UI.

## Reliability fixes
- [x] Reproduce null-history and mid-agent permission revocation failures.
- [x] Preserve database timestamp precision and validate immutable question snapshot.
- [x] Checkpoint model results before delivery; abort on permission revocation.
- [x] Reserve due dispatch batches fairly, reject bot/system spoofing and cross-channel roots.
- [x] Add HTTP, model, worker and PostgreSQL regressions; document remaining E2E limits.

## Runtime follow-up
- [x] Repair frontend installed dependency/types and add typecheck script.
- [x] Align Prisma/runtime env precedence with production/development tests.
- [x] Baseline verified existing database; apply all AI migrations.
- [x] Reject unverified socket identities; synchronize existing local JWT key.
- [x] Patch audited runtime dependencies; verify migration CLI and tests.
- [x] Rebuild Docker API/worker and pass live synthetic general/summary scenarios.
