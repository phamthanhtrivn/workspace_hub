# Project → Notification qua Kafka

## Goal
Thay luồng HTTP nội bộ bằng Transactional Outbox → Kafka, xử lý idempotent tại Notification Service và đưa lỗi sau retry vào DLT.

## Tasks
- [x] Chuẩn hóa event envelope và Kafka publisher trong Project Service → Verify: unit test kiểm tra topic, key và envelope.
- [x] Chuyển outbox relay sang Kafka, giữ thứ tự và phân loại bản ghi lỗi vĩnh viễn → Verify: unit test SENT/retry/DEAD.
- [x] Thêm inbox `processed_events` và migration trong Notification Service → Verify: Prisma validate và compile.
- [x] Thêm consumer cho create notification, invitation email và invitation status → Verify: compile và test handler/idempotency.
- [x] Thêm retry topic + DLT topic, cập nhật Docker Kafka init/dependencies → Verify: Docker Compose config hợp lệ.
- [x] Cập nhật biến môi trường, tài liệu và sơ đồ Draw.io → Verify: không còn Project gọi HTTP Notification.
- [x] Chạy lint, unit tests và compile cho cả hai service.

## Done When
- [x] Project chỉ đánh dấu outbox `SENT` sau Kafka acknowledgement.
- [x] Notification không tạo dữ liệu trùng khi nhận lại cùng `eventId`.
- [x] Event lỗi được retry có giới hạn rồi chuyển sang DLT.
- [x] Hai service compile thành công và các kiểm tra liên quan đều đạt.

## Notes
Invitation email vẫn cần Project tra cứu User Service để lấy địa chỉ email trước khi publish. SMTP không hỗ trợ giao dịch phân tán, nên inbox ngăn xử lý lại sau khi email đã được ghi nhận thành công nhưng không thể đảm bảo exactly-once tuyệt đối nếu tiến trình dừng đúng giữa lúc SMTP nhận thư và lúc ghi `processed_events`.
