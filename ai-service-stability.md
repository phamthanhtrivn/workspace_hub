# AI service stability

- [x] Isolate recovery failures per job and per stage, with keyset batches and safe counters. Verified Redis/SQL failures, 205-source pagination and active-job protection using PGlite and queue doubles.
- [x] Drain API requests, workers and in-flight recovery before closing infrastructure; enforce a configurable shutdown deadline. Verified a real HTTP request, cleanup ordering, repeated signals, deadline expiry and startup/shutdown races.
- [x] Reduce chat cancellation polling to a configurable two seconds and add safe worker diagnostics. Verified cancellation, immediate disconnect handling and sensitive-data exclusion.
- [x] Document operational defaults; service suite passes 163/163 tests, strict TypeScript and changed-file Prettier checks pass. Offline npm audit reports zero known vulnerabilities in its cached data.

External Redis, production PostgreSQL, RAG/model providers and production load were not exercised. No running service was restarted or deployed.
