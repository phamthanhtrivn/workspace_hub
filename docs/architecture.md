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
| AI API/jobs | Notebook/source, SSE Q&A, Studio, conversation/work/meeting summaries | `backend/ai-service/api` |
| RAG worker | Parse/OCR, chia đoạn, embedding, scoped retrieval qua Qdrant | `backend/ai-service/rag-worker` |
| Speech worker | Nhận dạng WAV bằng faster-whisper CPU cho meeting summary | `backend/ai-service/speech-worker` |

## Dữ liệu và tích hợp

- PostgreSQL được chia theo dịch vụ; User dùng JPA, phần lớn Nest services dùng Prisma, AI dùng SQL qua `pg`. Chia sẻ dữ liệu qua API/event thay vì truy cập bảng dịch vụ khác.
- Kafka chuyển sự kiện; các outbox lưu intent cùng transaction nghiệp vụ và hỗ trợ retry/idempotency.
- Redis phục vụ session/OTP, realtime adapter và BullMQ. AI queue chạy trong worker riêng với checkpoint/recovery và prefix `wh-notebook` trên Redis chung; namespace riêng không tách RAM hoặc persistence. AI dùng database `notebook_db`/schema `notebook_ai` trên PostgreSQL 15 chung. Local hiện dùng tài khoản `postgres` cho cả bảy DB; production AI vẫn có contract credential riêng cần triển khai đồng bộ. Local dùng `wh_network`; production AI là stack riêng trên APP, kết nối PostgreSQL/Redis của INFRA và network `workspacehub-app_default` của APP.
- Document sở hữu metadata và phiên bản file trên S3. Upload mới giới hạn 10 MiB/file, kiểm kích thước/nội dung và scope actor/tài liệu/chat. Attachment chat được kiểm quyền theo context.
- LiveKit xử lý media; Communication kiểm quyền meeting, điều khiển recording và nhận webhook. Egress chạy trong hạ tầng realtime.

## Quyền và biên tin cậy

Kong xác thực request và loại bỏ identity header do client tự gửi. Các API/socket áp kiểm tra danh tính và quyền phù hợp tại dịch vụ; không dùng reset token như access token. Socket room phải kiểm membership. PUBLIC channel chỉ mở cho thành viên space.

API nội bộ dùng credential theo luồng; public gateway không công khai chúng. AI yêu cầu proof từ gateway và kiểm quyền notebook/source; Document được hỏi lại về quyền và revision trước các thao tác AI. Không truyền key provider hoặc credential nội bộ ra browser.

Refresh token được xoay vòng, có thu hồi family và phát hiện reuse. Reset token dùng một lần; đổi mật khẩu thu hồi phiên. Cookie refresh giữa nhiều tab được tuần tự hóa ở frontend.

## Tổ chức backend

Controller giữ façade hiện có; provider bên trong được chia theo trách nhiệm. Các service vẫn build độc lập, không dùng thêm shared package.

| Service | Provider và ranh giới chính |
| --- | --- |
| Notification | Query, mutation, subscription và delivery; lưu DB trước khi phát socket và gửi push. |
| Document | Access, location/name, query, public query, upload/version, lifecycle, sharing, project attachment, tree, presentation, event publisher và download/ZIP streaming. Quota, upload intent và khóa cây tiếp tục dùng transaction đang điều phối. |
| Communication | Space tách access, settings, presentation, event, project provisioning, channel/thread synchronization, query, membership, lifecycle và invitation. Message/DM tách query, mutation, presentation và publishing. `SystemMessageService` tạo message rồi gọi publisher. |
| Project | Task tách lookup, query, validation, creation, mutation, attachment và activity mapping. Project tách query, mutation, chat/document workflow và event publisher. Activity, access-sync intent và outbox vẫn được ghi trong transaction nghiệp vụ. |
| Calendar | Recurrence tách creation, THIS, THIS_AND_FOLLOWING, ALL, occurrence helper và transaction coordinator. Event tách query, validation, mutation, task, attendee, conference và effects. Pomodoro tách config, timer, session và statistics. |
| User | `AuthService` giữ transaction qua Spring proxy; registration, credential/social login, refresh, session, token issuer, response mapper và servlet adapter là collaborator nội bộ. Refresh giữ `noRollbackFor = BusinessException.class` và thứ tự khóa user trước token. |
| AI | Façade chat/work-assistant gọi admission/access, query, generation, workflow và SSE adapter. Workflow phát event qua `ApplicationEventStream`; `SseTransport` sở hữu thao tác Express/SSE. |

`SocketPublishingModule` chỉ chứa emitter, room service/resolver và publisher; không nhập `MessageModule` hay gateway. Business module dùng publishing module, còn `SocketModule` giữ gateway/handler. Vì vậy Message không cần nhập ngược socket transport.

`ProjectAccessModule` và `TaskPolicyModule` cung cấp policy phụ thuộc thấp; `ActivityModule` dùng policy thay vì nhập `TaskModule`. `InvitationDeliveryModule` sở hữu email delivery và các adapter, cho phép outbox hoạt động mà không nhập ngược `InvitationModule` hoặc `ProjectModule`.

Helper thực hiện thao tác atomic nhận `Prisma.TransactionClient` từ workflow. Với User, transaction nằm ở façade có proxy; không đặt thêm transaction độc lập trong collaborator. Với AI, `AiDatabaseClient`, `AiQueueClient` và `AiModelProvider` bọc pool, queue và factory hiện có. Nest dùng cùng instance qua `useValue`; API/worker entrypoint tiếp tục sở hữu shutdown, checkpoint và recovery, không tạo thêm pool/worker hay tự phát lại model call.

## Luồng AI

Nguồn notebook trỏ tới phiên bản Document được cấp quyền. Worker lấy đúng bytes, parse/index qua RAG, sau đó Q&A truy xuất trong notebook/source scope và trả SSE có trích dẫn. Summary chạy bằng job có checkpoint. File gốc vẫn thuộc Document khi notebook bị xóa.

Provider LLM/embedding và các tính năng tùy chọn được cấu hình bằng env. Readiness không chứng minh chất lượng câu trả lời; hoạt động với model thật, media thật và dữ liệu thật cần được xác minh riêng.

Bong bóng trợ lý công việc dùng tối đa 20 tin nhắn gần nhất trong hội thoại hiện tại; mỗi tin cũ giới hạn 1.000 ký tự cho người dùng và 1.500 ký tự cho trợ lý. Tổng lịch sử sau khi serialize JSON giới hạn 12.000 byte, ưu tiên nội dung mới nhất và rút gọn tin cũ theo ranh giới Unicode khi cần; không thêm lượt gọi model để tóm tắt. Đây là ngân sách lịch sử, không phải giới hạn token context của provider. Dữ liệu công việc vẫn được lấy mới và giới hạn theo ngân sách token. Nội dung trả lời được truyền từng phần qua SSE; giao diện thay bản nháp bằng tin đã lưu khi nhận `done`. Lỗi, ngắt kết nối hoặc hủy sẽ bỏ bản nháp; chỉ câu trả lời hoàn tất, đã kiểm tra lại quyền mới được lưu. Luồng `@AI Bot` trong chat giữ giới hạn lịch sử riêng.

Log `ai_pipeline` của trợ lý công việc có `first_delta_ms` (từ đầu pha sinh câu trả lời đến lần gửi nội dung đầu tiên qua SSE) và `delta_count` (số phần nội dung đã gửi, kể cả phần được xóa khi model chuyển sang gọi công cụ). Yêu cầu chưa gửi nội dung không có hai trường này; không ghi nội dung câu trả lời vào log. Sau khi hoàn tất, frontend tải lại lịch sử và danh sách hội thoại song song.

Kiểm tra runtime riêng: build AI API rồi chạy `node backend/security-tests/work-assistant-runtime.mjs`. Runner cần Docker đang chạy với image PostgreSQL/Redis đã có và Edge/Playwright local; khởi động API build và web dev, tạo rồi dọn các container riêng theo nhãn. Dữ liệu người dùng/công việc, Auth, Project và Calendar được giả lập; PostgreSQL, Redis, HTTP/SSE và trình duyệt chạy thật. Thêm `--live-model` để gửi đúng một yêu cầu bổ sung với dữ liệu mẫu đến provider trong `backend/ai-service/.env`; mặc định không gọi provider ngoài. Báo cáo và ảnh nằm ở thư mục `workspacehub-work-assistant-runtime` dưới thư mục tạm của hệ điều hành. Runner không sửa private env hay database ứng dụng.

Xem [chạy local](local-development.md), [Notebook AI](../deploy/ai/README.md), [migration](migrations.md) và [triển khai](deployment.md).
