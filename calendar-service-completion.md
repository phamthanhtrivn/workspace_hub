# Complete Calendar Service

## Goal
Hoàn thiện Calendar thành tính năng production-ready: recurrence theo occurrence, reminder Kafka, tích hợp Project/Document, phân quyền, phân trang, vận hành an toàn và test đầy đủ.

## Tasks
- [x] Cập nhật Prisma schema và migration cho recurrence series/occurrence, reminder delivery, task projection và invariant lịch mặc định. → `prisma validate` pass; migration thật chờ Docker/database chạy.
- [x] Hoàn thiện Calendar/Event API: DTO query có validation/pagination, visibility, attachment authorization và recurrence scope `THIS`/`THIS_AND_FOLLOWING`/`ALL`. → Unit và API integration tests pass.
- [x] Thêm worker materialize occurrence và dispatch reminder qua Kafka với claim/retry. → Worker unit/contract test pass.
- [x] Tích hợp Project/Document: internal access endpoint, HTTP authorization adapter và phát/nhận task snapshot Kafka. → Type-check các service pass.
- [x] Mở rộng Notification Service xử lý reminder `ALERT`/`PUSH`/`EMAIL` và không nuốt lỗi consumer. → Type-check pass; service chưa có test harness.
- [x] Sửa Docker/migration/env/README: chỉ expose nội bộ, dùng `prisma migrate deploy`, tạo calendar DB và cấu hình mẫu. → Cả hai cấu hình Compose pass.
- [x] Hoàn thiện frontend: attendee, nhiều reminder, document, visibility/status, quyền thao tác và recurrence scope; tải hết các trang trong range. → ESLint, TypeScript và production build pass.
- [x] Bổ sung unit/integration/E2E cho Calendar: recurrence, reminder retry, validation, pagination và recurrence scope. → 8 unit + 5 integration tests pass.
- [x] Chạy kiểm chứng cuối cho các service bị thay đổi và ghi lại giới hạn còn lại. → Type-check, lint/build trong phạm vi thay đổi và diff check pass.

## Done When
- [x] Toàn bộ mục thiếu/rủi ro đã được xử lý hoặc có giới hạn kỹ thuật được kiểm chứng và ghi rõ.
- [x] Không còn lỗi lint/type/build/test trong phạm vi các file thay đổi.

## Notes
- Recurrence được lưu thành từng occurrence; API hỗ trợ sửa/hủy một lần, từ lần được chọn hoặc cả chuỗi.
- Calendar phát reminder qua Kafka; Notification Service chịu trách nhiệm delivery theo channel.
- Calendar gọi Project/Document Service để kiểm tra quyền; Project phát task snapshot qua Kafka.
- Docker Desktop không chạy trong phiên kiểm chứng, nên chưa thể chạy `prisma migrate deploy` trên database thật.
- Kafka/external email và push có semantics at-least-once; `deliveryId` được phát để Notification có thể bổ sung deduplication bền vững theo provider.
