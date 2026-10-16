# Document QA operations and API

## Enable

Configure ignored `backend/ai-service/.env` (production: operator-managed APP
`.env.production`) with `AI_ENABLED=true`, `GEMINI_API_KEY`, and application
RPM/RPD/TPM caps at or below the actual AI Studio project quota. Existing JWT,
internal service key, PostgreSQL and Document Service settings are reused.
Defaults: `gemini-3.8-flash`, `gemini-embedding-2`, 768 dimensions. Use non-sensitive
demo files with the free tier. The service does not configure billing or silently
switch providers/models. Default caps are application limits, not provider guarantees.

Run API and worker in separate host terminals after explicit Alembic migration;
see [AI setup](README.md) and [local development](../../docs/local-development.md).
The migrator manages only `ai_db`; API replicas never run migrations.
`AI_ENABLED=false` leaves health routes available and the worker idle.
Production exposes AI through Kong.

## Request workflow

All business calls go through Kong under `/api/ai` with a bearer access token.
Actor IDs come from verified JWTs, not client identity headers. Document internal
routes are outside Kong and require short-lived signed, source-bound delegation.

1. `POST /documents/validate` with
   `{"documents":[{"name":"notes.txt","mimeType":"text/plain","sizeBytes":123}]}`.
   HTTP 400 identifies invalid files. Passing preflight does not certify bytes.
2. Upload each new file through `/api/documents/upload/initiate`, direct S3 PUT,
   and `/api/documents/upload/confirm`. Existing Documents can be selected directly.
3. `POST /documents` with
   `{"documents":[{"documentId":"<uuid>","versionId":"original"}]}`.
   `versionId` may be omitted (current revision), `original`, or a version UUID.
   HTTP 202 returns `batchJobId` and per-file source/index/job IDs.
4. Poll `GET /jobs/<batchJobId>`. File jobs independently validate bytes, convert,
   chunk and embed. Failed files expose safe `code`, `message`, and `retryable`.
   Batch status is RUNNING, SUCCEEDED, FAILED or PARTIAL. `WAITING_QUOTA` ingestion
   resumes embedding checkpoints for up to one day without parsing again.
5. `POST /conversations` with `{"sourceIds":["<source-id>","<source-id>"]}`.
   All selected sources must be READY. Failed files are never silently removed.
6. `POST /conversations/<id>/messages` with `{"content":"Compare the deadlines"}`.
   HTTP 202 returns user/assistant message IDs and a job ID. Poll the job, then
   read `GET /conversations/<id>/messages?after=0&limit=20` for finalized answers.

Creating batches, conversations and messages requires `Idempotency-Key`. Preserve
it on network retries; changed payload with the same key returns 409. One generation
may run per conversation. Failed/uncertain generation is not automatically replayed;
submit a new message/key for an explicit retry.

Documents/conversations have private list/detail endpoints. Lists take `after`
(opaque UUID cursor) and `limit` (1–50); messages use a sequence cursor. Every read
rechecks current source permissions. Revoking one source blocks the whole dependent
history/answer. A conversation keeps its pinned revisions; changing sources means
creating another conversation. Deleting a conversation erases its messages and
cancels pending work, without deleting original files. Inactive AI artifacts are
cleaned after `RETENTION_DAYS` (30 by default).

## Validation and evidence

Supported: PDF with extractable text, DOCX, UTF-8 TXT/Markdown (BOM allowed).
Limits: 5 files, 20 MiB/file, 50 MiB combined; 200 PDF pages/file; 100,000 estimated
tokens and 256 chunks/file; 200,000 tokens and 512 chunks/conversation.

The metadata whitelist is checked again for existing Documents. After upload,
actual signatures/structure/encoding/size are verified before any embedding.
Corrupt, password-protected, disguised-binary, empty and over-limit files fail.
Image-only PDF pages return `OCR_REQUIRED`; legitimate blank pages are accepted.
Unanalyzed visual content is flagged. DOCX ZIP expansion/path limits and isolated
parser time/CPU/memory limits are enforced. Temporary files are removed on success,
failure or parser termination. Normal Documents storage still accepts its existing
formats; AI restrictions apply only to analysis.

PDF pages and DOCX body text require at least 90% normalized character coverage
after conversion. This detects empty/dropped conversion output; it does not prove
visual/layout fidelity or recognize text inside images. A text page cannot silently
disappear while the file becomes READY.

Chunks retain PDF page, DOCX section/paragraph or text line locators. Retrieval
combines exact cosine search and BM25, balancing evidence between sources. Vectors
are PostgreSQL REAL arrays; no PostgreSQL image change/vector extension is needed.
The local tokenizer estimates chunk/context/admission budgets; actual model token
usage is recorded separately. All embeddings, query rewrites and generation calls
share the configured application budget, including failed/unknown calls.

Server-built citations use retrieved IDs and exact chunk excerpts, never model
URLs. Outputs distinguish ANSWERED, PARTIAL, INSUFFICIENT_EVIDENCE and
CONFLICTING_SOURCES. Valid IDs cannot prove that a claim is semantically supported:
evaluate real model answers on a held-out Vietnamese demo set before broader use.
This implementation does not claim OCR, visual understanding, exhaustive summaries,
spreadsheet arithmetic, benchmarked accuracy, or guaranteed free-tier throughput.

## Verification

Fast unit/contract tests use a fake document client/provider and SQLite by default:

```powershell
python -m ruff check .
python -m ruff format --check .
python -m pytest
```

GitHub Actions uses `.github/ci/ai/compose.yml` for disposable PostgreSQL and real Kong, with no host ports or Gemini/S3 calls. Local apps run on the host.

The test-only API entry point supplies deterministic document/provider fixtures;
Kong, JWT handling, SQL persistence, ingestion jobs, conversion, conversation
routes, citations and deletion execute normally. It covers a partial batch,
explicit READY selection, cross-document questions and a follow-up over HTTP.

CI runs PostgreSQL integration, real Kong checks, Python lint/tests, Document
Service delegation/resolver contracts, build and deployment regression checks.
Live Gemini quota/quality and real S3 manifests still require the operator's demo
account and files; keys are never committed or read by the test suite.
