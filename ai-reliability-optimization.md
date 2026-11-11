# AI reliability and optimization

- [x] Classify quota and dependency failures; preserve cancellation reasons; prevent automatic Vision replay after unknown outcomes.
- [x] Stage complete indexes before activation; store document routing with Qdrant rather than disposable vector cache.
- [x] Queue expensive local fallback and report preparation status to callers.
- [x] Reduce cache maintenance, avoid unnecessary Vision, and synthesize summary sections.
- [x] Normalize AI API code and pass lint, types and regression tests.
- [x] Verify stored documents, run bounded concurrent workload, deploy safely and check service readiness.

Keep existing document data, provider credentials, authorization and explicit retry semantics. Do not raise concurrency without measurements. Record measured results and remaining provider/resource limits.

## Verification

- API lint/typecheck/build passed; runtime npm audit reports zero vulnerabilities.
- Frontend changed-file lint passed; source typecheck: 1,056 files, zero diagnostics.
- Node/frontend regression suite: 83 tests passed.
- RAG/cache/index/fallback/OCR regression suite: 38 tests passed; speech: 3 passed (124 regression tests total).
- Existing READY documents: 28 routes migrated, 1,208 stored chunks verified.
- Actual stored PDF preflight: 307,919 bytes, 421 ms in the measured run.
- Thirty retrieval requests over real indexed documents: zero errors. At concurrency 1/3/5, p95 was 280/792/640 ms in the measured run.
- Provider synthetic summary and Vision probes completed normally; no real document content was sent for those probes.
- Synthetic five-document indexing verified one model per source, durable routing after deleting legacy cache routes, incremental cache hits, and complete test-scope cleanup.
- Concurrency was retained. Measurements used local retrieval and do not establish external-provider throughput or production capacity.
- Historical FAILED source records retain their real status; changed/revoked sources and files exceeding supported limits must be corrected by the owner. Vision is retried only explicitly.
