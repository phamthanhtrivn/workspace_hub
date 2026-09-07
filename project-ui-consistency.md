# Project UI Consistency

## Goal

Sửa dữ liệu, điều hướng, phân quyền và tính bất biến của Project UI; đồng thời tách logic nghiệp vụ lớn khỏi component mà không thay đổi luồng backend ngoài phạm vi cần thiết.

## Tasks

- [x] Bổ sung dữ liệu owner/progress/quyền vào hợp đồng Project API và hiển thị đúng ở danh sách.
- [x] Đồng bộ `?view=settings` và biến nút ba chấm thành menu có hành động thật.
- [x] Tính permission theo thành viên hiện tại và ProjectSetting; ẩn/khóa thao tác không được phép.
- [x] Vô hiệu hóa drag cho task DONE/CANCELLED và reset TaskForm mỗi lần mở.
- [x] Thay suy đoán task key/type bằng trường nghiệp vụ ổn định từ backend.
- [x] Tách permission, filter/status transition và activity presentation khỏi page/drawer lớn.
- [x] Chạy lint, typecheck/build và rà soát diff.

## Done When

- [x] Không còn dữ liệu owner/progress giả, deep-link và menu hoạt động, UI tuân thủ quyền và task terminal chỉ đọc.
- [x] Task key/type đến từ dữ liệu nghiệp vụ, không suy đoán từ UUID/tiêu đề.
- [x] Frontend và Project Service vượt qua kiểm tra liên quan.
