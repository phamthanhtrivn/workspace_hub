# AI Assistant conversation contexts

- [x] Add immutable conversation context and migration 008; preserve legacy history in Dashboard or its Project Detail.
- [x] Filter restore/list/cursors by owner, context type and project; derive AI data scope from the stored context.
- [x] Isolate frontend query keys and panel lifecycle; cancel streams and prevent stale callbacks on navigation.
- [x] Add database/API and frontend regression tests for restore, refresh, New Conversation, authorization and races.
- [x] Run type checks, lint, existing streaming tests and real PostgreSQL/browser acceptance tests; record results in docs/testing/work-assistant-context-isolation.md.
