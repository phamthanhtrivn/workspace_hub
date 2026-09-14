# Rename Project OWNER Role to ADMIN

## Goal
Đổi role dự án `OWNER` thành `ADMIN` xuyên suốt database, backend và frontend mà vẫn giữ quyền của dữ liệu hiện có.

## Tasks
- [x] Tìm toàn bộ nơi sử dụng `OWNER` và xác định phạm vi thay đổi.
- [x] Đổi enum/backend logic và thêm migration cập nhật dữ liệu `OWNER` thành `ADMIN`.
- [x] Đồng bộ type, điều kiện hiển thị và test frontend.
- [ ] Áp dụng migration V17 vào database hiện tại khi PostgreSQL hoạt động; static analysis và test đã đạt.

## Done When
- [ ] Không còn role `OWNER` trong luồng Project và dữ liệu cũ được chuyển thành `ADMIN` (đang chờ database).
- [x] Backend và frontend Project vượt qua kiểm tra.
