# Complete Calendar Service

## Goal
Hoàn thiện Calendar thành tính năng production-ready: recurrence theo occurrence, reminder Kafka, tích hợp Project/Document, phân quyền, phân trang, vận hành an toàn và test đầy đủ.

## Tasks
- [ ] Cập nhật Prisma schema và migration cho recurrence series/occurrence, reminder delivery, task projection và invariant lịch mặc định. → Verify: `prisma validate` và migrate trên database test.
- [ ] Hoàn thiện Calendar/Event API: DTO query có validation/pagination, visibility, attachment authorization và recurrence scope `THIS`/`THIS_AND_FOLLOWING`/`ALL`. → Verify: unit và integration tests.
- [ ] Thêm worker materialize occurrence và dispatch reminder qua Kafka với retry/idempotency. → Verify: worker tests và Kafka contract tests.
- [ ] Tích hợp Project/Document: internal access endpoints, HTTP authorization adapter và phát/nhận task snapshot Kafka. → Verify: contract tests giữa services.
- [ ] Mở rộng Notification Service xử lý reminder `ALERT`/`PUSH`/`EMAIL` và không nuốt lỗi consumer. → Verify: handler tests.
- [ ] Sửa Docker/migration/env/README: chỉ expose nội bộ, dùng `prisma migrate deploy`, tạo calendar DB và cấu hình mẫu. → Verify: `docker compose config --quiet`.
- [ ] Hoàn thiện frontend: attendee, nhiều reminder, document, visibility/status, quyền thao tác và recurrence scope; tải hết các trang trong range. → Verify: ESLint, TypeScript và build.
- [ ] Bổ sung unit/integration/E2E cho các luồng chính và lỗi phân quyền/validation/concurrency. → Verify: toàn bộ test suite pass.
- [ ] Chạy kiểm chứng cuối cho các service bị thay đổi và ghi lại giới hạn còn lại. → Verify: build, lint, test và working-tree diff review.

## Done When
- [ ] Toàn bộ mục thiếu/rủi ro đã được xử lý hoặc có giới hạn kỹ thuật được kiểm chứng và ghi rõ.
- [ ] Không còn lỗi lint/type/build/test trong phạm vi các file thay đổi.

## Notes
- Recurrence được lưu thành từng occurrence; API hỗ trợ sửa/hủy một lần, từ lần được chọn hoặc cả chuỗi.
- Calendar phát reminder qua Kafka; Notification Service chịu trách nhiệm delivery theo channel.
- Calendar gọi Project/Document Service để kiểm tra quyền; Project phát task snapshot qua Kafka.
