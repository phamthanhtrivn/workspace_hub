# AI service architecture and audit checklist

Discovery completed before test execution on 29 October 2026. The AST inventory reads all 79 TypeScript source files (6,926 lines), hashes them and enumerates 25 HTTP route declarations and 35 existing test files. See `architecture-inventory.json`; dynamic source actions expand into retry/remove/preview.

Final inventory after fixes: 79 source files, 6,935 lines, 37 test files, 25 routes. Execution status, fixed findings and incomplete live infrastructure checks are recorded in [report.md](report.md) and [results.json](results.json). The checklist below records the original audit scope; it is not a claim that every layer ran against production infrastructure.

## Implemented components

| Layer | Actual implementation |
| --- | --- |
| API | Node 22, strict TypeScript, NestJS 11/Express, Zod input contracts; `src/main.ts`, `AppModule`; JSON body limit 64 KiB; `/health`, `/ready`. |
| Identity | Kong JWT + jwt-user-context strips forged identity, forwards dedicated gateway proof; AI AuthGuard verifies proof and UUID/email, rejects reset-password role. Public business APIs require notebook/session ownership; internal APIs have separate service keys. |
| Storage | `pg` pool and parameterized SQL; five migrations create `notebook_ai` tables, request uniqueness, revision snapshots, messages/notes/artifacts, model quota reservations, visual extraction/checkpoints, meeting summaries, work sessions/requests/messages. No ORM/repository classes. |
| Queues | BullMQ/Redis, `wh-notebook` prefix: notebook-jobs (index/cleanup + legacy jobs), notebook-summary-jobs, conversation-ai-jobs, meeting-summary-jobs. `worker.ts` runs `jobs.runner.ts`; per-lane heartbeat, recovery sweep and bounded shutdown. |
| Notebook chat | POST message → owned notebook/source selection → Document permission/revision verification → atomic request admission → recent revision-filtered history → RAG retrieval → optional visual evidence → raw OpenAI-compatible SSE provider → citation/clarification checks → reauthorization → atomic assistant persistence → SSE done. Summary intents enqueue Studio SUMMARY instead. |
| Ingestion/Studio | Upload preflight reads bounded bytes, validates through Python; source add resolves original Document versions, checks capacity under notebook lock, queues index; index downloads original bytes, optionally OCR/Vision, writes Qdrant via RAG. Summary reads all indexed chunks, checkpoints per-file sections and avoids uncertain provider replay. Notes can be manual or saved AI responses. |
| Conversation AI | Communication creates an AI request, internal endpoint enqueues it; worker claims request/token, calls custom bounded LangChain tool loop with `get_recent_messages`, validates permissions repeatedly, checkpoints generated answer before delivery. Attachment summaries use exact original document versions and one bounded model call. Project task lookup is explicitly unavailable in this chat agent. |
| Work Assistant | Read-only Project/Calendar context, backend metrics and private busy intervals; personal/project scope and revised history checks; custom LangChain tool loop `get_work_context` for 7/30 days; SSE with request/status/done/error, cancellation and atomic persistence. |
| Meeting Summary | Internal authenticated start/status → recording access manifest from Communication → allowed-host media download → FFmpeg chunks → local STT → transcript/note checkpoints → hierarchical LangChain summaries → revision/access revalidation → SQL completion. |
| LLM | Raw fetch SSE for notebook QA/Studio; `@langchain/openai` ChatOpenAI for work/conversation/meeting, temperature 0.1, zero automatic retries. Model/base URL are configurable; local config names DeepSeek for Notebook and a separate conversation model through an OpenAI-compatible endpoint. No separate Gemini-native client or LangGraph state graph was found. Package transitive dependencies do not prove those features are implemented. |
| RAG Python | FastAPI, Qdrant, LlamaIndex SentenceSplitter; local multilingual-e5-small SentenceTransformers or configured embedding API. pypdf for text PDFs, Docling for DOCX, optional image/OCR extraction; dense search + local BM25 reciprocal-rank fusion. Collection signature partitions embedding/pipeline versions. |
| Speech Python | FastAPI/faster-whisper CPU; authenticated bounded WAV input and one-at-a-time inference; readiness checks and FFmpeg media preparation are distinct from LLM summary generation. |
| Other services | Document source access/S3 signed URLs; Communication history/claims/completion/recordings; Project/Calendar scoped context; Kong; frontend SSE consumers. AI code does not own source files or write Project/Calendar tasks. |

## Test checklist

- [ ] Execute every route over a real local Nest HTTP listener, including all three dynamic source actions; verify actual response envelopes and default POST 201 versus SSE 200.
- [ ] Verify malformed JSON/oversized bodies, UUIDs, empty/oversized fields, unsupported types, missing keys, identity forgery, reset role, ownership, cross-source access and revision changes.
- [ ] Run notebook CRUD → upload preflight → add → index → chat/SSE → history → note → artifact/summary → preview/retry/remove → deletion with isolated SQL and explicit upstream fixtures.
- [ ] Exercise work sessions/list/history/project scope/SSE/cancel and internal conversation/meeting start/status.
- [ ] Exercise request uniqueness, concurrency admission, cancellation during generation, disconnect, timeout, corrupted/incomplete SSE, no success persistence after failure.
- [ ] Verify tools, scoped history, unknown tools/arguments, truncation, quota and safe provider failure handling through existing and added regressions.
- [ ] Verify index/cleanup/summary/meeting/conversation jobs, checkpoint retry/recovery, health and shutdown.
- [ ] Run Python parser/RAG policy/embedding contracts/vector isolation/retrieval evaluation and speech tests where dependencies permit.
- [ ] Probe actual local dependencies, gateway and configured model with synthetic inputs; label unavailable services and fixture substitutions explicitly.
- [ ] Record timing/coverage/security findings, fix reproducible defects, rerun affected tests and build/lint.

## Initial gaps and risks to verify

Existing tests heavily use PGlite, mocked Redis/HTTP/model outputs; their pass count is not live deployment certification. Existing route integration covers only a subset of the full AppModule. RAG visual tests contain a Linux font path, so host execution can differ from the Docker image. Some setup docs still link deleted service README/MEETING_SUMMARY files. Readiness is dependency health, not proof of correct model answers. Source authorization checks, partial output semantics, cache keys, timezone refetch and aborted model reads need adversarial regression checks.
