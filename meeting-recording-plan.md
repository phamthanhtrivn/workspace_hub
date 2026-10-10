# Kế hoạch triển khai ghi cuộc họp

Ngày: 09/10/2026. Trạng thái: đã hiện thực backend/frontend trên branch `feature/meeting-recording`; chờ nghiệm thu LiveKit Egress/S3 thật. Hướng dẫn chạy và bằng chứng kiểm tra: [meeting-recording-setup.md](meeting-recording-setup.md).

## Tiến độ hiện thực

Bổ sung trên branch `feature/recording-permission-requests`: thành viên bấm **Ask to record**, host nhận popup **Allow recording/Decline**, thành viên nhận kết quả. Duyệt chỉ cấp quyền, không tự bắt đầu ghi. Yêu cầu lưu trên participant, hết hạn sau 2 phút, gửi lại cách nhau tối thiểu 60 giây; request đang chờ được trả lại thay vì gửi thông báo trùng. Host mới tiếp nhận yêu cầu đang chờ sau chuyển host; host cũ không được duyệt. Rời phòng/bị loại/đổi vai trò/kết thúc phòng hủy request cũ.

Đợt xin quyền đã kiểm chứng: 170 backend tests, 9 frontend tests, build backend/frontend, migration PGlite và hai phiên Chromium host/member với API/signalling giả lập. Database dự án và phòng họp thật vẫn cần cập nhật/nghiệm thu theo hướng dẫn chạy.

| Phần | Đã làm | Kiểm chứng còn lại |
|---|---|---|
| Hạ tầng/file lớn | Profile Egress, volume backup, sandbox, uploader dự phòng ba part 16 MiB song song và resume bằng checkpoint DB; kiểm thử HTTP với file 110 MiB; CORS/lifecycle mẫu | Ghi/upload MP4 lên S3 thật và đo tải |
| Dữ liệu | Schema, migration backfill/BigInt/ACL/job, partial unique index; SQL đã chạy trên PGlite | Áp dụng vào database của dự án |
| Quyền/API | JWT, quyền theo vai trò/grant, thư viện private/ACL, start/stop và idempotency | Thử nhiều tài khoản với backend thật |
| Vòng đời | Webhook, ba nhóm tác vụ độc lập, đối soát Egress theo lô 30 giây, lease/abort/retry, stop khi end meeting, backup recovery, socket/Kafka | Media thật, restart và lỗi mạng |
| UI trong phòng | Record/Stop/Pause/Resume, REC/timer bỏ thời gian Pause, thông báo, settings host và menu cấp quyền | Hai trình duyệt trong phòng thật |
| Ghi cốt lõi như Zoom | Phiên nhiều đoạn, ghép MP4 bằng FFmpeg không encode lại, auto-record khi host kết nối, template camera/trình chiếu riêng | Ghi thật qua template và đo độ trễ Pause/Resume |
| Thư viện | Danh sách, player tự gia hạn URL giữ vị trí/trạng thái phát; polling theo kết nối socket; tải, đổi tên, chia sẻ/thu hồi/xóa | Phát/seek MP4 ghi từ Egress thật |
| Kiểm tra | Jest đầy đủ, typecheck/build, lint phần thay đổi, Chromium desktop/mobile với API giả lập | E2E Egress/S3 |

Checklist nghiệm thu bên dưới giữ mở cho các tiêu chí cần môi trường thực tế; không dùng API giả lập để xác nhận ghi video thành công.

## Tối ưu đã thực hiện

- [x] Tách upload phục hồi khỏi Start/Stop; kiểm thử Stop được xử lý khi upload vẫn đang chờ.
- [x] Multipart song song có giới hạn buffer; lưu checkpoint và tiếp tục sau lỗi/restart, xác nhận CRC32, không ghi đè file, hủy khi mất lease.
- [x] Giảm ListEgress và polling; socket gom sự kiện, tăng polling khi mất kết nối, banner không tạo thêm vòng polling.
- [x] Player prefetch/gia hạn URL và giữ vị trí/trạng thái phát; kiểm thử bằng MP4 và HTTP Range trên Chromium.
- [x] Build backend/frontend, kiểm thử backend/frontend, ghép media bằng FFmpeg thật và migration PGlite; bằng chứng chi tiết trong hướng dẫn chạy.
- [ ] Chạy Egress/S3 thật, đo thời gian xử lý và CPU/RAM/đĩa/băng thông để chọn part size/concurrency/số Egress worker. Cấu hình mặc định là điểm khởi đầu, chưa phải kết quả tối ưu từ benchmark production.

## Đợt bổ sung trải nghiệm ghi cốt lõi như Zoom

Người dùng chọn ngày 09/10/2026: Pause/Resume, tự động ghi khi host vào phòng, bố cục camera/trình chiếu, thông báo và quyền truy cập; chưa thêm transcript/AI. Giữ lưu S3 và owner/ACL đã chọn.

- [x] Thêm trạng thái PAUSING/PAUSED, đoạn ghi và settings auto-record; migration giữ dữ liệu cũ, unique phiên hoạt động bao gồm paused.
- [x] API Pause/Resume/settings có khóa DB, kiểm tra quyền và chống request lặp; ghi lại sau Stop tạo phiên mới.
- [x] Worker dừng đoạn khi Pause, bắt đầu đoạn mới khi Resume, ghép MP4 không chứa khoảng tạm dừng; một đoạn dùng S3 copy, nhiều đoạn dùng FFmpeg stream copy; giữ dữ liệu khi lỗi.
- [x] Auto-record khi host JOINED và kết nối vào LiveKit, đối soát khi restart; kiểm tra lại lịch sử trong khóa DB để không tự ghi lại sau Stop thủ công.
- [x] Template recording riêng: active speaker/gallery/screen-only, screen share lớn và camera nhỏ, âm thanh phòng; độc lập với pin cá nhân và provider/thông báo ứng dụng.
- [x] UI Pause/Resume, thời gian chỉ tính phần ghi, thông báo trạng thái và settings tự động ghi; chọn auto-record khi tạo hoặc lên lịch họp.
- [x] Kiểm thử API/quyền/vòng đời/migration, FFmpeg với media thật và ghi đè đồng thời, Chromium controls/template route, build/lint.
- [ ] Nghiệm thu template/media qua LiveKit Egress/S3 thật, đo độ trễ và tài nguyên trước khi kết luận tối ưu production.

Pause thật dừng Egress của đoạn hiện tại; UI hiển thị Pausing tới khi đoạn được xác nhận. Resume chỉ bắt đầu sau xác nhận Pause. Khi ghép dùng cùng preset H264/AAC 720p/30 để tránh encode lại. Cần FFmpeg trên process upload và volume làm việc có đủ đĩa; bộ nhớ upload vẫn có giới hạn. Chưa khẳng định tối ưu production trước khi đo tải.

## Mục tiêu và phạm vi

Triển khai trải nghiệm ghi trên đám mây tương tự Zoom: bấm Record trong phòng → REC và thời gian → Stop → Đang xử lý → xem lại trong Recordings. Ghi âm thanh, camera và màn hình được chia sẻ thành MP4 trên máy chủ; lưu S3. Người dùng đã chọn: host/co-host điều khiển ghi; thành viên thường cần được host cấp quyền; bản ghi mặc định riêng tư và được chia sẻ theo tài khoản.

Phạm vi hiện tại: MP4 720p, một phiên ghi/xử lý/tạm dừng trong mỗi phòng; dừng rồi ghi lại tạo file mới, Pause/Resume giữ cùng file cuối; màn hình chia sẻ hiển thị lớn và camera nhỏ, hết chia sẻ quay về camera. Record không mở hộp chọn màn hình; Share screen vẫn là thao tác và quyền riêng. Chủ sở hữu bản ghi là người tạo cuộc họp (`Meeting.createdBy`), độc lập với chuyển host. Có tự động ghi khi host kết nối; HLS, transcript và AI tóm tắt nằm ngoài phạm vi.

Thiết kế API, bảng quyền và các tình huống lỗi: [meeting-recording-spec.md](meeting-recording-spec.md).

## Công việc theo thứ tự phụ thuộc

- [ ] **1. Hạ tầng và file lớn:** thêm Egress worker/config vào `backend/livekit`, nối cùng Redis/LiveKit, S3 riêng tư, volume tạm và giới hạn tài nguyên; xác nhận multipart uploader của image được chọn. **Đạt khi:** file thử trên 100 MB lên S3 trực tiếp từ worker, không qua Kong/backend và không được nạp toàn bộ vào RAM; có kiểm tra retry và dọn upload dang dở.
- [ ] **2. Dữ liệu:** mở rộng `MeetingRecording`, thêm quyền ghi của participant, ACL chia sẻ và bảng tác vụ bền vững; migration với ràng buộc chỉ một phiên đang ghi/xử lý trong một phòng. **Đạt khi:** Prisma validate/generate thành công, migration áp dụng được trên DB thử và ngăn hai lần start đồng thời.
- [ ] **3. Phân quyền:** mở rộng `MeetingPolicyService`, tách quyền điều khiển khi `JOINED` khỏi quyền truy cập bản ghi sau cuộc họp; tích hợp rời phòng, loại khỏi phòng, chuyển host và thu hồi quyền. **Đạt khi:** bảng quyền trong spec được kiểm thử ở backend, cả truy cập chéo meeting/recording.
- [ ] **4. API:** thêm recording controller/service, DTO và serializer; start/stop/status, cấp/thu hồi quyền, danh sách/chi tiết, xem/tải, chia sẻ/xóa; cập nhật Kong và chuẩn lỗi. **Đạt khi:** contract trong spec hoạt động và request lặp không tạo Egress/file trùng.
- [ ] **5. Vòng đời và bố cục:** dùng `EgressClient.startEgress`, webhook xác thực, đối soát `listEgress`, socket và thông báo; nối end meeting và retry upload từ bản sao tạm nếu phiên bản worker hỗ trợ lưu dự phòng. **Đạt khi:** camera → screen share → camera nằm trong cùng MP4; lỗi upload/webhook và restart không báo hoàn tất giả hoặc làm mất file tạm còn phục hồi được.
- [ ] **6. UI trong phòng:** thêm Record/Stop, REC/timer, thông báo cho người vào muộn, cấp quyền trong participants và đồng bộ khi reconnect. **Đạt khi:** hai trình duyệt thấy cùng trạng thái; Record không mở hộp chọn màn hình; Share screen và quyền ghi hoạt động độc lập.
- [ ] **7. Thư viện:** mở mục Recordings trong `features/meeting`, thêm danh sách phân trang, player, tải, chia sẻ và xóa; URL ký có hạn và được làm mới khi cần. **Đạt khi:** chỉ chủ sở hữu/người được chia sẻ thấy và mở được bản ghi sau khi meeting kết thúc.
- [ ] **8. Kiểm chứng cuối:** chạy kiểm thử backend, lint/typecheck/build và E2E với LiveKit Egress/S3 thật; đo CPU/RAM/đĩa/băng thông, thử lỗi mạng, giới hạn ghi và dọn file. **Đạt khi:** ma trận quyền đạt; MP4 lớn phát/seek được, có nhiều người nói và đổi screen share; restart backend được phục hồi, lỗi Egress có giới hạn phục hồi rõ ràng.

## Lưu ý triển khai

- Tái sử dụng NestJS/Prisma, LiveKit SDK, `MeetingPolicyService`, `MeetingRealtimeService`, `S3Service` và cơ chế thông báo hiện có.
- Mỗi bước hoàn tất cập nhật checklist; không coi mock Egress là bằng chứng ghi thật thành công.
- Multipart chia dữ liệu upload nhưng sau hoàn tất vẫn tạo một MP4; không đồng nghĩa upload ngay trong lúc ghi hoặc tự tiếp tục được sau restart Egress. Tái sử dụng uploader Egress, kiểm thử theo image đã pin; đặt lifecycle dọn multipart bỏ dở sau 7 ngày. HLS và API upload file từ trình duyệt không thuộc bản đầu.
- Egress self-host cần worker riêng. API mới `StartEgress` yêu cầu server từ v1.13.5; compose hiện dùng v1.13.5 và SDK đang cài có `startEgress`. Xác nhận thêm phiên bản worker và giao tiếp thực tế trước khi xây API/UI.
- Mã nguồn đã được thay đổi trên branch `feature/meeting-recording`; dịch vụ Egress/S3 thực tế chưa được triển khai trong phiên làm việc này.

Nguồn: [LiveKit Egress](https://docs.livekit.io/transport/media/ingress-egress/egress/), [Egress API](https://docs.livekit.io/reference/other/egress/api/), [self-host Egress](https://docs.livekit.io/transport/self-hosting/egress/), [S3 multipart](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html).
