# Kết quả xử lý Project sau review

Cập nhật: 06/09/2026. Phạm vi: R01–R15 của [báo cáo ban đầu](PROJECT_PRODUCTION_REVIEW.md), backend Project Service, frontend Project và điểm tích hợp trực tiếp. Tiếp tục trên cấu trúc component mới trong working tree, giữ nguyên các thay đổi đang staged.

**Đã triển khai sửa cả 15 mục và hoàn tất các kiểm tra bên dưới. Chưa kết luận toàn bộ sản phẩm đủ điều kiện phát hành:** audit frontend còn cảnh báo ở dependency dùng chung, và chưa kiểm thử E2E toàn hệ thống hay tải production.

## Trạng thái từng phát hiện

| Mục | Sửa trong mã hiện tại | Bằng chứng / phạm vi kiểm chứng |
| --- | --- | --- |
| R01 | Ghi sự kiện Calendar vào outbox cùng transaction task/thành viên/lời mời; worker tải snapshot hiện tại và retry khi Kafka lỗi. | PostgreSQL xác nhận task và outbox cùng được lưu; rollback khi activity lỗi; unit test retry vượt giới hạn thông báo rồi gửi thành công khi publisher phục hồi. Kafka trong test được thay thế, chưa thử broker thật. |
| R02 | API lưu metadata và byte tệp trong PostgreSQL, có kiểm tra quyền, quota, upload/download/delete; UI tải dữ liệu từ API. | Service mới đọc lại đúng byte; HTTP multipart/download/delete qua controller, JWT, quyền Project; người ngoài bị 403, tệp quá 10 MiB bị 413. |
| R03 | Form chuyển ISO sang giờ địa phương và gửi ngược UTC; backend từ chối thời điểm thiếu offset; tách quy tắc ngày all-day. | Unit frontend ở Asia/Ho_Chi_Minh, ca qua nửa đêm/all-day; HTTP lưu 09:00+07:00 thành 02:00Z. |
| R04 | Khóa dòng Project trong transaction đổi Sprint; kiểm tra trạng thái cả Sprint nguồn và đích. | PostgreSQL xác nhận không lấy task khỏi Sprint ACTIVE sang PLANNED; kiểm thử hai yêu cầu start chỉ tạo một Sprint ACTIVE. |
| R05 | Kiểm tra lại cây task trong transaction, chặn tầng thứ ba; task chuyển cha kế thừa Sprint của cha mới. | Regression test kế thừa Sprint; PostgreSQL chặn việc chuyển task đã có con xuống dưới cha khác. |
| R06 | Callback cập nhật task truyền lỗi về caller; drawer chỉ báo thành công sau khi API thành công. | Hook test lỗi HTTP không cập nhật selected task; drawer test không phát toast success khi lưu lỗi. |
| R07 | Task trả từ Sprint dùng chung projection có assignees, labels, checklists và số con. | PostgreSQL xác nhận assignees/checklists không mất khi đọc Sprint. |
| R08 | Thay đổi task/checklist/label làm mới cache Project, gồm tasks và sprints; task được chọn theo dữ liệu mới. | React Query tests cho cập nhật task và bốn thao tác attach/detach/update/delete label. |
| R09 | Payload startDate/dueDate nullable; xóa ngày gửi null thay vì undefined. | Test JSON giữ null và HTTP PATCH xác nhận ngày được xóa thật. |
| R10 | Email trỏ đến `/projects/invitations?invitationId=...`; route có màn hình xem và phản hồi lời mời. | Next production build có route; integration lời mời đồng thời chỉ một yêu cầu thành công. Chưa thử gửi email thật và toàn bộ luồng đăng nhập từ email. |
| R11 | Trao đổi task dùng comment API đã lưu, query theo taskId, thay lịch sử mock. | Test gửi, chuyển A sang B và mở lại A với QueryClient mới đọc đúng lịch sử từ API giả lập. Chưa chạy browser E2E với backend comment thật. |
| R12 | ValidateIf chỉ bỏ qua undefined cho các field update không nhận null, giữ null cho xóa ngày/assignee. | Validation tests Task/Project/Sprint, gồm start/end Sprint; HTTP title:null trả 400. |
| R13 | Bỏ lịch sử burndown tự sinh, hiển thị số liệu tiến độ hiện tại; cancelled tách khỏi done. | UI test progress lấy số task thật, không có biểu đồ lịch sử giả; sửa thêm số task chưa phân công khi một task có nhiều assignee. |
| R14 | Tạo task nhận sprintId và lưu vào Sprint trong một transaction; frontend gọi một request. | UI action test một request; PostgreSQL xác nhận Sprint ACTIVE không để lại task, số thứ tự hoặc outbox sau lỗi. |
| R15 | Chuẩn hóa rank số với độ dài 20 ở task thường và task mẫu; V11 cập nhật dữ liệu cũ. | Kiểm thử 12 task, thứ tự task mẫu + task mới; chạy V11 trên rank cũ, giữ nguyên rank tùy chỉnh. |

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| Backend `npm.cmd test` | 16 suite, **51/51 test** |
| Backend `npm.cmd run test:integration` | **15/15 test**, PostgreSQL 15 tạm riêng, có HTTP thật |
| Backend `npm.cmd run lint` | Qua |
| Backend `npm.cmd run prisma:validate` và `npm.cmd run build` | Qua, Prisma Client 6.19.3 được generate thành công |
| Backend chạy `node dist/main.js`, gọi `/health` và `/ready` | HTTP 200, status ok/ready trên DB kiểm thử |
| Frontend `npm.cmd run test:project` | **19/19 test**: 2 pagination + 17 Vitest |
| Frontend ESLint `features/project` và `app/(workspace)/projects` | Qua, không còn lỗi/cảnh báo lint trong phạm vi này |
| Frontend `npm.cmd run build` | Qua, gồm TypeScript toàn web và route `/projects/invitations` |
| SQL V1–V12 | Đã áp dụng theo thứ tự số trên DB tạm; V11 kiểm tra thêm dữ liệu cũ |
| Backend dependency audit | **0 vulnerabilities** sau cập nhật 3 dependency |
| Frontend dependency audit | **14 cảnh báo: 10 high, 4 moderate** — chưa xử lý trong phạm vi Project |

Các bộ test, lint, Prisma validation và build backend đã chạy lại sau khi cập nhật dependency. Cảnh báo “Kafka offline” trong unit test là lỗi được chủ động giả lập để kiểm tra retry, không phải một test thất bại.

Nguồn test hiện tại: [backend regression](backend/project-service/src/modules/project/production-regressions.spec.ts), [outbox](backend/project-service/src/modules/project/notification-outbox.service.spec.ts), [integration](backend/project-service/test/project-service.integration-spec.ts), [HTTP app](backend/project-service/test/project-http-app.ts), [frontend regression](frontend/web/features/project/production.test.tsx), [frontend hooks](frontend/web/features/project/hooks/custom-hooks.test.tsx).

## Dependency và giới hạn phát hành

Backend đã cập nhật `fast-uri` lên 3.1.7, `qs` lên 6.16.0, và override riêng `@prisma/config -> deepmerge-ts` lên 8.0.0. Giữ Prisma 6.19.3; xem [README](backend/project-service/README.md) về lý do và điều kiện bỏ override. Bản deepmerge-ts này sửa [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx).

Audit frontend còn báo ở Next.js, sharp, PostCSS, socket.io-parser và các dependency/tooling dùng chung khác. Đây là cảnh báo thực tế từ `npm.cmd audit --audit-level=high`, không phải kết quả xác nhận khả năng khai thác từng luồng Project. Việc nâng Next và chuỗi dependency cần kiểm chứng các module khác; chưa tự nâng toàn web khi yêu cầu giới hạn ở Project. **Không dùng kết quả build/test Project để bỏ qua bước này trước khi phát hành.**

Chưa kiểm thử browser E2E toàn bộ luồng người dùng, Kafka/Calendar/email thật qua gateway, tải lớn, rollout nhiều replica hoặc production container. DB test là DB riêng, không dùng DB làm việc hay production.

Tệp hiện lưu trong PostgreSQL: tối đa 10 MiB/tệp, 100 MiB và 500 tệp/dự án; cần tính cả byte tệp khi backup DB. Chưa tích hợp object storage hay quét mã độc. Trao đổi task cập nhật bằng polling 5 giây; không phải WebSocket. Tiến độ Sprint là ảnh chụp hiện tại, chưa có lịch sử burndown.

## Khi triển khai bản sửa

1. Đối chiếu migration history và backup DB mục tiêu.
2. Áp dụng [V11](backend/project-service/database/migrations/V11__normalize_task_ranks.sql) và [V12](backend/project-service/database/migrations/V12__add_project_files.sql) sau các migration hiện có, theo thứ tự số.
3. Cài đúng lockfile, generate Prisma Client, triển khai frontend/backend tương ứng và kiểm tra các tích hợp trên staging.

Chưa áp dụng migration vào DB chung, chưa commit/push hoặc deploy trong lượt xử lý này.
