# AI Service performance

- [x] Capture isolated before/after benchmarks (no model calls).
- [x] Reduce repeated prompt serialization, image lookups and unused history reads.
- [x] Overlap independent authorized source reads.
- [x] Retry quota admission near capacity expiry, without replaying providers.
- [x] Verify query plans, builds and regressions; report deployment limits.

Keep current branch, model, quotas and permission checks.

Results: docs/testing/ai-performance/README.md. All 173 AI tests pass; deployment load testing remains unavailable.
