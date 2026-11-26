# AI service

| Directory | Process |
| --- | --- |
| api | NestJS HTTP/SSE API, BullMQ jobs and SQL migrations |
| rag-worker | Document parsing, OCR, embeddings and scoped retrieval |
| speech-worker | Local faster-whisper speech recognition |

## Local runtime

Start the AI processes together with infrastructure using [Docker local](../docker/README.md). The component Compose and private env are under backend/docker/ai; all AI workers, including speech, start by default. The API is published on loopback port 8087. RAG, Qdrant and speech are internal services.

The host configuration api/.env remains available to tooling and optional host development. Model, quota, timeout and concurrency settings are synchronized to Docker by prepare-local-docker-env.mjs; Docker bind and connection URLs differ from host values. Avoid running two APIs/jobs sets against the same port/queues.

## Features and access

- Personal notebooks: independent private source copies, background indexing, cited Q&A and saved notes. Sources support 5 files, 20 MiB/file and 50 MiB/notebook, separately from the Documents quota. See [file-copy behavior and local rollout](../../docs/features/document-chat-sharing.md).
- Conversation bot: direct/channel/thread context and attachment summaries.
- Work Assistant: authorized Project and Calendar context/actions.
- Meeting summaries: the owner explicitly requests or retries processing after a recording completes. Readers with recording access share the saved result.
- Voice transcription: local speech recognition with permission checks and saved shared results.

Feature availability depends on flags, caller credentials, dependent host services and provider configuration. Running a worker does not enable a disabled feature or automatically summarize recordings. No flashcard or quiz feature is claimed.

Speech recognition stays in the local worker. Generated summaries and answers use the configured external model provider; transcript/document content can therefore leave the machine. Do not treat readiness as proof of model quality or provider quota.

## Configuration and verification

See [environment](../../docs/development/environment.md), [architecture](../../docs/architecture/system-architecture.md) and [tests](../../tests/README.md). From api:

~~~powershell
npm ci
npm test
npm run test:typecheck
npm run build
~~~

Docker applies AI SQL migrations before starting API/jobs. Do not change released migration checksums or reset existing data. Keep queue/checkpoint state when restarting. Production is separate: [AI deployment](../../deploy/ai/README.md).

Notebook library metadata uses migration `014_notebook_metadata.sql`. Apply it before running the updated API (`npm run build` then `npm run migrate` from `api` for a non-Docker setup). Existing notebooks default to an empty description/category and the navy accent. List responses include independent source/note counts and an account-wide notebook total; title-only PATCH requests retain existing metadata.
