# Lịch sử xác minh ghi camera và micro cuộc họp

Chế độ giao diện hiện tại đã chuyển sang quay toàn bộ tab Meeting theo yêu cầu được làm rõ. Xem [xác minh ghi toàn bộ ứng dụng](meeting-application-recording-verification.md). Nội dung bên dưới ghi nhận các bài thử camera/grid trước thay đổi này.

Ngày: 13/10/2026.

## Hành vi

- `speaker` và `grid` chỉ chọn camera người tham gia và đăng ký âm thanh micro. Chia sẻ desktop, cửa sổ hay tab không thay thế camera trong video ghi lại.
- Khi tất cả tắt camera, giữ avatar/nền và âm thanh micro; không chuyển sang màn hình đang chia sẻ.
- `screen` vẫn là lựa chọn riêng để ghi màn hình khi người dùng chủ động chọn `Shared screen only`.
- Backend bắt buộc có `LIVEKIT_RECORDING_TEMPLATE_URL`. Thiếu URL sẽ báo ghi hình chưa được cấu hình; không dùng template mặc định có thể thu màn hình chia sẻ.
- Đã cập nhật nhãn lựa chọn và mô tả xác nhận trong Record, Recording settings và Schedule meeting.

## Kiểm tra tự động

- Frontend: `npm.cmd run test:recording` đạt 13/13. Bao gồm trường hợp chia sẻ desktop khi đang ghi camera, gallery trước/trong/sau chia sẻ, và bỏ đăng ký cả video lẫn audio desktop khi chuyển từ screen-only về camera.
- Backend: `npm.cmd test -- --runInBand livekit.service.spec.ts meeting-recording` đạt 121 kiểm thử trong 8 suite; 4 kiểm thử tích hợp trong 1 suite bị bỏ qua vì không bật môi trường tích hợp.
- Lint các file TypeScript/TSX và script kiểm thử đã sửa; TypeScript frontend/backend với `--noEmit --incremental false`.
- Frontend production build: `npm.cmd run build` thành công, gồm compile, TypeScript và tạo 17 trang.
- Chromium: 8 kiểm tra đạt qua `.runtime/meeting-only-browser/check.py`. Template và hook subscription lấy trực tiếp từ mã hiện tại, dùng đối tượng publication/remote track LiveKit thật với media tổng hợp; kết nối room và component giao tiếp LiveKit là fixture, không có SFU/Egress/S3.
- Browser xác nhận đổi active speaker, gallery giữ hai camera khi có/chấm dứt chia sẻ desktop, tắt toàn bộ camera vẫn giữ avatar và micro, và chuyển từ `screen` về `grid` hủy đăng ký cả hình lẫn âm thanh desktop. So sánh pixel ảnh gallery xác nhận có cả hai màu camera và không có màu desktop. Không có JavaScript pageerror.
- Route `/recording-template` trên frontend production trả HTTP 200 và thông báo cần kết nối khi thiếu token, không chuyển sang đăng nhập.

Bằng chứng: [kết quả Chromium](E:/KLTN/hoho/.runtime/meeting-only-browser/results.json), [gallery chỉ có camera](E:/KLTN/hoho/.runtime/meeting-only-browser/gallery.png), [active speaker](E:/KLTN/hoho/.runtime/meeting-only-browser/speaker.png), [camera tắt](E:/KLTN/hoho/.runtime/meeting-only-browser/cameras-off.png).

## Chưa xác minh trong môi trường thật

Theo yêu cầu của người dùng, đã dừng Docker Desktop sau khi khởi động và tiếp tục bằng Node/Chromium trên máy. Không chạy kiểm thử ghi và phát lại MP4 qua Egress/S3 thật trong lượt này. Kết quả Chromium chứng minh lựa chọn hình, giao diện và subscription với media tổng hợp; không chứng minh đường truyền SFU hay file đầu ra Egress/S3.

Khi chạy môi trường đầy đủ:

1. Vào cuộc họp bằng hai trình duyệt, bật camera/micro và bấm Record. Giao diện dùng một bố cục lưới cố định, không còn chọn layout.
2. Một người chia sẻ toàn bộ desktop, chuyển sang ứng dụng khác và phát âm thanh từ màn hình chia sẻ. Video ghi phải giữ camera, chỉ có tiếng micro.
3. Tắt camera, dừng/chuyển người chia sẻ và Pause/Resume. Dừng bản ghi, mở MP4 và kiểm tra avatar, tiếng nói và thời lượng.

Thay đổi áp dụng khi phiên Egress tải template mới. Bản ghi đã lưu giữ nội dung cũ; nên dừng phiên đang ghi và bắt đầu phiên mới sau khi frontend/backend nhận mã mới.

## Rà soát và tối ưu bổ sung

Đã loại microphone của participant ẩn, local, Egress và caption worker; tối ưu chọn bố cục và subscription; giữ worker xử lý bản ghi cũ khi mất cấu hình Start; giữ video đang phát khi lấy URL mới thất bại. Recording frontend hiện đạt 17/17, backend đạt 150/150 với FFmpeg thật, Chromium đạt 12/12. Xem [báo cáo rà soát và benchmark](recording-audit-optimization.md) để biết phạm vi và giới hạn xác minh.
