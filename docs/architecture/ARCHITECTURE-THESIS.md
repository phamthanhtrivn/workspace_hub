# Kiến trúc Microservices của Nền tảng AI Workspace

**Kiến trúc hệ thống và cơ chế giao tiếp giữa các dịch vụ**

Dự án: **WorkSpaceHub**. Ngày đối chiếu: **07/09/2026**. Phạm vi là kiến trúc hệ thống/container suy ra từ repository hiện tại, không phải chứng nhận trạng thái triển khai production.

## 1. Architecture Summary

Hệ thống có **6 microservice nghiệp vụ**: **User, Project, Communication, Notification, Document và Calendar**. Authentication thuộc User; Task thuộc Project; Space/Channel/Chat thuộc Communication. Không tách các module này thành những microservice giả định.

Frontend dùng Next.js, React và TypeScript; Axios gọi Kong, còn Socket.IO phục vụ chat và thông báo. Kong chạy DB-less, định tuyến tới các service từ cổng 8081 đến 8086. User dùng Java 21, Spring Boot 4.1 và JPA; năm service còn lại dùng NestJS 11, TypeScript và Prisma.

Cấu hình stack dùng **một instance PostgreSQL 15**, tách thành sáu database: `user_db`, `project_db`, `communication_db`, `notification_db`, `document_db`, `calendar_db`. Đây là database riêng theo dịch vụ trên cùng instance, không phải sáu máy chủ độc lập.

Kafka truyền thêm sự kiện Project → Notification bên cạnh hồ sơ người dùng, thông báo cộng tác, đồng bộ task vào lịch và nhắc lịch. Luồng Project có retry topic và dead-letter topic (DLT). Redis được User dùng cho OTP có TTL và Communication dùng làm Socket.IO Pub/Sub adapter. Không tìm thấy Redis token blacklist.

User cấp JWT HS256 và refresh token. Kong kiểm tra JWT trên các REST route được bảo vệ rồi truyền ngữ cảnh `X-User-*`; Project có JWT guard riêng. Refresh token dạng băm lưu trong PostgreSQL. Hai Socket.IO gateway hiện giải mã payload token để lấy userId; chưa thấy xác minh chữ ký/exp tại handshake.

Tích hợp ngoài gồm Google OAuth/userinfo, AWS S3, URL CloudFront, SMTP, Web Push/VAPID, ip-api.com và Office Online Viewer. **AI đang ở trạng thái Planned:** có trang frontend `/ai` và mô tả trong README nhưng không có backend, API, LLM, embedding, RAG, OCR hay vector database. **Pomodoro đang ở trạng thái Partial:** có trang `/pomodoro`, route Kong và hai bảng trong SQL migration, nhưng chưa có controller/service và không có model tương ứng trong Prisma schema hiện tại.

## 2. Component Relationship Table

| Component | Technology | Responsibility | Communicates With |
| --- | --- | --- | --- |
| Web :3000 | Next.js, React, TypeScript, Axios, Redux, Socket.IO | UI, REST, access token state, realtime, upload trực tiếp | Kong, Google, S3, CloudFront URL, Office Online, Web Push |
| Kong :8000/:8443 | Kong DB-less, Lua plugin | Route REST/socket; JWT; user context; CORS; 600 request/phút local; giới hạn 10 MB; correlation ID | Web và 6 backend service |
| User :8081 | Spring Boot 4.1, Java 21, JPA | Auth, Google login, hồ sơ, refresh token, OTP, phiên, avatar | user_db, Redis, Kafka, Google, SMTP, S3, GeoIP |
| Project :8082 | NestJS 11, Prisma, JWT guard | Project, task, sprint, member, invitation, permission, activity, file, outbox | project_db, User qua HTTP, Kafka |
| Communication :8083 | NestJS 11, Prisma, Socket.IO, Redis adapter, KafkaJS | Space, channel, chat, thread, media, reaction, poll, note | communication_db, Redis, Kafka, S3, Web qua Kong |
| Notification :8084 | NestJS 11, Prisma, Kafka, Socket.IO, Nodemailer, web-push | Notification, inbox idempotency, retry/DLT, email, push subscription, realtime | notification_db, Kafka, SMTP, Web Push, Web |
| Document :8085 | NestJS 11, Prisma, S3 SDK, Kafka | Folder/file, quota, upload/confirm, version, share/access, trash | document_db, S3, Kafka; nhận kiểm tra quyền từ Calendar |
| Calendar :8086 | NestJS 11, Prisma, Kafka, scheduler | Calendar, recurrence, attendees, document link, task sync, reminder | calendar_db, Kafka, Project/Document/User qua HTTP |
| AI Service — Planned | Chưa chọn | README dự kiến summary, Q&A, flashcard, quiz; frontend hiện là placeholder | Chưa có giao tiếp runtime |
| Pomodoro — Partial | Frontend placeholder, Kong route, PostgreSQL migration | Cấu hình chu kỳ và phiên tập trung theo thiết kế dữ liệu | Dự kiến thuộc Project Service/project_db; handler runtime chưa có |
| PostgreSQL | PostgreSQL 15 | Sáu database riêng trên shared instance | Sáu service qua JPA/Prisma |
| Redis | Redis 7 | OTP và Pub/Sub cho Socket.IO | User, Communication |
| Kafka | Apache Kafka, KRaft | Năm topic nghiệp vụ; thêm retry và DLT cho Project notification | User, Project, Communication, Notification, Document, Calendar |
| External | S3, Google, SMTP, Web Push, CloudFront URL, GeoIP, Office Online | File, OAuth, email/push, media, vị trí IP, preview | Theo từng tích hợp; ngoài backend boundary |

## 3. Microservices Communication Table

| Source | Destination | Protocol | Purpose |
| --- | --- | --- | --- |
| Web | Kong | HTTP(S)/REST | Gọi API, kèm Bearer JWT khi có token |
| Kong | User | HTTP | `/api/auth`, `/api/users` |
| Kong | Project | HTTP | `/api/projects`, `/api/sprints`, `/api/project-invitations`, `/api/tasks`, `/api/checklists`, `/api/labels`, `/api/task-comments`, `/api/pomodoros` |
| Kong | Communication | HTTP | `/api/conversations`, `/api/direct-conversations`, `/api/channels`, `/api/spaces`, `/api/invitations`, `/api/medias`, `/api/polls`, `/api/notes` |
| Kong | Notification | HTTP | `/api/notifications` |
| Kong | Document | HTTP | `/api/documents`; public route `/api/documents/public` |
| Kong | Calendar | HTTP | `/api/calendar` |
| Web ⇄ Kong ⇄ Communication | Hai chiều | Socket.IO/WebSocket | `/communication.io`: message, reaction, typing, room events |
| Web ⇄ Kong ⇄ Notification | Hai chiều | Socket.IO/WebSocket | `/notification.io`: `new_notification`, `notification_updated` |
| Project | User | HTTP GET | `/api/users/{id}/profile`, tra email/họ tên |
| Project outbox worker | Kafka → Notification | `project-notification-events` | Tạo notification, gửi email/cập nhật trạng thái invitation; envelope có `eventId`, version và aggregate key |
| Notification | Kafka | `project-notification-events-retry` / `project-notification-events-dlt` | Retry tối đa ba lần; payload sai hoặc hết retry được lưu trên DLT |
| Calendar | Project | HTTP GET | Kiểm tra quyền project; **Needs verification** về Bearer JWT |
| Calendar | Document | HTTP GET | `/api/documents/{id}/access`, kiểm tra quyền |
| Calendar | User | HTTP GET | Bổ sung profile snapshot thiếu |
| User | Kafka → Communication, Document, Calendar | `user-profile-events` | Đồng bộ snapshot hồ sơ sau commit |
| Communication | Kafka → Notification | `notification-topic` | Sự kiện invitation/space/channel |
| Project outbox worker | Kafka → Calendar | `project-task-events` | `PROJECT_TASK_CALENDAR_UPSERTED/REMOVED` |
| Calendar worker | Kafka → Notification | `calendar-reminder-events` | `CALENDAR_REMINDER_DUE`; ALERT/PUSH/EMAIL |
| User | Redis | Redis | OTP có TTL |
| Communication | Redis | Redis Pub/Sub | Socket.IO adapter |
| User, Communication, Document | S3 | AWS SDK/HTTPS | Presign và object storage theo chức năng |
| Web | S3 | HTTPS PUT | Upload trực tiếp bằng presigned URL |
| Web/User | Google | OAuth/HTTPS | Lấy credential và userinfo |
| User/Notification | SMTP | SMTP | OTP, invitation, calendar reminder |
| Notification | Web Push | HTTPS/VAPID | Push theo browser subscription |
| Web | CloudFront URL | HTTPS GET | Tải media; cấu hình distribution cần xác minh |
| Web | Office Online Viewer | HTTPS iframe | Preview file Office |
| User | ip-api.com | HTTP GET | GeoIP cho thông tin phiên |

Kong có route `/api/pomodoros` trỏ về Project Service. Hai bảng `pomodoro_configs` và `pomodoro_sessions` tồn tại trong migration V1 và có index bổ sung ở V2; tuy nhiên không tìm thấy controller/service và chúng không có trong Prisma schema hiện tại. Vì vậy Pomodoro được biểu diễn bằng nét đứt với nhãn **Partial**, thuộc miền Project thay vì một microservice riêng. AI được biểu diễn bằng nét đứt với nhãn **Planned**; port, provider LLM và vector database được để ở trạng thái chưa quyết định.

## 4. Mermaid Architecture

Bản Mermaid độc lập: [workspacehub-microservices.mmd](workspacehub-microservices.mmd).

## 5. MCP Visual Diagram

Sơ đồ được tạo trực tiếp bằng **draw.io MCP**, gồm 10 trang:

| Trang | Nội dung | Cách dùng |
| --- | --- | --- |
| 00 | Kiến trúc toàn hệ thống | Hình chính trong báo cáo/poster; có boundary, service, DB, Kafka, Redis, external và legend |
| 01 | Tổng quan 6 dịch vụ | Slide giới thiệu |
| 02 | Kong và API route | Cổng vào, policy, route ngoại lệ |
| 03 | Dữ liệu và hạ tầng | Database ownership, shared instance, Redis, S3 |
| 04 | Kafka và sự kiện | Producer → topic → consumer |
| 05 | HTTP nội bộ | Các request đồng bộ còn lại và xác nhận Project → Notification đã chuyển sang Kafka |
| 06 | Task → Calendar → Reminder | Luồng nghiệp vụ và xử lý nền |
| 07 | Realtime và upload | Socket.IO, presigned URL |
| 08 | Authentication | JWT, refresh token, cookie, quyền và giới hạn |
| 09 | AI và Pomodoro | Ma trận bằng chứng hiện tại và vị trí trong kiến trúc mục tiêu |

Tệp chỉnh sửa: [workspacehub-microservices.drawio](workspacehub-microservices.drawio). Ảnh chính: [00-kien-truc-toan-he-thong.png](00-kien-truc-toan-he-thong.png).

Các tên dịch vụ lặp trong vùng Kafka/Redis là tham chiếu tới cùng service ở tầng trên, không biểu thị container/replica bổ sung.

## 6. Kiến trúc Microservices của hệ thống

WorkSpaceHub được tổ chức theo kiến trúc Microservices nhằm phân chia các nhóm nghiệp vụ quản lý công việc và cộng tác thành những dịch vụ có trách nhiệm rõ ràng. Sáu dịch vụ gồm User, Project, Communication, Notification, Document và Calendar. Cách phân chia này giúp giới hạn phạm vi thay đổi khi phát triển chức năng, đồng thời cho phép xây dựng và cấu hình từng dịch vụ riêng. Tuy nhiên, các thành phần vẫn phụ thuộc vào giao tiếp mạng và hạ tầng dữ liệu nên cần được kiểm thử tích hợp.

Ở tầng trình diễn, ứng dụng Next.js cung cấp giao diện tương tác và gửi yêu cầu đến Kong API Gateway. Kong định tuyến yêu cầu tới dịch vụ phù hợp, áp dụng CORS, giới hạn lưu lượng, giới hạn kích thước yêu cầu và bổ sung mã định danh phục vụ đối chiếu log. Đối với các REST route được bảo vệ, Kong kiểm tra JWT và chuyển ngữ cảnh người dùng xuống backend. User Service phụ trách đăng nhập, phát access token và quản lý refresh token. Refresh token được lưu dưới dạng băm trong PostgreSQL; Project Service còn có cơ chế kiểm tra JWT riêng.

Các dịch vụ sử dụng kết hợp giao tiếp đồng bộ và bất đồng bộ. HTTP nội bộ phục vụ tra cứu hồ sơ và kiểm tra quyền tài nguyên. Với thông báo dự án, Project ghi dữ liệu nghiệp vụ và outbox trong cùng transaction; relay sau đó publish `project-notification-events` và chỉ đánh dấu `SENT` khi Kafka xác nhận. Notification claim `eventId` trong bảng `processed_events` và tạo/cập nhật notification trong cùng transaction, nhờ đó event phát lại không tạo dữ liệu trùng. Lỗi tạm thời đi qua retry topic; payload sai hoặc sự kiện hết số lần retry được chuyển sang DLT. Vì vậy, thay đổi giữa hai dịch vụ có độ trễ nhỏ nhưng request nghiệp vụ không phụ thuộc trạng thái tức thời của Notification Service.

Tầng lưu trữ sử dụng PostgreSQL với database riêng cho từng dịch vụ trên cùng một instance trong cấu hình Docker hiện tại. Redis lưu OTP có thời hạn và hỗ trợ Pub/Sub cho Socket.IO của Communication Service. Nội dung tài liệu, avatar và media được tích hợp với Amazon S3, trong khi metadata và quyền truy cập nằm trong cơ sở dữ liệu. Riêng file dự án hiện lưu cả nội dung trong PostgreSQL.

Chat và thông báo được truyền thời gian thực bằng Socket.IO qua Kong. Google OAuth, SMTP và Web Push cung cấp các tích hợp xác thực và phân phối thông tin bên ngoài. Docker Compose tổ chức các container trên mạng nội bộ `wh_network`. AI Service được xác định là thành phần dự kiến vì chưa có backend hoặc cơ sở dữ liệu vector. Pomodoro mới có route, migration và giao diện placeholder nên được xem là module đang triển khai một phần trong miền Project.

## 7. Authentication và giới hạn cần trình bày chính xác

1. User cấp JWT HS256, access token 15 phút; refresh token 7 ngày theo `application.yml`.
2. Refresh token thô nằm trong cookie HttpOnly, Secure, SameSite=Lax; PostgreSQL lưu bản băm HMAC-SHA256 và trạng thái thu hồi.
3. Axios lấy access token từ Redux. Khi gặp 401, interceptor gọi `/api/auth/refresh`, cập nhật token và thử lại request.
4. Kong xác minh JWT trên route bảo vệ rồi gắn `X-User-Id/Email/Role/Name/Avatar`.
5. User Spring Security dùng stateless nhưng filter chain hiện `anyRequest().permitAll()`; không nên nói rằng Spring Security tự xác minh JWT cho mọi endpoint.
6. Project có global `JwtIdentityGuard`, kiểm tra chữ ký/issuer/exp và yêu cầu `X-User-Id` khớp subject.
7. Socket gateway đọc payload token để join room; chưa thấy kiểm tra chữ ký/expiry tại handshake.
8. Calendar gửi `X-User-Id` tới Project nhưng không gửi Authorization, trong khi Project guard yêu cầu Bearer. Luồng này là **Needs verification** khi chạy tích hợp.
9. Project outbox mặc định poll 2 giây, batch 20, tối đa 5 lần thử. Calendar quét reminder mỗi 30 giây, có retry/backoff và trạng thái DEAD_LETTER trong DB; chưa thấy Kafka DLQ riêng.
10. Đồng bộ task sang Calendar không tự động đồng nghĩa tạo reminder.

## 8. Deployment và phần chưa tìm thấy

| Hạng mục | Kết luận dựa trên source |
| --- | --- |
| Docker stack | Compose chính include 6 service và web; Kong, PostgreSQL, Redis, Kafka trên `wh_network` |
| Host mode | Kong chuyển tới `host.docker.internal:8081..8086` |
| Project standalone | Có `project-postgres` riêng trên host port mặc định 5433; khác stack shared instance |
| Runtime command | Nhiều container dùng `start:dev`, `npm run dev`, `spring-boot:run`; Project có production target |
| Service discovery | Docker DNS theo tên service; không thấy Eureka/Consul |
| Kafka | Single-node KRaft; Docker 29092, host 9092; 4 topic, 1 partition, replication factor 1 |
| HTTPS | Kong map 8443; chứng chỉ/domain production: **Needs verification** |
| AWS S3/CloudFront | Có SDK/config/code; bucket, policy và distribution runtime: **Needs verification** |
| EC2/ECS/EKS/RDS/ElastiCache/MSK/LB | **Not found in current source code** |
| AI/LLM/RAG/vector DB/OCR | Trang `/ai` và README thể hiện định hướng; backend/provider/storage **Not found in current source code** |
| Pomodoro | Frontend placeholder + Kong route + SQL migrations; controller/service/Prisma models **Not found in current source code** |
| Google Calendar API | **Not found in current source code** |
| Mobile/Meeting service | **Not found in current source code** |
| CI/CD/IaC/Kubernetes | Không thấy workflow, Terraform, Jenkinsfile hoặc Kubernetes manifest |
| MongoDB | README cũ nhắc MongoDB; Prisma schema và Notification config hiện dùng PostgreSQL |
| Runtime verification | Phân tích tĩnh; chưa khởi động toàn stack hay gọi API thật |

## 9. Bằng chứng chính

| Kết luận | File bằng chứng |
| --- | --- |
| Service, port, network, Kafka, PostgreSQL | [docker-compose.yml](../../backend/docker/docker-compose.yml), [SQL tạo DB](../../backend/docker/postgres-init/01-create-service-databases.sql) |
| Kong route/JWT/policy | [kong.docker.yml](../../backend/kong-gateway/kong.docker.yml), [jwt-user-context handler](../../backend/kong-gateway/plugins/jwt-user-context/handler.lua) |
| User config/auth | [application.yml](../../backend/user-service/src/main/resources/application.yml), [AuthService.java](../../backend/user-service/src/main/java/vn/workspacehub/user/service/AuthService.java), [JwtService.java](../../backend/user-service/src/main/java/vn/workspacehub/user/service/JwtService.java) |
| Spring filter chain | [SecurityConfig.java](../../backend/user-service/src/main/java/vn/workspacehub/user/config/SecurityConfig.java) |
| Project JWT | [jwt-identity.guard.ts](../../backend/project-service/src/common/auth/jwt-identity.guard.ts), [app.module.ts](../../backend/project-service/src/app.module.ts) |
| Frontend token/refresh | [axios.ts](../../frontend/web/lib/axios.ts), [interceptors.ts](../../frontend/web/lib/interceptors.ts) |
| Redis | [OtpService.java](../../backend/user-service/src/main/java/vn/workspacehub/user/service/OtpService.java), [redis.setup.ts](../../backend/communication-service/src/infrastructure/redis/redis.setup.ts) |
| Kafka profile | [UserProfileEventPublisher.java](../../backend/user-service/src/main/java/vn/workspacehub/user/events/UserProfileEventPublisher.java) |
| Project outbox → Kafka → Notification | [notification-outbox.service.ts](../../backend/project-service/src/modules/project/notification-outbox.service.ts), [kafka-notification.adapter.ts](../../backend/project-service/src/modules/project/communication/kafka-notification.adapter.ts), [project-notification.event.ts](../../backend/notification-service/src/modules/notification/events/project-notification.event.ts), [processed_events migration](../../backend/notification-service/prisma/migrations/20260907120000_add_processed_events/migration.sql) |
| Calendar integration/reminder | [resource-access.service.ts](../../backend/calendar-service/src/infrastructure/integrations/resource-access.service.ts), [reminder-dispatch.service.ts](../../backend/calendar-service/src/modules/reminder-dispatch/reminder-dispatch.service.ts) |
| Socket | [chat.gateway.ts](../../backend/communication-service/src/modules/chat/chat.gateway.ts), [notification.gateway.ts](../../backend/notification-service/src/modules/notification/notification.gateway.ts) |
| Document/S3 | [document.controller.ts](../../backend/document-service/src/modules/document/document.controller.ts), [s3.service.ts](../../backend/document-service/src/infrastructure/s3/s3.service.ts) |
| Project file DB | [project-file.service.ts](../../backend/project-service/src/modules/project/project-file.service.ts) |
| AI và Pomodoro | [AI page](<../../frontend/web/app/(workspace)/ai/page.tsx>), [Pomodoro page](<../../frontend/web/app/(workspace)/pomodoro/page.tsx>), [Kong routes](../../backend/kong-gateway/kong.docker.yml), [Project migration V1](../../backend/project-service/database/migrations/V1__create_project_schema.sql) |

## 10. Cách dùng khi bảo vệ

- Dùng trang 01 để giới thiệu sáu service và Kong.
- Dùng trang 00 cho chương kiến trúc hoặc poster.
- Dùng trang 04 và 05 để phân biệt Kafka bất đồng bộ với HTTP đồng bộ.
- Dùng trang 06 kể luồng task → outbox → Kafka → calendar → reminder.
- Dùng trang 08 khi được hỏi JWT/refresh token và nêu đúng giới hạn hiện tại.
- Dùng trang 09 để giải thích AI là phạm vi dự kiến và Pomodoro là phần đang triển khai, tránh mô tả hai chức năng như đã hoàn thiện.
