# Ghi toàn bộ giao diện Meeting

Ngày xác minh: 13/10/2026.

## Hành vi

- Record → Start recording mở hộp chọn của trình duyệt. Chọn đúng tab Meeting hiện tại; ứng dụng kiểm tra display surface, origin và capture handle, dừng track ngay nếu chọn nguồn khác.
- Video ghi đúng vùng ứng dụng đang nhìn thấy, gồm header, nội dung chia sẻ, camera/avatar, thanh điều khiển và các panel mở. Không phát lại track capture vào giao diện phòng.
- Âm thanh gồm micro và âm thanh được chia sẻ trong cuộc họp; capture tab chỉ lấy video để tránh trộn lặp âm thanh.
- Người gọi phải tham gia phòng và có quyền ghi. Backend cấp/thu hồi quyền phát capture cho riêng người gọi, xác minh SID thuộc participant đó và có tên capture hợp lệ. Quyền phát camera/micro mặc định của người khác được giữ nguyên.
- SID capture được lưu trong layout nội bộ `app:TR_...`; không thay đổi schema database. File cũ vẫn được đọc bằng các layout trước đây.
- Dừng từ nút Record hoặc kết thúc capture trong trình duyệt sẽ ngừng ghi. Capture giữ đến khi Egress hoàn tất để tránh chèn khung chờ vào cuối video.

## Kiểm tra thực tế

Chromium desktop quay tab thật bằng `getDisplayMedia`, LiveKit/Egress Docker, API xác thực và S3 cấu hình hiện có. Camera/micro và nội dung screen-share dùng nguồn thử tổng hợp; tab capture dùng API trình duyệt thật.

- Tạo/vào phòng, mở chat, chọn tab Meeting, Record → Stop → upload hoàn tất.
- Bật screen-share trong khi quay tab: track capture tiếp tục hoạt động. MP4 có giao diện ứng dụng, panel chat và nội dung screen-share màu xanh.
- MP4 tải từ S3 phát được trên Chromium: 1280×720, 11,59 giây, 2.508.077 byte trong lượt thử cuối có screen-share.
- Kiểm tra khung giữa video phát hiện 367.589 pixel màu của nội dung chia sẻ; khung cuối vẫn giữ 367.586 pixel, không chuyển sang khung chờ khi dừng.
- Không có JavaScript pageerror. File S3, tài khoản, snapshot và phòng thử đã được xóa. Phiên thử bị gián đoạn khi Docker thiếu tài nguyên cũng đã được dọn riêng theo UUID/email/prefix fixture.
- Frontend production build với webpack thành công, gồm TypeScript và 17 trang. Frontend hiện chạy bản production để giảm RAM trong lúc dùng Meeting/Egress.
- Kiểm thử: frontend 23/23, backend recording/LiveKit 132/132; 4 bài cần FFmpeg local được bỏ qua rõ ràng. Lint các file đã thay đổi sạch.

Capture Handle cần trình duyệt hỗ trợ API; luồng này đã chạy thực tế trên Chromium desktop. Các bài kiểm tra cũng từ chối desktop/cửa sổ/tab khác, kiểm tra thu hồi quyền, chủ sở hữu track và giữ quyền capture khi thay đổi screen-share.

Nguồn tham khảo: [Capture Handle](https://developer.chrome.com/docs/web-platform/capture-handle), [getDisplayMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia).
