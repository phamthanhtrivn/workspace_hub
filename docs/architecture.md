# Kiến trúc hiện tại

WorkSpaceHub gồm frontend Next.js, Kong và các dịch vụ sở hữu dữ liệu theo nghiệp vụ. Dịch vụ ứng dụng chạy trên host khi phát triển; production dùng image và ba host APP, INFRA, REALTIME. Notebook AI có stack riêng, chưa thuộc catalog release APP.

| Thành phần | Trách nhiệm | Mã nguồn |
| --- | --- | --- |
| Web | Giao diện, React Query cho server state, Redux cho state global đã có | `frontend/web` |
| Kong | Routing, JWT/context, loại header giả, quota và biên public/internal | `backend/kong-gateway` |
| User | Tài khoản, xác thực, OTP, refresh/reset token, phiên và hồ sơ | `backend/user-service` |
| Project | Project, thành viên, task, comment, checklist, label và đồng bộ quyền | `backend/project-service` |
| Communication | Space/channel, DM, message, poll, note, meeting và socket | `backend/communication-service` |
| Document | File/folder, version, chia sẻ, quota, upload intent và dọn storage | `backend/document-service` |
| Calendar | Lịch, recurrence, attendee, reminder, Pomodoro và liên kết conference | `backend/calendar-service` |
| Notification | Notification PostgreSQL, Kafka consumer và realtime delivery | `backend/notification-service` |
| AI API/jobs | Notebook/source, SSE Q&A, Studio, conversation/work/meeting summaries | `backend/ai-service` |
| RAG worker | Parse/OCR, chia đoạn, embedding, scoped retrieval qua Qdrant | `backend/rag-worker` |
| Speech worker | Nhận dạng WAV bằng faster-whisper CPU cho meeting summary | `backend/speech-worker` |

## Dữ liệu và tích hợp

- PostgreSQL được chia theo dịch vụ; User dùng JPA, phần lớn Nest services dùng Prisma, AI dùng SQL qua `pg`. Chia sẻ dữ liệu qua API/event thay vì truy cập bảng dịch vụ khác.
- Kafka chuyển sự kiện; các outbox lưu intent cùng transaction nghiệp vụ và hỗ trợ retry/idempotency.
- Redis phục vụ session/OTP, realtime adapter và BullMQ. AI queue chạy trong worker riêng với checkpoint/recovery.
- Document sở hữu metadata và phiên bản file trên S3. Upload mới giới hạn 10 MiB/file, kiểm kích thước/nội dung và scope actor/tài liệu/chat. Attachment chat được kiểm quyền theo context.
- LiveKit xử lý media; Communication kiểm quyền meeting, điều khiển recording và nhận webhook. Egress chạy trong hạ tầng realtime.

## Quyền và biên tin cậy

Kong xác thực request và loại bỏ identity header do client tự gửi. Các API/socket áp kiểm tra danh tính và quyền phù hợp tại dịch vụ; không dùng reset token như access token. Socket room phải kiểm membership. PUBLIC channel chỉ mở cho thành viên space.

API nội bộ dùng credential theo luồng; public gateway không công khai chúng. AI yêu cầu proof từ gateway và kiểm quyền notebook/source; Document được hỏi lại về quyền và revision trước các thao tác AI. Không truyền key provider hoặc credential nội bộ ra browser.

Refresh token được xoay vòng, có thu hồi family và phát hiện reuse. Reset token dùng một lần; đổi mật khẩu thu hồi phiên. Cookie refresh giữa nhiều tab được tuần tự hóa ở frontend.

## Luồng AI

Nguồn notebook trỏ tới phiên bản Document được cấp quyền. Worker lấy đúng bytes, parse/index qua RAG, sau đó Q&A truy xuất trong notebook/source scope và trả SSE có trích dẫn. Summary chạy bằng job có checkpoint. File gốc vẫn thuộc Document khi notebook bị xóa.

Provider LLM/embedding và các tính năng tùy chọn được cấu hình bằng env. Readiness không chứng minh chất lượng câu trả lời; hoạt động với model thật, media thật và dữ liệu thật cần được xác minh riêng.

Xem [chạy local](local-development.md), [Notebook AI](../deploy/ai/README.md), [migration](migrations.md) và [triển khai](deployment.md).
