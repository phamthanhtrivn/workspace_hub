# AI service cleanup

- [x] Preserve abort causes and share cancellation classification between interactive flows and summary jobs.
- [x] Keep Notebook social replies in the application and make the model citation policy consistent.
- [x] Skip preflight for unchanged existing sources and duplicate references, retaining transactional capacity checks.
- [x] Release the query-cache lock before embedding; keep duplicate query misses coalesced.
- [x] Allow optional ensemble models to fail warm-up while requiring the primary model and safe shard readiness.
- [x] Reuse bounded response reading in the speech client and verify reader cleanup.
- [x] Add focused regression coverage, run existing tests, lint, typecheck and build.

Verified: 87 Node tests, 14 RAG tests, 3 speech tests; API lint, typecheck,
type-safety checks and build passed. RAG sources compile and readiness reports
only models that passed the current probe. External providers were stubbed.

Retry preflight and source authorization remain in place.
