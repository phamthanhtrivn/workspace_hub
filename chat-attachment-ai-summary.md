# Chat attachment AI summary

- [x] Bind an explicit summary request to one authorized chat media row in the message transaction; recheck source and membership throughout processing.
- [x] Reuse bounded S3 download, existing PDF/DOCX/OCR extraction and LangChain for concise summaries; preserve queue/checkpoint/outbox and typing lifecycle.
- [x] Add per-file “Tóm tắt bằng AI” actions to the existing menu with loading/error feedback and conversation delivery.
- [x] Run meaningful permission/file/worker/UI tests, builds and a synthetic live browser verification; activate without interrupting active jobs.

Completed on 2026-10-24. Explicit approval received for sending selected file text to the configured external provider. Applied nullable metadata migration; activated Communication and AI API/jobs after draining workers. Verified 118 AI + 132 Communication + 2 PostgreSQL + 17 frontend tests, builds and a real PDF/S3/RAG/model browser test with QA cleanup. Local PostgreSQL IPv4 override resolved startup failures. Long files use a disclosed excerpt budget; chart reasoning remains outside this version.
