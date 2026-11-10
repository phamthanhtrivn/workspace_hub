# Work assistant response latency

Follow-up to commit `3477b766`, preserving the 20-message history and streaming behavior.

Scope confirmed: optimize response latency, verify the running application, and bound the 20-message model context.

- [x] Reproduce sequential post-answer history/conversation refresh with a delayed response.
- [x] Refresh both queries concurrently so a slow history read does not delay the conversation list or release of the send slot.
- [x] Record time to the first emitted text delta and emitted delta count in existing pipeline logs, without logging answer content.
- [x] Verify concurrency, metric behavior on success/failure, existing streaming tests, TypeScript and lint.
- [x] Bound serialized history content, preserve up to 20 visible messages and prioritize recent text without an additional model call.
- [x] Exercise the built service and browser UI with isolated test data; record which real integrations are available.

Docker Desktop was initially stopped; it was started for validation. The existing local AI environment has no `api/.env`, no working notebook database connection, and incomplete work-assistant configuration. Existing private env files were preserved. Runtime verification used separate temporary PostgreSQL/Redis containers and fixture Auth/Project/Calendar responses.

Verification: the delayed-refresh test failed before the change and passed after the queries were made concurrent. All 24 tests in the three work-assistant security test files pass. The history test keeps twenty long multilingual messages, JSON escaping and Unicode within 12,000 bytes while retaining current work-task detail. AI API build/typecheck and frontend source typecheck pass (frontend excludes stale `.next` generated types using the same temporary config as the initial implementation). Lint uses the repository configurations with existing installed tooling. No dependencies or provider settings changed.

Runtime acceptance passed the compiled API, actual isolated PostgreSQL/Redis, 20-message budget, desktop progressive rendering, completed-only persistence, mobile layout, cancellation and interrupted-provider cases. One additional synthetic request to the configured live provider completed: first SSE content at 3,448 ms and completion at 4,663 ms, with no browser page errors. This is one sample through a local test bridge, not a production performance guarantee. The API's own log recorded first delta at 3,429.96 ms and completion at 4,644.26 ms. Test containers and child processes were cleaned up.
