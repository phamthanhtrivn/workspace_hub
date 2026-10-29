# Remaining native validation

- [x] Run all 35 Python RAG/OCR tests in the actual Docker image with Tesseract.
- [x] Start dedicated native PostgreSQL, Redis, Qdrant, Kafka and Kong resources; reuse model weights read-only.
- [x] Start current AI API/worker and external services against dedicated databases; use local S3 emulation and synthetic users.
- [x] Exercise signed login, ingestion, real embedding/retrieval, chat/Studio, scoped Work Assistant, sharing/revocation and source changes.
- [x] Check bounded concurrency/load, native locks, Redis/worker restarts and persistence.
- [x] Record exact pass/fail/blocked results, fix confirmed defects, rerun regressions, clean up audit resources.

No existing database/Redis/vector data is deleted. Finite tests cannot establish universal 100% AI correctness; completion means the specified scenarios were executed and their limits documented.
