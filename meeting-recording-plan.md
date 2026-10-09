# Kế hoạch triển khai ghi cuộc họp

Ngày: 09/10/2026. Trạng thái: đã lập kế hoạch; chưa triển khai tính năng.

## Mục tiêu và phạm vi

Triển khai trải nghiệm ghi trên đám mây tương tự Zoom: bấm Record trong phòng → REC và thời gian → Stop → Đang xử lý → xem lại trong Recordings. Ghi âm thanh, camera và màn hình được chia sẻ thành MP4 trên máy chủ; lưu S3. Người dùng đã chọn: host/co-host điều khiển ghi; thành viên thường cần được host cấp quyền; bản ghi mặc định riêng tư và được chia sẻ theo tài khoản.

Đề xuất cho bản đầu: MP4 720p, một phiên ghi/xử lý trong mỗi phòng; dừng rồi ghi lại tạo file mới; màn hình chia sẻ hiển thị lớn và camera nhỏ, hết chia sẻ quay về camera. Record không mở hộp chọn màn hình; Share screen vẫn là thao tác và quyền riêng. Chủ sở hữu bản ghi là người tạo cuộc họp (`Meeting.createdBy`), độc lập với chuyển host. Tạm dừng/tiếp tục trong cùng một file, HLS, tự động ghi, transcript và AI tóm tắt làm sau.

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
- Tạo branch riêng khi bắt đầu thay đổi mã nguồn lớn theo quy ước dự án. Kế hoạch hiện chưa thay đổi code hoặc triển khai dịch vụ.

Nguồn: [LiveKit Egress](https://docs.livekit.io/transport/media/ingress-egress/egress/), [Egress API](https://docs.livekit.io/reference/other/egress/api/), [self-host Egress](https://docs.livekit.io/transport/self-hosting/egress/), [S3 multipart](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html).
