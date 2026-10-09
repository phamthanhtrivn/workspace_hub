# Chạy và kiểm tra meeting recording

Tính năng đã được hiện thực trên branch `feature/meeting-recording`. Host/co-host bấm Record, chọn speaker/grid, mọi người thấy REC và thời gian; Stop chuyển sang Processing. Egress ghép camera, micro và screen share thành MP4 720p rồi upload S3. Người tạo meeting sở hữu file; người bấm Record không tự có quyền xem nếu là tài khoản khác.

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

Frontend dùng socket và gom sự kiện trong 100 ms. Khi socket hoạt động, status đối soát mỗi 30 giây và thư viện ổn định mỗi 60 giây; mất socket lần lượt dùng 5/15 giây. STARTING/PROCESSING kiểm tra nhanh hơn (status 3 giây, thư viện 5 giây); lỗi quyền/tài nguyên dừng polling. Player lấy URL mới trước hạn, giữ URL hiện tại khi stream còn hoạt động và tự đổi khi cần tua/phát lại hoặc gặp lỗi, giữ vị trí và trạng thái phát. Lỗi media lặp trước khi phát được dừng ở một lần retry tự động; người dùng có thể thử lại.

Thông báo hoàn tất/thất bại dùng Kafka hiện có và cơ chế retry ít nhất một lần; khi lỗi một phần có thể gửi lặp thông báo. Chưa có pause/resume cùng file, transcript, auto-record hoặc HLS.

## Kiểm chứng đã thực hiện

- Backend: production build và 111/111 kiểm thử Jest đạt; có kiểm thử quyền, JWT/header giả, DTO/API, thứ tự sự kiện Egress, lệnh bền vững, các nhóm worker độc lập, mất lease, multipart resume và phục hồi hàng đợi sau crash. Kiểm thử tích hợp dùng file thật 110 MiB qua AWS SDK và HTTP S3 giả lập: CRC32, tối đa ba request part đồng thời, lỗi part rồi resume chỉ phần còn thiếu, Complete/HEAD và mất phản hồi. Đây không phải upload tới AWS S3 thật hoặc benchmark RAM/thông lượng production.
- Frontend: production build/typecheck, lint phần thay đổi; kiểm thử Chromium desktop/mobile cho thư viện, trạng thái rỗng, chia sẻ xem/tải và thu hồi bằng API giả lập. Bài thử tối ưu dùng MP4 do Chromium tạo và HTTP Range giả lập: prefetch không ngắt stream, gia hạn khi seek/lỗi giữ vị trí và trạng thái phát, thu hồi quyền ẩn video; socket kết nối giảm polling, gom sự kiện và mất kết nối khôi phục polling.
- SQL migration chạy trên PostgreSQL WASM (PGlite) từ schema trước thay đổi: backfill, BigInt trên 5 GB, unique phiên hoạt động/ACL/job và checkpoint JSONB. Đây không phải migration trên database đang chạy của dự án.
- Docker Compose được kiểm tra cấu trúc. Chưa chạy Egress/S3 thực tế: Docker daemon và database hiện chưa hoạt động, môi trường còn thiếu biến bật recording/webhook. Chưa xác nhận MP4 thật, âm thanh, screen share, seek hoặc hành vi upload lớn của image đã pin. Các bước thử ở trên là phần cần nghiệm thu trên môi trường đầy đủ.

Nguồn cấu hình: [LiveKit Egress](https://docs.livekit.io/transport/self-hosting/egress/), [Egress backup storage](https://github.com/livekit/egress/blob/main/README.md), [Chrome seccomp profile](https://github.com/livekit/egress/blob/main/chrome-sandboxing-seccomp-profile.json).
