# Báo cáo rà soát Pomodoro — 30/09/2026

## Kết luận

Các luồng chính và các lỗi đã tái hiện đạt kiểm thử tự động sau khi sửa. Chưa chốt nghiệm thu tích hợp: Docker chưa chạy, PostgreSQL cục bộ chưa khả dụng, nên chưa áp dụng migration và chưa chạy luồng đăng nhập → lưu phiên → truy vấn database thật. Kiểm thử Chromium dùng API giả lập, không thay thế bước này.

## Những lỗi đã xử lý

| Vấn đề | Hành vi sau sửa |
| --- | --- |
| Task/ghi chú giữa hai tài khoản | Cache timer/config gắn userId; bỏ dữ liệu legacy không xác định chủ sở hữu; dọn cache khi đăng xuất và remount theo tài khoản. |
| Đổi task ghi thời gian sang task mới | Lưu phần thời gian cho task cũ trước khi chuyển; lỗi lưu giữ task cũ và tạm dừng để thử lại. |
| Đổi cấu hình rồi reload làm sai thời lượng | Lưu thời lượng gốc của phiên độc lập với cấu hình mới. Backend có migration planned_seconds. |
| Ghi chú vượt giới hạn backend | Giới hạn 2.000 ký tự tại nhập liệu, khôi phục và gửi dữ liệu. |
| Reset/skip/đổi chế độ khi lưu thất bại | Tạm dừng, giữ dữ liệu và báo lỗi; chỉ chuyển sau khi lưu thành công. Reset/đổi chế độ giữ quy tắc chỉ ghi phiên từ 30 giây. |
| Cấu hình chưa đồng bộ bị mất khi reload | Lưu dấu cấu hình đang chờ đồng bộ theo tài khoản, ưu tiên bản chưa gửi khi khôi phục. |
| Phản hồi lưu cũ ghi đè ghi chú mới | Không ghi snapshot cũ vào local cache khi còn thay đổi mới đang chờ gửi. |
| Pause giữa hai nhịp cập nhật | Tính thời gian còn lại từ deadline thực tế. |
| Âm thanh còn phát sau khi rời trang | Dừng audio khi unmount; kho audio tải lên tách theo userId. Audio legacy dùng chung không tự chuyển chủ sở hữu. |
| Mục tiêu ngày và lỗi thống kê | Mục tiêu cập nhật ngay; hiển thị trạng thái lỗi và nút thử lại; truy vấn ngày dùng múi giờ trình duyệt. |
| Tràn giao diện trên điện thoại | Đồng hồ co theo chiều rộng; điều chỉnh nút và hiệu ứng nền; kiểm tra ở 320px và 390px. |

## Kết quả kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Frontend `npm.cmd test` | Đạt: Calendar 33, Project 10 (2 Node + 8 Vitest), Pomodoro 100; Notification chưa có test. |
| Pomodoro | 100/100 test, 21 file. |
| Calendar service `npm.cmd test -- --runInBand` | 77/77 test, 11 suite; gồm test Pomodoro và các phần liên quan. |
| `npx.cmd eslint features/pomodoro` | Đạt sau sửa cuối. |
| TypeScript `npx.cmd tsc --noEmit --incremental false` | Đạt; production build sau sửa cuối cũng kiểm tra TypeScript thành công. |
| `npm.cmd run build` | Đạt sau sửa giao diện cuối, tạo 17 trang. |
| Các thành phần UI sửa cuối | Chạy lại 8/8 test: timer display, controls, view. |
| Chromium trên bản production | 10 kiểm tra đạt; API được giả lập. |
| `git diff --check` | Đạt. |

Kiểm thử Chromium bao gồm bắt đầu/tạm dừng/reload, đổi task, đổi thời lượng giữa phiên, giới hạn ghi chú, mô phỏng API 503 và thử lại, hoàn thành/chuyển chu kỳ, cập nhật thống kê, xuất JSON, cô lập hai tài khoản, kiểm tra tràn ngang mobile và lỗi JavaScript không được xử lý.

Script: `frontend/web/scripts/pomodoro-smoke.py`.

Script sinh bằng chứng vào `frontend/web/artifacts/pomodoro-review/`: `smoke-results.json`, `report-export.json`, `desktop.png`, `mobile.png`, `mobile-320.png`. Thư mục này được bỏ qua bởi Git; chạy lại script để tạo các file. Các ảnh và JSON chứa dữ liệu kiểm thử giả lập; không dùng làm số liệu năng suất thực tế.

Để chạy lại kiểm thử giao diện: ở `frontend/web`, chạy `npm.cmd run build`, khởi động `npm.cmd run start -- --port 3100` ở một terminal; ở terminal khác chạy `python scripts/pomodoro-smoke.py`. Cần Python Playwright và Chromium đã cài đặt.

## Việc cần hoàn tất trên môi trường báo cáo

1. Khởi động Docker/stack và xác nhận Calendar service, gateway, auth và PostgreSQL hoạt động.
2. Áp dụng migration `backend/calendar-service/prisma/migrations/20260930000000_pomodoro_timer_duration/migration.sql` qua `npx.cmd prisma migrate deploy` trong Calendar service, với DATABASE_URL của đúng môi trường. Chưa chạy thành công bước này trong lần rà soát.
3. Đăng nhập tài khoản A thật, chọn task, chạy phiên ngắn, pause và reload. Xác nhận task, ghi chú, thời gian còn lại.
4. Đổi task, hoàn thành phiên, mở lịch sử và xuất báo cáo; đối chiếu taskId, actualSeconds, plannedSeconds trong dữ liệu thật.
5. Đăng xuất, đăng nhập tài khoản B trên cùng trình duyệt; xác nhận B không thấy dữ liệu Pomodoro của A.
6. Kiểm tra âm báo, thông báo trình duyệt và tải audio trên trình duyệt sẽ dùng thuyết trình. Quyền thông báo/chính sách autoplay phụ thuộc trình duyệt.

## Giới hạn cần trình bày đúng

- Không tuyên bố hỗ trợ thông báo nền khi đã đóng tab; chưa có kiểm chứng service worker cho trường hợp này.
- Không tuyên bố đồng bộ thời gian thực giữa nhiều tab/thiết bị; đây chưa phải phạm vi kiểm thử tích hợp hoàn tất.
- Khi API lỗi, phiên được giữ để đồng bộ/thử lại; chưa coi là chế độ offline hoàn chỉnh.
- Chromium desktop giả lập viewport mobile không thay thế kiểm tra thiết bị thật, Safari hoặc Firefox.
- Các kết quả trên chứng minh những trường hợp đã kiểm tra, không bảo đảm mọi tổ hợp thao tác đều không có lỗi.

## Kịch bản demo ngắn

Đặt thời lượng focus ngắn → chọn task A → bắt đầu → tạm dừng/reload → chuyển task B và chỉ ra lịch sử A → hoàn thành B → chuyển nghỉ → đổi mục tiêu ngày → lọc báo cáo/xuất JSON → đăng xuất/đăng nhập B để chứng minh dữ liệu tách tài khoản. Chạy thử kịch bản này trên stack thật trước buổi báo cáo.
