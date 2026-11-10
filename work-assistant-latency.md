# Work assistant response latency

Follow-up to commit `3477b766`, preserving the 20-message history and streaming behavior.

- [x] Reproduce sequential post-answer history/conversation refresh with a delayed response.
- [x] Refresh both queries concurrently so a slow history read does not delay the conversation list or release of the send slot.
- [x] Record time to the first emitted text delta and emitted delta count in existing pipeline logs, without logging answer content.
- [x] Verify concurrency, metric behavior on success/failure, existing streaming tests, TypeScript and lint.

The local AI health endpoint is not reachable in this session. Live-provider latency cannot be measured yet; mock timing checks do not establish production speed.

Verification: the delayed-refresh test failed before the change and passed after the queries were made concurrent. All 22 tests in the three work-assistant security test files pass. AI API build/typecheck and frontend source typecheck pass (frontend excludes stale `.next` generated types using the same temporary config as the initial implementation). Lint uses the repository configurations with existing installed tooling. No dependencies or provider settings changed.
