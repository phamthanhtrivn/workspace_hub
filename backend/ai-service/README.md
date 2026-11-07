# AI Service

Source của AI được đặt chung tại đây; mỗi thành phần vẫn chạy trong process riêng:

| Thư mục | Thành phần |
| --- | --- |
| `api` | NestJS API và BullMQ jobs, dùng chung package Node |
| `rag-worker` | Parse tài liệu, embedding, retrieval và OCR |
| `speech-worker` | Nhận dạng âm thanh cho tóm tắt họp |

## Chuẩn bị

Chạy các lệnh bên dưới từ **repository root**. Docker Desktop và hạ tầng
WorkspaceHub phải đang chạy, có network `wh_network`, PostgreSQL `wh_postgres`,
Redis `wh_redis` và database `notebook_db`. AI tiếp tục dùng PostgreSQL/Redis chung.

Giữ User, Document, Project, Calendar và Communication hoạt động để sử dụng các
tích hợp tương ứng. Frontend và Kong chạy theo hướng dẫn
[local development](../../docs/local-development.md).

Docker đọc `deploy/ai/.env`. Node chạy trực tiếp trên host đọc `api/.env` khi
terminal đang ở `backend/ai-service/api`. Các file `.env` trong hai worker được
giữ riêng cho cách chạy host; Compose truyền cho worker các biến được khai báo
trong `deploy/ai/compose.yml`. Sửa env chỉ có hiệu lực sau khi restart process
hoặc recreate container tương ứng.

Để sử dụng đủ các tính năng hiện có, kiểm tra các cờ sau:

| File | Cờ cần bật |
| --- | --- |
| `deploy/ai/.env` | `AI_ENABLED=true`, `CONVERSATION_AI_ENABLED=true`, `WORK_ASSISTANT_ENABLED=true`, `MEETING_SUMMARY_ENABLED=true` |
| `deploy/ai/.env` | `VISUAL_ENABLED=true` nếu dùng ảnh hoặc PDF scan |
| `backend/communication-service/.env` | `CONVERSATION_AI_ENABLED=true`, `MEETING_SUMMARY_ENABLED=true` cho bot chat và tóm tắt họp |

Nếu Communication đang tắt hai cờ tích hợp này, bật chúng và restart
Communication khi muốn sử dụng. Việc chuyển folder giữ nguyên giá trị env.
Credential theo từng chiều giữa các service phải khớp; xem
[env contract](../../docs/local-env.md).

Vision dùng model/provider trong `LLM_MODEL` và `LLM_BASE_URL`; model phải hỗ trợ
nhận ảnh. OCR local có thể trích chữ nhưng không thay thế khả năng hiểu hình ảnh.
Việc chuyển folder không kiểm chứng khả năng Vision hoặc thay model/fallback.
Tóm tắt họp cần recording đã có; ghi cuộc họp mới còn cần LiveKit/Egress và
cấu hình recording của Communication.

## Khởi động toàn bộ AI bằng Docker

```powershell
docker compose --env-file deploy/ai/.env -f deploy/ai/compose.yml --profile meeting-summary config --quiet
docker compose --env-file deploy/ai/.env -f deploy/ai/compose.yml --profile meeting-summary up -d --build
docker compose --env-file deploy/ai/.env -f deploy/ai/compose.yml ps
```

Lệnh này chạy Qdrant, RAG, speech, migration AI, API và jobs. Container migration
hoàn tất trước API/jobs. Profile `meeting-summary` cần có để chạy speech worker.
Lần build đầu có thể tải dependency và model public; những lần sau dùng cache
hiện có. Project Compose vẫn là `wh-notebook` với cùng tên service và volume.

```powershell
docker compose --env-file deploy/ai/.env -f deploy/ai/compose.yml logs -f notebook-api notebook-jobs rag-worker speech-worker
Invoke-RestMethod http://127.0.0.1:8087/ready
```

`/health` chỉ kiểm tra process; `/ready` còn kiểm tra DB, Redis, heartbeat jobs,
RAG, Document và speech khi tóm tắt họp được bật. Sau khi sẵn sàng, mở
`http://localhost:3000/ai` qua frontend/Kong. Bot chat, trợ lý công việc và tóm tắt
họp được dùng trong các màn hình nghiệp vụ tương ứng.

API publish cổng `127.0.0.1:8087`; RAG, speech và Qdrant giao tiếp trong Docker.
Đảm bảo API chạy host không chiếm cổng 8087 khi khởi động stack Docker.

## Dừng

```powershell
docker compose --env-file deploy/ai/.env -f deploy/ai/compose.yml --profile meeting-summary stop
```

Lệnh `stop` giữ container và volume để lần sau tiếp tục sử dụng dữ liệu/model
cache. Không dùng `down -v` để dừng môi trường đang có dữ liệu.

Chi tiết cấu hình và production nằm trong
[AI deployment guide](../../deploy/ai/README.md).
