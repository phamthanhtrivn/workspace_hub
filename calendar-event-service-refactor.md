# Calendar Event Service Refactor

## Goal
Giữ nguyên API và hành vi Calendar hiện tại nhưng tách `CalendarEventService` theo Single Responsibility.

## Tasks
- [x] Khóa hành vi policy và mapper bằng unit test mới → Verify: test mới thất bại trước khi có implementation.
- [x] Tạo shared event types/include để các service dùng cùng Prisma payload → Verify: TypeScript không có type trùng lặp.
- [x] Tách `EventAccessPolicy` và `EventMapper` → Verify: unit test policy/mapper pass.
- [x] Tách `EventRelationService` → Verify: create/update attendee, reminder, document vẫn pass.
- [x] Tách `RecurrenceMutationService` → Verify: các scope `THIS`, `THIS_AND_FOLLOWING`, `ALL` vẫn pass.
- [x] Thu gọn `CalendarEventService` thành facade CRUD/query → Verify: controller API không đổi.
- [x] Đăng ký provider và cập nhật test wiring → Verify: Nest module compile.
- [x] Chạy test, E2E, typecheck, lint và build → Verify: tất cả lệnh exit 0.

## Done When
- [x] `CalendarEventService` không còn chứa policy, mapping, relation persistence hoặc recurrence mutation details.
- [x] Không đổi schema database, route hoặc response contract.
- [x] Toàn bộ verification đạt.
