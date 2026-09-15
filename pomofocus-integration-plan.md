# Kế hoạch tích hợp Pomofocus vào Workspace Hub

## Mục tiêu

Biến Pomodoro hiện có thành một vòng lặp hoàn chỉnh trong Workspace Hub:

`Task → Estimate → Focus session → Actual time → Report`

Giữ nguyên kiến trúc microservices hiện tại. Project Service sẽ được mở rộng mới để quản lý task/session/config; Calendar chỉ nhận projection khi task có ngày, còn Notification chịu trách nhiệm nhắc và báo kết thúc.

## Phạm vi đã điều chỉnh cho hệ thống

- Không tạo Pomodoro Task riêng: dùng `Task` của Project Service, bổ sung `estimatedPomodoros` và counter `completedPomodoros` dạng projection. Hiện schema chưa có các field/session/config Pomodoro nên phải tạo migration và domain mới.
- Không lưu timer theo từng giây: frontend lưu `startedAt`, `endAt`, `pausedDuration` và tính lại từ `Date.now()`.
- Focus session là dữ liệu bất biến sau khi kết thúc; mọi lần hoàn tất/skip đều ghi rõ loại session và trạng thái.
- Task Calendar đồng bộ một chiều từ Project Service như cơ chế hiện có; không để Calendar tự tạo bản sao Pomodoro.
- Người dùng chưa đăng nhập vẫn có thể chạy timer, task và session cục bộ. Vì `Task.projectId` hiện bắt buộc, dữ liệu anonymous chỉ import thành project task mới sau khi đăng nhập, không ghi trực tiếp vào Project Service.

## Các công việc

- [ ] **1. Chốt domain và migration** → Tạo mới `PomodoroConfig`, `PomodoroSession`, các enum, field Task và index; không giả định các model này đã tồn tại. Quy định timezone, trạng thái session và counter projection. *Xác nhận bằng migration chạy được trên DB sạch và DB hiện tại.*
- [ ] **2. Xây Timer Engine ở FE** → State machine `IDLE/RUNNING/PAUSED/COMPLETED/SKIPPED`, 3 mode Pomodoro/Short Break/Long Break, pause/resume/skip, khôi phục khi đổi tab hoặc reload. *Test fake clock cho drift, reload và chuyển mode.*
- [ ] **3. Gắn timer với task** → Chọn task từ danh sách Project/Calendar, hiển thị estimate vs actual, khóa task dự án chỉ đọc nếu không có quyền, tăng actual atomically khi session hoàn tất. *Test race-condition và retry API.*
- [ ] **4. Hoàn thiện settings** → Focus, short break, long break, long-break interval, auto-start break/pomodoro, âm báo, volume; lưu user preference theo account và local fallback. *Test validation, default và reset.*
- [ ] **5. Session API + event flow** → Dùng route theo convention hiện tại (`/api/pomodoro/...` hoặc route versioning đã chốt), tạo session complete/skip với idempotency key; server tự kiểm tra duration và quyền task. *BE unit/integration/E2E + kiểm tra duplicate key và payload conflict.*
- [ ] **6. Finish-time calculation** → Tính giờ hoàn thành dựa trên task còn lại, mode hiện tại, break interval và auto-start; hiển thị timezone người dùng, cập nhật khi settings/task thay đổi. *Test các chuỗi 1/4/long break và qua nửa đêm.*
- [ ] **7. Report trong Dashboard** → Day/Week/Month: focus minutes, số session, estimate-vs-actual, theo task/project; truy vấn từ session, không suy ra từ timer client. *Test boundary timezone, pagination và empty state.*
- [ ] **8. Templates/integration chỉ sau core loop** → Template task + estimate trước; sau đó mới cân nhắc Todoist, CSV, webhook, ranking, yearly report và subscription. *Mỗi integration có permission, retry, audit, rate limit và feature flag riêng.*

## Thứ tự phát hành

`Phase 0 domain + legacy compatibility` → `MVP-1 Timer + 3 mode` → `MVP-2 local persistence + task binding` → `MVP-3 session API + transaction + outbox` → `MVP-4 settings + notification` → `V1 finish-time + reports` → `V1.5 anonymous import + templates` → `V2 integrations/premium`.

## Điều kiện hoàn thành

- Timer không lệch khi chuyển tab, reload hoặc máy ngủ.
- Một session hoàn tất chỉ làm tăng actual đúng một lần.
- Task, session, Calendar projection và notification không tạo vòng lặp sự kiện.
- Người dùng có thể xem báo cáo ngày/tuần/tháng theo đúng timezone.
- FE/BE build, lint, unit, integration và E2E đều pass; kiểm thử thủ công đủ các flow Start → Pause → Resume → Complete/Skip → Break → Next Task.

## Các quyết định kỹ thuật bắt buộc

- **Outbox:** hiện Project Service có `notification_outbox`, chưa có generic `outbox_events`. Chọn mở rộng outbox hiện tại cho MVP hoặc tạo bảng generic riêng; không dùng tên/contract giả định.
- **Idempotency:** unique `(userId, clientSessionId)`; retry cùng key nhưng payload khác phải trả `409 Conflict`; duplicate Kafka `eventId` không được tạo side effect lần hai.
- **Counter:** `completedPomodoros` là projection có thể reconcile từ session COMPLETED, không phải source of truth.
- **Offline queue:** session hoàn tất khi offline phải nằm trong pending queue local và retry khi online.
- **Finish time:** API/UI phải trả `estimatedFinishAt` kèm assumptions; không tính thời gian nghỉ thủ công ngoài cấu hình.

## Rủi ro cần xử lý trước khi bắt đầu

- Reminder editor hiện đã đổi sang preset; phải giữ được reminder tùy chỉnh cũ như 45 hoặc 1440 phút.
- Chưa có quyết định cuối về local-first merge khi user đăng nhập trên nhiều thiết bị; không merge task bằng title.
- README mô tả Pomodoro đã có nhưng schema/code thực tế chưa có; phải lấy schema và runtime làm nguồn sự thật.
- Không khóa chức năng cốt lõi sau subscription; chỉ giới hạn report nâng cao, template không giới hạn và integration premium.
