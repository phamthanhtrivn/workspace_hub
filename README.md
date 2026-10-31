# WorkSpaceHub

Nền tảng quản lý công việc và cộng tác: project/task, lịch và nhắc nhở, chat, tài liệu, cuộc họp, Pomodoro và Notebook AI.

## Tài liệu cần dùng

- [Mục lục tài liệu](docs/README.md).
- [Chạy local](docs/local-development.md): môi trường, hạ tầng và terminal ứng dụng.
- [Kiến trúc](docs/architecture.md): ranh giới dịch vụ và dữ liệu.
- [Triển khai](docs/deployment.md): CI, EC2, release, healthcheck và rollback.
- [Migration](docs/migrations.md): schema và reconciliation dữ liệu cũ.
- [Notebook AI](deploy/ai/README.md), [LiveKit/recording](backend/livekit/README.md).
- [Sản phẩm](PRODUCT.md), [thiết kế](DESIGN.md), [design tokens](docs/design-tokens.md), [SEO](docs/seo-metadata.md).

## Cấu trúc chính

| Thư mục | Vai trò |
| --- | --- |
| `frontend/web` | Next.js/React/TypeScript |
| `backend/user-service` | Java 21/Spring Boot: tài khoản và xác thực |
| `backend/{project,communication,notification,document,calendar}-service` | NestJS: nghiệp vụ và dữ liệu theo dịch vụ |
| `backend/kong-gateway` | HTTP/WebSocket gateway |
| `backend/docker`, `backend/livekit` | Hạ tầng local và media |
| `backend/ai-service`, `backend/rag-worker`, `backend/speech-worker` | AI API/jobs, retrieval và speech |
| `deploy` | Migration, image và vận hành EC2 |

PostgreSQL lưu dữ liệu theo dịch vụ; Redis phục vụ cache/session/queue/realtime; Kafka chuyển event. S3 lưu file gốc, LiveKit/Egress xử lý media, Qdrant phục vụ retrieval của stack AI riêng.

## Bắt đầu local

Cần Docker Desktop/Compose, Node 22 và Java 21/Maven. Giữ các private env và volume dữ liệu hiện có.

```powershell
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml config --quiet
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml up -d --build
```

Chạy ứng dụng trong các terminal riêng theo [hướng dẫn local](docs/local-development.md). Notebook AI có hướng dẫn và stack riêng. Không dùng reset database hoặc xóa volume để sửa migration drift.

CI hiện kiểm lint/build và cấu hình triển khai. Các bộ test và script test đã được gỡ theo yêu cầu; báo cáo lịch sử được giữ local trong `.tmp/codex-verification-report`, không nằm trong bộ tài liệu vận hành.
