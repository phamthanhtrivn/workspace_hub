# Calendar Data Hardening

## Goal

Chuẩn hóa lưu trữ Calendar, giới hạn tăng trưởng occurrence/reminder, và tự đồng bộ profile/task mà không ghi dữ liệu trong API đọc.

## Tasks

- [x] Chuẩn hóa Prisma schema: `TIMESTAMPTZ`, timezone lịch, bảng tài liệu và ngoại lệ recurrence → Verify: `prisma validate`.
- [x] Thêm migration backfill rồi bỏ các cột array cũ → Verify: chạy migration trên database Calendar sạch.
- [x] Chuyển recurrence sang worker cửa sổ lăn, bỏ materialize khỏi API GET và chặn RRULE dưới một ngày → Verify: unit test giới hạn và nhiều batch.
- [x] Cập nhật event service để đọc/ghi quan hệ document/exception nhưng giữ nguyên API `documentIds`/`exceptionDates` → Verify: service tests.
- [x] Thêm dọn reminder đã hoàn tất và bảo đảm occurrence mới có reminder đúng hạn → Verify: worker tests.
- [x] Bổ sung profile backfill/lazy hydration và Project task reconciliation có batch → Verify: integration mocks và consumer tests.
- [x] Reset riêng `calendar_db`, áp dụng toàn bộ migration và kiểm tra constraint/index/count → Verify: Prisma migration status và SQL metadata.
- [x] Chạy test, type-check, lint và container build cho các service bị ảnh hưởng → Verify: tất cả lệnh hoàn tất không lỗi.

## Done When

- [x] GET events chỉ đọc database.
- [x] Không thể tạo RRULE theo giây/phút/giờ.
- [x] Occurrence được materialize theo cửa sổ hữu hạn và tiếp tục được worker bù theo batch.
- [x] Profile/task cũ có đường reconciliation, dữ liệu mới vẫn đi qua Kafka.
- [x] Calendar database sạch chạy đủ migration mới và không còn array legacy.

## Notes

- Dữ liệu Calendar hiện tại được phép reset theo quyết định ngày 2026-08-30.
- API frontend vẫn nhận `documentIds` và `exceptionDates` để tránh breaking change.
