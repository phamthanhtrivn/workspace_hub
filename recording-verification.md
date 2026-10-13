# Kiểm tra chức năng ghi hình — 12/10/2026

Luồng ghi hình đã chạy thành công với Chromium, PostgreSQL, LiveKit, Egress và AWS S3 thật. Đã sửa lỗi Prisma advisory lock, cấu hình template/FFmpeg và lỗi riêng tư khiến CloudFront phục vụ MP4 không cần đăng nhập. Policy AWS đã áp dụng, cache đã xóa xong và một bản ghi mới đã chạy đủ Start/Pause/Resume/Stop rồi tải thành công dưới policy mới.

- [x] 143 kiểm thử backend thuộc 13 suite recording, gồm 4 kiểm thử FFmpeg thật; không còn suite bị bỏ qua.
- [x] 12 kiểm thử frontend recording.
- [x] 7 kiểm thử hồi quy frontend screen-share: giữ activation, cấp quyền trước publish, hủy capture, API từ chối, lỗi publish một phần, lỗi hệ điều hành/browser và capture kết thúc lúc chờ API.
- [x] Kiểm tra giao diện bằng Chromium và camera, micro, màn hình tổng hợp; API và các dịch vụ hạ tầng đều chạy thật.
- [x] Kiểm tra quyền ghi, quyền xem/tải, chia sẻ, thu hồi và xóa.
- [x] Tải MP4 thật, kiểm tra codec, âm thanh, frame, phát và seek trên trình duyệt.
- [x] Dọn tài khoản, snapshot, phòng và tệp thử trên S3; giữ tệp bằng chứng tại workspace.
- [x] Áp dụng bucket policy và xóa cache CloudFront cho `/recordings/*`; kiểm tra lại MP4 thật, URL có chữ ký và tệp ngoài thư mục recording.

| Luồng | Bằng chứng | Kết quả |
|---|---|---|
| Host Record | Nút hoạt động, hộp xác nhận mở, POST trả 202, trạng thái đạt RECORDING | Đạt |
| Pause/Resume/Stop | Giữ recording ID; hai đoạn được ghép; COMPLETED và tải S3 | Đạt |
| Bố cục | Speaker, gallery; màn hình chia sẻ xuất hiện rồi trở về gallery; screen-only | Đạt |
| Auto-record | Bắt đầu sau khi host vào; kết thúc meeting hoàn tất MP4 | Đạt |
| Quyền member | Start chưa cấp quyền trả 403; Ask to record mở popup host; chấp thuận chỉ cấp quyền; member tự bắt đầu | Đạt |
| Idempotency và capacity | Cùng key trả cùng ID; đổi payload/cố Start trùng trả 409; vượt capacity trả 429 | Đạt |
| Quyền thư viện | Người lạ 404, thiếu token 401; quyền chỉ xem không tải/đổi tên được; starter khác owner không tự có quyền xem | Đạt |
| Chia sẻ và thu hồi | Chủ sở hữu cấp xem/tải; thu hồi chặn URL phát mới | Đạt qua API |
| Playback | Video 1280×720 phát được, currentTime tăng, seek tới giây 5 | Đạt |
| Delete | Dialog xác nhận xóa; dòng thư viện biến mất; S3 404; API phát lại 404 | Đạt |
| Mobile | Viewport 390×844; Record và xác nhận truy cập được; chiều rộng trang bằng 390px | Đạt trên Chromium mô phỏng |
| S3 không ký | HEAD tệp thử không có chữ ký trả 403 | Đạt |
| CloudFront không ký | Trước sửa: GET Range MP4 trả 206; sau sửa: MP4 mới trả 403 | Đạt sau sửa AWS |
| S3 có chữ ký sau sửa AWS | GET Range trả 206, đọc được header ftyp; tải toàn bộ MP4 2.021.026 byte | Đạt |
| Phạm vi policy AWS | Tệp tổng hợp ngoài `recordings/` vẫn trả 200 qua CloudFront | Đạt |

Các MP4 kiểm tra có video H.264 và âm thanh AAC, kích thước 1280×720:

| Tệp | Thời lượng ffprobe | Dung lượng |
|---|---:|---:|
| Speaker có Pause/Resume | 12,891361 giây | 1.975.332 byte |
| Gallery và màn hình chia sẻ | 16,230658 giây | 2.436.399 byte |
| Auto-record screen-only | 5,061950 giây | 229.493 byte |

Đã kiểm tra frame có camera tổng hợp và màn hình có chữ `RECORDING TEST SCREEN`; âm thanh speaker có mean volume −21 dB. Browser pageerror của hai luồng ghi không có lỗi.

Các sửa đổi đã áp dụng:

1. Start/Resume dùng `$executeRaw` để lấy advisory lock PostgreSQL, tránh Prisma deserialize kiểu `void`. Có kiểm thử hồi quy và đã kiểm tra Start với PostgreSQL thật.
2. Thêm `host.docker.internal` vào `allowedDevOrigins` của Next.js để Chrome Egress chạy được template trong môi trường development. Trước đó bản ghi đứng ở STARTING vì template chưa hydrate.
3. Build và chạy lại image backend có FFmpeg; cấu hình Pause/Resume, recording work volume và custom template đã được bật trong `.runtime/meeting.compose.yml`.
4. Ẩn Next.js developer portal riêng trên template ghi hình, tránh ghi biểu tượng debug vào MP4.
5. Thêm Deny CloudFront cho `recordings/*` vào bucket policy và hoàn tất invalidation `/recordings/*`. URL S3 có chữ ký vẫn hoạt động; không chặn các tiền tố khác.

Lint và TypeScript của các phần thay đổi đạt; `git diff --check` đạt. Không chạy production build; bằng chứng giao diện đến từ Next.js development đang chạy.

Cấu hình quyền AWS đã sửa và xác minh:

- Policy trước sửa cho CloudFront đọc toàn bộ `workspacehub-s3/*`.
- Đã thêm explicit Deny cho principal `cloudfront.amazonaws.com`, action `s3:GetObject`, resource `arn:aws:s3:::workspacehub-s3/recordings/*`. Các API recording vẫn cấp URL S3 có chữ ký bằng IAM credentials của backend. Xem [hướng dẫn S3 origin access của AWS](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html).
- Invalidation `I7AKYUKXB6MNF65SBA17AL6090` của distribution `E2T8VHDZI14LHP` đã đạt Completed, chỉ áp dụng `/recordings/*`, theo [hướng dẫn invalidation của AWS](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/invalidation-specifying-objects.html).
- Kiểm tra MP4 mới sau sửa: unsigned S3 403, unsigned CloudFront 403, signed S3 Range 206 và header `ftyp`; một tệp tổng hợp ngoài thư mục recording qua CloudFront trả 200. Đã xóa các tệp thử.
- Đã lưu policy trước/sau sửa, yêu cầu và mã invalidation, kết quả kiểm tra tại `.runtime/recording-tests`. Tài khoản/phòng/MP4 S3 của lần kiểm tra sau sửa cũng đã dọn; bằng chứng local được giữ lại.

Bằng chứng local:

- [MP4 Pause/Resume](/E:/KLTN/hoho/.runtime/recording-tests/recording.mp4)
- [MP4 gallery và màn hình](/E:/KLTN/hoho/.runtime/recording-tests/gallery-screen.mp4)
- [MP4 screen-only](/E:/KLTN/hoho/.runtime/recording-tests/automatic-screen.mp4)
- [Frame gallery](/E:/KLTN/hoho/.runtime/recording-tests/gallery-frame.png)
- [Frame screen-only](/E:/KLTN/hoho/.runtime/recording-tests/screen-frame.png)
- [Giao diện mobile](/E:/KLTN/hoho/.runtime/recording-tests/mobile-record-dialog.png)
- [Chi tiết các bước kiểm tra](/E:/KLTN/hoho/.runtime/recording-tests/results.json)
- [Bucket policy đề xuất](/E:/KLTN/hoho/.runtime/recording-tests/recording-bucket-policy.proposed.json)
- [Kiểm tra quyền truy cập sau sửa AWS](/E:/KLTN/hoho/.runtime/recording-tests/recording-privacy-verification.result.json)
- [Kiểm tra Start/Pause/Resume/Stop sau sửa AWS](/E:/KLTN/hoho/.runtime/recording-tests/after-aws-fix/results.json)
- [MP4 sau sửa AWS](/E:/KLTN/hoho/.runtime/recording-tests/after-aws-fix/recording.mp4)

Giới hạn và phát hiện ngoài phạm vi recording:

- Media là dữ liệu tổng hợp trên Chromium desktop; mobile là viewport mô phỏng. Chưa kiểm tra điện thoại thật, mạng kém, bản ghi kéo dài 2 giờ, outage S3 và restart giữa phiên bằng hạ tầng thật. Các ca lỗi/recovery được kiểm tra bằng suite tự động, gồm multipart và FFmpeg.
- URL S3 đã ký được cấp trước khi thu hồi quyền có thể còn dùng được đến hết hạn, tối đa 5 phút; API đã chặn cấp URL mới.
- `/api/auth/register` trong môi trường hiện tại trả 500 do cột cũ `account_settings.allow_search_by_email` NOT NULL không còn được entity ghi. Tài khoản fixture được seed riêng; login/refresh và recording dùng API thật. Chưa sửa lỗi đăng ký ngoài phạm vi.
- Một số backend ngoài recording đang tắt, nên giao diện workspace phát sinh cảnh báo không liên quan. Chưa xác nhận việc nhận notification hoàn tất qua notification-service; đã kiểm tra thông báo/trạng thái ghi qua socket trong phòng.

## Kiểm tra bổ sung lỗi Share screen

Ảnh người dùng cung cấp cho thấy recording đang chạy nhưng Share screen báo lỗi chung. Luồng cũ gọi API start trước rồi mới gọi `getDisplayMedia`; trong kiểm tra có trì hoãn API, đã quan sát capture được gọi với `navigator.userActivation.isActive = false`. Trình duyệt yêu cầu transient activation cho hộp chọn màn hình; xem [tài liệu getDisplayMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia). Chưa có tên exception từ trình duyệt của người dùng để khẳng định đây là nguyên nhân duy nhất của ảnh.

Đã sửa `useMeetingScreenShare` để mở hộp chọn ngay trong lần bấm, giữ track ở local, xin quyền từ backend rồi mới publish lên LiveKit. Hủy/chặn capture không chiếm hoặc ngắt screen-share đang có. API từ chối hoặc publish thất bại dừng toàn bộ track đã thu và thu hồi trạng thái backend nếu đã được cấp. Trường hợp capture kết thúc trong lúc chờ API cũng được xử lý. Thông báo phân biệt hủy/không cấp quyền, tab mất focus, hệ điều hành chặn capture, browser không hỗ trợ và lỗi API.

Kiểm tra Chromium với capture tổng hợp và backend thật: API chậm 6 giây vẫn chia sẻ được; Stop giải phóng track; lỗi quyền/OS không gửi start API; API 403 giải phóng capture; lỗi chia sẻ không dừng recording. 7 kiểm thử hồi quy qua `npm run test:screen-share` và 12 kiểm thử recording đạt. ESLint, TypeScript và `git diff --check` đạt.

Bản ghi của luồng mới đã COMPLETED và tải từ S3: MP4 3.667.568 byte, ffprobe 21,280667 giây, H.264 1280×720 và AAC. Frame ở giây 10 có màn hình xanh với chữ `SCREEN SHARE REGRESSION 87` và camera tổng hợp ở bên cạnh. Không có browser pageerror. Đã dọn tài khoản, phòng và đối tượng S3 thử.

Capture gốc của Chromium headless trên Windows trả `NotSupportedError`; thông báo cho trường hợp này đã được bổ sung và kiểm thử. Các lượt E2E sử dụng canvas capture có kiểm tra activation thật, WebRTC/LiveKit/Egress/S3 thật. Chưa tự xác nhận hộp chọn màn hình của trình duyệt desktop mà người dùng đang mở.

- [Kết quả screen-share E2E](/E:/KLTN/hoho/.runtime/recording-tests/screen-share/results.json)
- [Video screen-share sau sửa](/E:/KLTN/hoho/.runtime/recording-tests/screen-share/screen-share-recording.mp4)
- [Frame màn hình trong MP4](/E:/KLTN/hoho/.runtime/recording-tests/screen-share/recording-frame.png)
