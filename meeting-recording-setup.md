# Chạy và kiểm tra meeting recording

Tính năng đã được hiện thực trên branch `feature/meeting-recording`. Host/co-host bấm Record, chọn speaker/grid, mọi người thấy REC và thời gian; Stop chuyển sang Processing. Từ 13/10/2026, speaker/grid chỉ ghi camera và micro cuộc họp thành MP4 720p rồi upload S3; hình ảnh và âm thanh desktop/chia sẻ màn hình không được đưa vào hai bố cục này. Người tạo meeting sở hữu file; người bấm Record không tự có quyền xem nếu là tài khoản khác.

## Cấu hình

1. Bật Docker Desktop. Dùng một bucket S3 private, bật Block Public Access. Tài khoản lưu trữ cần `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:AbortMultipartUpload`, `s3:ListMultipartUploadParts` trên `arn:aws:s3:::<bucket>/recordings/*`. Cấu hình AWS hiện có cũng phục vụ upload chat, nên giữ các quyền chat cần thiết khi giới hạn prefix.
2. Thêm các biến từ `backend/livekit/recording.env.example` vào `backend/docker/.env`, dùng cùng key/secret LiveKit với communication-service. Giữ nguyên các biến PostgreSQL/Redis hiện có. Với backend chạy Docker, đặt webhook `http://communication-service:8083/api/meetings/livekit/webhook`; với backend chạy trên máy, dùng `http://host.docker.internal:8083/api/meetings/livekit/webhook`.
3. Thêm các biến từ `backend/communication-service/recording.env.example` vào `.env.docker` của service; nếu chạy Node trên máy thì thêm vào `.env`. `JWT_SECRET_KEY` phải khớp user-service/Kong; không dùng giá trị mẫu. Khi chạy Node trên máy, đổi `LIVEKIT_URL` thành `http://localhost:7880` và bỏ `RECORDING_BACKUP_ROOT` nếu chưa mount cùng volume backup vào backend.
4. Áp dụng CORS với origin frontend thực tế theo `backend/livekit/config/recording-s3-cors.example.json`. Thêm lifecycle dọn multipart chưa hoàn tất theo `recording-s3-lifecycle.example.json` vào cấu hình hiện có của bucket. Các file mẫu chưa được áp dụng lên tài khoản AWS. S3 endpoint tùy chỉnh phải truy cập được từ Egress, backend và trình duyệt.

Compose cấp Egress 4 CPU/4 GB RAM, Chrome sandbox và seccomp profile chính thức. Với một worker như cấu hình hiện tại, nên đặt `MEETING_RECORDING_MAX_CONCURRENT=1`; chỉ tăng khi có thêm worker hoặc đã đo tải. `MEETING_RECORDING_MAX_MINUTES` mặc định 120, Egress cũng giới hạn file 2 giờ. Nếu thay thời lượng, cập nhật cả hai nơi. API chỉ nhận lệnh; dữ liệu video không upload qua Kong.

## Chạy toàn bộ backend bằng Docker

Từ thư mục `workspace_hub`:

```powershell
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.yml --profile recording config --quiet
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.yml --profile recording up -d --build communication-service kong livekit livekit-egress
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.yml --profile recording ps
```

Các dependency Redis/PostgreSQL và bước khởi tạo volume được Compose chạy tự động. Khi chỉ chạy hạ tầng Docker và backend Node trên máy, dùng `backend/docker/docker-compose.host.yml` và `up -d livekit livekit-egress`; chạy communication-service riêng như phần sau. Frontend dùng cách khởi động hiện có của dự án.

## Database

Luồng xin quyền ghi bổ sung migration `20261009000500_recording_permission_requests`: ba trường nullable `recordingRequestId/recordingRequestedAt/recordingRequestState` trên participant, UUID unique và index cho hàng chờ. Cần cập nhật schema và sinh Prisma client trước khi chạy backend mới; chưa áp migration vào database thực tế trong phiên phát triển này.

Lịch sử migration cũ của dự án chưa tạo được toàn bộ schema trên database trống; development stack trước đây dùng `db push --accept-data-loss`. Luồng khởi động mới dùng `prisma/prepare-recording-db.cjs`: backfill owner/title các bản ghi cũ trong transaction, chạy `db push` không chấp nhận mất dữ liệu, rồi tạo partial unique index ngăn hai phiên ghi hoạt động trong cùng meeting. Nếu có schema drift hoặc bản ghi hoạt động trùng, script dừng để xử lý dữ liệu.

Nếu chạy service trên máy, từ `backend/communication-service`:

```powershell
npx.cmd prisma generate
node prisma/prepare-recording-db.cjs
npm.cmd run start:dev
```

Với môi trường đã quản lý migration và baseline đầy đủ, áp dụng lần lượt `20261009000100_meeting_recording/migration.sql` và `20261009000200_recording_upload_resume/migration.sql` qua quy trình migration của môi trường đó. Migration thứ hai thêm checkpoint JSONB và index cho hàng đợi phục hồi. Không dùng script development để thay thế baseline production; không reset database để thêm recording.

## Thử chức năng

1. Tạo meeting bằng tài khoản A, vào bằng tài khoản B. A bấm Record: hiện Starting rồi REC/timer. B cũng thấy thông báo; tài khoản vào muộn thấy trạng thái đang ghi. Bấm Record không mở hộp chọn màn hình.
2. A cấp Allow recording cho B trong Participants. B có thể bắt đầu và dừng phiên do B bắt đầu; thu hồi quyền khiến B mất nút điều khiển tương ứng. Co-host điều khiển theo vai trò. Rời/bị loại khỏi phòng xóa quyền được cấp.
3. Ghi micro/camera, bật Share screen, đổi người chia sẻ, tắt Share screen; Stop. Kiểm tra Recordings chuyển Ready, video có âm thanh và chuyển bố cục trong cùng file. Kết thúc meeting khi đang ghi cũng phải hoàn tất bản ghi.
4. A xem, tải, đổi tên, chia sẻ cho B với quyền xem/tải; B xem từ thư viện sau khi meeting kết thúc. Thu hồi hoặc xóa khiến API không cấp URL mới. URL đã ký có hiệu lực tối đa 5 phút; quyền xem không ngăn người xem lưu nội dung đã phát.
5. Ghi file trên 100 MB, thử S3 lỗi trong khi upload, restart backend, bỏ webhook, thử hai request start đồng thời. Theo dõi CPU/RAM/đĩa, phát và seek MP4 sau hoàn tất. Chỉ báo COMPLETED sau Egress kết thúc và HEAD S3 xác nhận dung lượng.

## Phục hồi và giới hạn

Worker lưu START/STOP/DELETE/RECOVER/NOTIFY trong PostgreSQL, có lease/heartbeat và retry. Mỗi 5 giây nhận tác vụ theo ba nhóm độc lập: START/STOP, DELETE/NOTIFY và RECOVER; một upload chậm không chặn lần nhận Start/Stop kế tiếp. Nhóm điều khiển xử lý tối đa hai tác vụ đồng thời; nhóm upload xử lý một file mỗi process. Đối soát Egress mỗi 30 giây, lấy danh sách một lần cho tối đa 50 bản ghi; webhook vẫn cập nhật ngay. Start đã dispatch nhưng mất phản hồi được tìm lại theo room/output key; không gửi một start thứ hai mù. Một start không xác nhận được sau ngân sách retry chuyển FAILED và lên lịch dừng Egress còn sót.

Khi Egress báo dùng backup, volume `recording_backup` giữ file dưới `recordings/<meetingId>/<recordingId>.mp4`. Backend Docker mount cùng volume tại `/recording-backup`. Uploader dự phòng mặc định dùng part 16 MiB và ba part song song, tương ứng khoảng 48 MiB buffer dữ liệu mỗi process, cộng chi phí SDK/runtime; không nạp toàn bộ file. Có thể chỉnh `MEETING_RECORDING_UPLOAD_PART_MIB` trong khoảng 5–64 và `MEETING_RECORDING_UPLOAD_CONCURRENCY` trong khoảng 1–4. File không vượt 10.000 part theo cấu hình đã chọn.

UploadId, fingerprint size/mtime, ETag và CRC32 của từng part được lưu trong `MeetingRecordingJob.uploadState` sau mỗi nhóm upload. Lỗi tạm thời hoặc restart giữ checkpoint, đối chiếu các part S3 và chỉ gửi phần chưa xác nhận. Nếu Complete đã thành công nhưng mất phản hồi, HEAD kiểm tra dung lượng và token metadata riêng trước khi công nhận file. Complete có điều kiện không ghi đè object đã tồn tại; endpoint S3 tương thích phải hỗ trợ CRC32 và conditional multipart completion. File thay đổi hoặc part không hợp lệ khiến uploader abort và xóa checkpoint; mất lease/shutdown hủy request đang chạy. Xóa bản ghi abort multipart đang lưu trước khi dọn object/backup. Upload bỏ dở sau hết retry được lifecycle S3 dọn sau 7 ngày; file backup vẫn giữ để phục hồi thủ công. Chỉ xóa bản sao sau upload xác nhận thành công. Crash Egress giữa lúc encode không bảo đảm phục hồi MP4. Cần theo dõi/dọn file backup thất bại theo chính sách vận hành; không chạy `down -v` nếu còn file cần cứu.

`MEETING_RECORDING_WORKER_ROLE` mặc định `all`; có thể dùng `control`, `upload` hoặc `off`. Khi tách process, giữ ít nhất một process `control` và một `upload`, cùng database/bucket và volume backup; lease ngăn hai process nhận cùng tác vụ. Đây là phân vai worker trong communication-service, chưa có service upload riêng trong Compose. Tăng process upload cũng tăng tổng buffer và băng thông; đo tải trước khi tăng. Số process upload không làm tăng năng lực encode của Egress.

Frontend dùng socket và gom sự kiện trong 100 ms. Khi socket hoạt động, status đối soát mỗi 30 giây kể cả lúc chuyển trạng thái/có request chờ; thư viện ổn định mỗi 60 giây. Timer riêng tải lại status tại hạn request/cooldown, không cần polling 3 giây khi socket khỏe. Mất socket, status dùng 5 giây hoặc 3 giây nếu có request chờ/STARTING/PAUSING/PROCESSING; thư viện dùng 15 giây khi ổn định, 5 giây khi xử lý. Lỗi quyền/tài nguyên dừng polling. Player lấy URL mới trước hạn, giữ URL hiện tại khi stream còn hoạt động và tự đổi khi cần tua/phát lại hoặc gặp lỗi, giữ vị trí và trạng thái phát. Lỗi media lặp trước khi phát được dừng ở một lần retry tự động; người dùng có thể thử lại.

Thông báo hoàn tất/thất bại dùng Kafka hiện có và cơ chế retry ít nhất một lần; khi lỗi một phần có thể gửi lặp thông báo. Chưa có transcript hoặc HLS.

## Pause/Resume, tự động ghi và bố cục

Dockerfile communication-service đã cài FFmpeg; Compose mount `recording_work` tại `/recording-work`. Đặt `MEETING_RECORDING_PAUSE_ENABLED=true`, `RECORDING_FFMPEG_PATH=ffmpeg`, `RECORDING_WORK_ROOT=/recording-work`. Node trên Windows cần FFmpeg trong PATH hoặc cấu hình đường dẫn executable; bỏ cấu hình root Linux hoặc chọn thư mục làm việc trên máy. API/control và upload worker đều cần FFmpeg; nếu máy API thiếu FFmpeg, bản ghi mới dùng luồng ghi trực tiếp và không có Pause/Resume.

Đặt `LIVEKIT_RECORDING_TEMPLATE_URL=http://frontend-web:3000/recording-template` khi frontend chạy cùng Docker network, hoặc `http://host.docker.internal:3000/recording-template` khi frontend chạy trên máy. URL phải được Chrome của Egress truy cập được; dùng frontend production cho triển khai thực tế. LiveKit truyền `url`, `token`, `layout` vào trang này. Trang không khởi tạo đăng nhập, notification manager hoặc toast của ứng dụng. Không thêm analytics vào route chứa room token. URL này bắt buộc; để trống sẽ báo dịch vụ ghi chưa được cấu hình.

Các migration bổ sung: `20261009000300_recording_sessions` thêm enum/segments/settings, rồi `20261009000400_recording_sessions_constraint` cập nhật unique phiên hoạt động. Hai migration tách riêng vì PostgreSQL yêu cầu commit enum mới trước khi dùng trong index. Áp dụng qua quy trình migration đã có baseline; script development ở phần Database cũng hỗ trợ schema mới, không reset dữ liệu.

| API mới | Nội dung |
|---|---|
| `POST /api/meetings/:joinToken/recordings/:id/pause` | 202; dùng `Idempotency-Key`; host/co-host hoặc người khởi tạo còn grant và JOINED |
| `POST /api/meetings/:joinToken/recordings/:id/resume` | 202; cùng quyền; chỉ khi PAUSED, còn thời lượng và encoder capacity |
| `PATCH /api/meetings/:joinToken/recordings/settings` | Host JOINED; body `{ "autoRecord": true, "layout": "speaker" }`; settings cho lần ghi tiếp theo |

API tạo/sửa lịch họp và tạo họp tức thì nhận `autoRecord` và `recordingLayout`. Có checkbox trước khi tạo/lên lịch; host cũng sửa được trong “Rec. setup” ở phòng. Auto-record bắt đầu một lần khi host kết nối thật vào LiveKit; đối soát mỗi 30 giây khi bỏ lỡ webhook hoặc bật setting trong phòng. Lịch sử ghi được kiểm tra lại trong transaction để tránh tự ghi lại sau Stop thủ công; Record thủ công vẫn tạo phiên mới.

Pause hiển thị PAUSING đến khi Egress dừng và S3 xác nhận đoạn hiện tại. Resume tạo Egress mới, giữ recording ID/owner/ACL và thời lượng các đoạn trước. Đồng hồ không tính khoảng Pause; số lẻ thời lượng đoạn được giữ đến khi cộng tổng. Tối đa 100 đoạn mỗi phiên; giới hạn thời lượng tính phần thực sự ghi. Pause/Resume cần thời gian dừng/khởi động Egress, chưa có cam kết độ trễ bằng Zoom.

Một đoạn không quá 5 GiB được copy trong S3 sang key cuối. Nhiều đoạn hoặc đoạn lớn hơn dùng download dạng stream, FFmpeg concat `-c copy` với cùng preset H264/AAC 720p/30 và MP4 faststart, rồi multipart upload có checkpoint. Nhóm upload nhận một RECOVER/MERGE mỗi process; Start/Stop vẫn chạy độc lập. Volume cần đủ chỗ cho các đoạn còn thiếu và file ghép, cộng 256 MiB dự phòng; filesystem phải hỗ trợ hard link (volume Docker Linux/NTFS thông thường). Tệp tạm riêng cho mỗi lần thử, publish cache bằng hard link độc quyền để lần thử chồng nhau không ghi đè file đã hoàn tất. Commit COMPLETED kiểm tra lease trong transaction và đồng thời tạo job NOTIFY/CLEANUP. Chỉ dọn các đoạn S3/backup/work sau khi file cuối được xác nhận; FAILED giữ dữ liệu để phục hồi hoặc chủ sở hữu xóa. Theo dõi dung lượng và dọn tệp tạm mồ côi do crash theo chính sách vận hành.

Template dùng `@livekit/egress-sdk` gửi tín hiệu ghi, `livekit-client` và components đã có để nhận media. Active speaker đổi sau 1 giây ổn định; gallery tối đa 25 ô. Speaker/grid giữ camera ngay cả khi có người chia sẻ màn hình, chỉ nhận âm thanh micro. Khi tất cả tắt camera, bản ghi vẫn có avatar và âm thanh. Chỉ bố cục `screen` được chọn rõ ràng mới ghi màn hình và âm thanh chia sẻ; không có người chia sẻ thì hiển thị chờ. `LIVEKIT_RECORDING_TEMPLATE_URL` là bắt buộc cho mọi bố cục; thiếu cấu hình sẽ tắt khả năng ghi thay vì dùng template mặc định có thể thu desktop.

Nghiệm thu thêm: ghi → Pause → đợi PAUSED → Resume → đổi người nói/trình chiếu → Stop; xác nhận chỉ một MP4 và không có khoảng Pause. Thử Stop/end meeting khi PAUSING hoặc PAUSED, thu hồi grant trước Resume, cạnh tranh capacity, bật auto-record trước khi host vào và kiểm tra không tự ghi lại sau Stop. Thử restart giữa ghép/upload và kiểm tra dọn storage khi Egress trả output muộn sau khi bản ghi đã xóa.

## Xin quyền ghi từ thành viên

- Thành viên chưa có quyền bấm **Ask to record**; nút đổi thành **Request pending** và không cho gửi lặp. Host nhận popup tên người xin quyền, chọn **Allow recording** hoặc **Decline**. **Later** đóng tạm popup, mở lại qua nút **Requests**.
- Chấp nhận chỉ cấp `canRecord`; thành viên nhận thông báo và phải bấm Record để bắt đầu. Chủ sở hữu bản ghi và ACL xem/tải vẫn theo quy tắc hiện có. Host cũng có thể duyệt thủ công từ menu participant; hàng chờ được cập nhật tương ứng.
- `POST /api/meetings/:joinToken/recordings/permission-requests`: yêu cầu của participant JOINED, chưa có quyền. Request đang chờ được trả lại, không emit lại. Request mới cách nhau ít nhất 60 giây; hạn xử lý 2 phút.
- `PATCH /api/meetings/:joinToken/recordings/permission-requests/:requestId`: body `{ "approve": true }` hoặc false. Chỉ host hiện tại JOINED được duyệt; co-host không có quyền duyệt. Quyết định cùng giá trị có thể gọi lại; quyết định ngược hoặc request cũ/hết hạn trả 409; request khác phòng/không tồn tại trả 404.
- Status trả request của chính người gọi; danh sách chờ kèm tên chỉ trả cho host, tối đa 50 request mỗi lần theo thứ tự đến. Sau duyệt, hàng chờ tải tiếp. Socket chỉ thông báo có thay đổi; reconnect tải lại status; request đang chờ polling 3 giây khi mất socket, 30 giây khi socket khỏe, kèm timer hết hạn/cooldown riêng.
- Duyệt dùng khóa meeting và participant trong transaction, kiểm tra lại host/status/role/request ID. Rời phòng, bị loại, đổi role, kết thúc phòng xóa request ID; timestamp được giữ để hạn chế spam sau reconnect. Request của lần tham gia trước không được duyệt.

Kiểm chứng đợt bổ sung xin quyền: 170/170 kiểm thử backend đạt (28 suites, gồm FFmpeg thật); build backend/frontend và 9/9 kiểm thử frontend đạt. Lint các file thay đổi không còn lỗi; file phòng họp còn hai cảnh báo ép kiểu `any` cũ ở luồng publish chat. Chromium với hai phiên host/member xác nhận gửi/chờ/từ chối/gửi lại/chấp nhận, popup Later/mở lại, thông báo thành viên, mobile không tràn viewport và không tự khởi động ghi. API/signalling là fixture; fixture giữ riêng timeout chờ JoinResponse của SDK để kiểm tra UI, không xác nhận kết nối media thật. Năm migration chạy trên PGlite, kiểm tra thêm nullable defaults, UUID request unique và index hàng chờ; chưa áp vào database dự án.

Để tự thử: cập nhật schema qua quy trình Database ở trên, khởi động lại backend/frontend, đăng nhập host và participant ở hai trình duyệt, vào cùng phòng rồi bấm Ask to record phía participant. Thử cả Decline/Allow recording, rời phòng trước khi duyệt, chờ hết hạn, chuyển host và reconnect. Dependency audit hiện vẫn còn 19 cảnh báo frontend/18 backend (mỗi bên 2 critical), không có thay đổi dependency trong đợt xin quyền này.

## Tối ưu ngày 10/10/2026

Branch `feature/recording-performance` giữ nguyên contract quyền ghi/xem/tải. Không thêm dependency.

- Template đặt `autoSubscribe: false`, chỉ nhận video được chọn cho bố cục. Gallery nhận tối đa 25 camera; speaker nhận camera người đang nói và tối đa 5 camera phụ. Hai bố cục này chỉ nhận audio micro, không đăng ký video hay audio chia sẻ màn hình. Screen-only nhận một video màn hình và toàn bộ audio cuộc họp. `adaptiveStream` dùng kích thước tile với pixel density 1; hiệu quả còn phụ thuộc simulcast/chất lượng mà bên phát cung cấp. `VideoTrack` gắn trước khi subscribe hoàn tất để adaptive stream có kích thước hiển thị, và không tự quản lý subscription cạnh tranh với hook.
- List/detail/playback chỉ lấy ACL của người gọi với `userId`/`canDownload`; trang quản lý quyền lấy toàn bộ ACL và ghép tên bằng Map. Xóa lấy ID người nhận sau khi khóa bản ghi để thông báo cả người vừa được chia sẻ trước khóa.
- Chia sẻ cho người tham dự dùng một transaction: khóa meeting, recording và participant đủ điều kiện; kiểm tra tất cả tài khoản; UPSERT theo lô 500 người. Lỗi hủy toàn bộ, thông báo sau commit. Khóa recording ở thu hồi ngăn ghi ACL xen kẽ với chia sẻ/xóa. Giữ lịch sử tham gia trước thời điểm dừng, loại người bị REMOVED và người chỉ tham gia sau đó.
- Áp dụng migration mới `20261010000100_recording_access_performance` qua quy trình migration có baseline, sau năm migration recording ngày 09/10. Index `meeting_events_recording_attendees_idx` hỗ trợ lọc lần tham gia trước khi dừng. Chưa áp dụng vào database dự án trong phiên này.

Bằng chứng: 184/184 backend tests (29 suites, có FFmpeg thật), 12/12 frontend tests, production build hai bên và lint tất cả file code thay đổi đạt. Test subscription dùng `RemoteTrackPublication` của LiveKit SDK thật với 60 camera/60 audio: gallery nhận 25 camera, đổi sang screen-only bỏ toàn bộ camera, đổi người nói/ngừng trình chiếu cập nhật đúng và bố cục không đổi không gửi lệnh subscribe lặp. Sáu migration chạy trên PostgreSQL/PGlite. SQL của service đã build chạy với 1.001 người nhận: 3 UPSERT theo lô, 8 truy vấn trong transaction (chưa tính đọc quyền ban đầu/commit), giữ ID ACL khi gọi lại, cập nhật quyền tải và không cấp dở dang khi thiếu tài khoản.

Chromium production với API/socket fixture xác nhận: popup host/member không đổi; socket khỏe không polling 3 giây, timer hết hạn/cooldown cập nhật đúng, burst sự kiện chỉ tải lại một lần, mất socket khôi phục polling nhanh. Đây là bằng chứng hành vi và số truy vấn, chưa phải benchmark CPU/RAM/băng thông hoặc nghiệm thu MP4 Egress/S3 thật. Audit chạy lại vẫn có frontend 19/backend 18 cảnh báo, mỗi bên 2 critical; cần xử lý trước production.

Rà clean code bổ sung ngày 10/10: tiện ích lỗi frontend chuyển sang `utils/recording-errors.ts`, bảy mutation dùng chung handler lỗi; chia sẻ một tài khoản tái sử dụng hàm khóa/kiểm tra owner, UPSERT attendee có hàm riêng và batch/timeout/cooldown có tên. Không đổi API hoặc số truy vấn theo lô. 187/187 backend tests (29 suites, có FFmpeg thật), 12/12 frontend tests, build/lint phần thay đổi đạt; SQL compiled service với 1.001 người nhận và Chromium popup/polling/deadline/socket chạy lại thành công. Chưa kết luận toàn dự án đạt clean code; service điều phối recording vẫn còn lớn.

## Bằng chứng kiểm tra trước khi bổ sung xin quyền

- Backend: production build và 146/146 kiểm thử Jest đạt (27 suites); có quyền/JWT/DTO, Pause/Resume/idempotency, auto-record/capacity và race sau Stop, duration cộng số lẻ, lease khi commit, xóa output muộn, multipart resume và phục hồi hàng đợi. Kiểm thử tích hợp dùng file thật 110 MiB qua AWS SDK và HTTP S3 giả lập; FFmpeg thật ghép hai clip H264/AAC 1 giây cách nhau 59 giây, kiểm tra đủ hình/âm thanh, duration khoảng 2 giây, faststart, cache retry và hai lần ghép chồng nhau. Đây không phải upload AWS S3 thật hoặc benchmark production. Chạy Jest media với `RECORDING_FFMPEG_PATH` trỏ đến FFmpeg; khi không cấp binary, suite media được skip rõ ràng.
- Frontend: production build/typecheck, lint phần thay đổi; kiểm thử Chromium desktop/mobile cho thư viện, trạng thái rỗng, chia sẻ xem/tải và thu hồi bằng API giả lập. Bài thử tối ưu dùng MP4 do Chromium tạo và HTTP Range giả lập: prefetch không ngắt stream, gia hạn khi seek/lỗi giữ vị trí và trạng thái phát, thu hồi quyền ẩn video; socket kết nối giảm polling, gom sự kiện và mất kết nối khôi phục polling.
- Frontend ghi cốt lõi: `npm.cmd run test:recording` đạt 9/9 kiểm thử lựa chọn camera/screen share/screen-only và đồng hồ Pause. Chromium trên bản production xác nhận room controls lưu settings, Pause/Resume giữ ID và đồng hồ, Stop chuyển Processing, mobile không tràn viewport. Route template hợp lệ/không có token không gọi API account, không có toaster/redirect. Media signalling và API trong bài Chromium là fixture, chưa chứng minh template nhận media thật từ SFU.
- Cả bốn SQL migration chạy trên PostgreSQL WASM (PGlite) từ schema trước thay đổi: backfill, BigInt trên 5 GB, unique phiên hoạt động kể cả PAUSED, ACL/job/checkpoint JSONB, số lẻ thời lượng đoạn và defaults an toàn. Chưa áp migration vào database của dự án.
- Docker Compose được kiểm tra cấu trúc; Docker daemon chưa chạy và cấu hình LiveKit còn thiếu. Chưa xác nhận MP4/âm thanh/screen share, seek và upload lớn từ Egress image đã pin tới S3 thật. Các bước thử ở trên vẫn cần nghiệm thu trên môi trường đầy đủ.
- Dependency audit chưa đạt: frontend 19 cảnh báo (2 critical), communication-service 18 (2 critical). Lockfile chỉ thêm `@livekit/egress-sdk@0.2.1`, không đổi các dependency nền; chưa thực hiện nâng cấp hàng loạt. Cần xử lý dependency và chạy regression trước khi triển khai production.

Nguồn cấu hình: [LiveKit Egress](https://docs.livekit.io/transport/self-hosting/egress/), [Egress backup storage](https://github.com/livekit/egress/blob/main/README.md), [Chrome seccomp profile](https://github.com/livekit/egress/blob/main/chrome-sandboxing-seccomp-profile.json).
