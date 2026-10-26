# Notebook AI Service

## Stability and shutdown

- Recovery scans use keyset batches of 100. A failed job or scan is logged and other jobs/stages continue; the next sweep retries outstanding work. Active, waiting and delayed BullMQ jobs are left to BullMQ.
- `ai_recovery` reports checked/recovered/failed counts and duration. For queued work, recovered counts successful enqueue checks, including jobs already present in Redis.
- API shutdown stops accepting connections and drains requests before closing Nest, queues and PostgreSQL. Worker shutdown stops new recovery work, drains active jobs, heartbeat writes and in-flight recovery before closing queues/PostgreSQL. Startup recovery and periodic sweeps cannot overlap.
- `AI_SHUTDOWN_TIMEOUT_MS` defaults to `210000` (3.5 minutes; allowed range 1000–900000). The process exits with code 1 when the deadline is exceeded. Both Compose services allow 4 minutes; keep the container stop grace period longer than the configured application deadline. Interrupted paid model calls still require the existing checkpoint/manual retry policy.
- `CHAT_CANCEL_POLL_MS` defaults to `2000` (allowed range 500–10000). Remote cancellation is observed on the next poll, plus database latency. Disconnect cancellation remains immediate, and the permission check interval remains 3 seconds.
- Worker errors include queue/job IDs, error type, allowlisted error codes, attempts and elapsed times. Logs omit error messages, stacks, prompts, credentials and upstream response bodies.

NestJS API và BullMQ jobs. Hướng dẫn cấu hình/chạy toàn stack: [deploy/ai/README.md](../../deploy/ai/README.md).

## Cấu trúc

```text
src/
├── main.ts                     # Khởi động HTTP API
├── worker.ts                   # Khởi động jobs
├── migrate.ts                  # Chạy migration hiện có
├── app.module.ts               # Ghép các module
├── config/                     # Đọc/kiểm tra env
├── common/
│   ├── auth/                   # Gateway guard, quyền sở hữu notebook
│   ├── health/                 # Health/readiness và kiểm tra dependency
│   ├── errors/
│   ├── profiling/
│   ├── evidence-policy.ts      # Snapshot, lựa chọn nguồn, trích dẫn
│   ├── types.ts
│   └── validation.ts
├── infrastructure/
│   ├── database/               # PostgreSQL, transaction
│   ├── integrations/           # Document Service, RAG worker, LLM
│   └── queue/                  # Queue, enqueue, heartbeat contract
├── modules/
│   ├── notebooks/              # CRUD notebook, tổng hợp workspace
│   ├── sources/                # Nguồn, quyền, kiểm tra upload, retry/preview
│   ├── chat/                   # Hỏi đáp SSE, hủy yêu cầu
│   └── studio/                 # Ghi chú, tạo artifact/tóm tắt
└── jobs/
    ├── jobs.runner.ts          # Điều phối consumer, heartbeat, shutdown
    ├── index.processor.ts
    ├── summary.processor.ts
    └── job-recovery.ts
```

Mỗi feature có `.module.ts`, `.controller.ts`, `.service.ts`. Controller giữ route/validation; service xử lý nghiệp vụ. Các feature dùng chung kiểm quyền notebook và policy để không lệch hành vi bảo mật. Không import entrypoint để dùng nghiệp vụ; client tích hợp không phụ thuộc feature module.

`migrations/` và `.env` giữ nguyên. Các lệnh `npm.cmd start`, `npm.cmd run worker`, `npm.cmd run migrate` vẫn trỏ đến entrypoint cũ trong `dist/`; Docker/Compose không cần đổi command. Compose đọc env tại `deploy/ai/.env`, không tự đọc `.env` của thư mục service này.

## Kiểm tra

```powershell
npm.cmd test
node node_modules/typescript/bin/tsc --noEmit --noUnusedLocals --noUnusedParameters
```

Test bao gồm PostgreSQL/PGlite, quyền nguồn, SSE, giới hạn upload, queue/recovery và HTTP trên AppModule thật. Dependencies bên ngoài được giả lập rõ trong test; không coi đây là E2E S3, Redis, Qdrant hoặc model thật. Không ghi env/key/nội dung tài liệu vào log hoặc Git.
