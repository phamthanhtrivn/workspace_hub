# AI service cleanup

Simplify the six reviewed areas while preserving authorization, resumable work and the rule against replaying unknown provider outcomes.

- [x] Share quota admission; remove provider-level retry loops.
- [x] Separate feature model configuration and update environment documentation.
- [x] Share in-flight authorization checks across job checkpoints and pollers.
- [x] Give summary checkpoints explicit keys and migrate old checkpoints on read.
- [x] Remove unreachable RAG route writes and trivial unused wrappers; preserve old route reads.
- [x] Run API lint/build, regression tests and focused quota/checkpoint/RAG checks.

Validation: API lint, typecheck and build passed; 86 Node tests and 6 Python
route/cache tests passed. The AI environment contract passes. The full local
environment validator still reports 14 pre-existing issues outside AI.
Live LLM, Qdrant and speech-model integration was not exercised.
