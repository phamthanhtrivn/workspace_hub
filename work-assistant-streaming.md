# Work assistant history and streaming

Keep up to 20 recent messages and display model output progressively in the existing assistant bubble.

- [x] Increase database and model history limits to 20, retaining per-message and model budget limits.
- [x] Stream model text through SSE; preserve tool calls, permission checks, cancellation and completed-only persistence.
- [x] Display an unfinished draft in the bubble and replace it with the saved message on completion.
- [x] Verify chunk delivery before completion, history bounds, tool calls, interrupted output, cancellation and permission failures; run TypeScript/build and lint checks.

No database migration, Redis cache or model change is required.

Verification: 21 tests passed across `work-assistant-streaming.test.mjs`, `work-assistant-streaming-frontend.test.mjs` and `work-assistant-frontend.test.mjs`. The tests exercise the real LangChain streaming SDK against a fake SSE provider, the generation/SSE workflow and the React hook in JSDOM. AI API build passed; lint passed for all seven changed TypeScript files using the repository configurations and installed tooling from Communication Service. Frontend source TypeScript check passed with a temporary config excluding stale `.next` generated types left over from other branches; the normal full check encounters those unrelated missing-route errors. No live provider latency or production deployment was tested.
