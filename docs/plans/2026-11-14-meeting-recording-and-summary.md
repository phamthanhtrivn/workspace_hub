# Kế hoạch khôi phục meeting recording và AI summary

Ngày: 14/11/2026. Trạng thái: đã triển khai; kết quả kiểm chứng bên dưới. Các checklist tiếp theo giữ lại nội dung kế hoạch gốc, không thay thế báo cáo kiểm thử thực tế.

## Kết quả triển khai

- Đã chạy Egress và storage initializer, mở health port chỉ trên loopback, cấu hình health URL cho Communication và kiểm tra speech/jobs worker sẵn sàng.
- Đã sửa URL template local từ `/meetings/recording-template` sang route thật `/recording-template`. Route gốc đã tồn tại từ khi thêm tính năng; không có bằng chứng một commit gần đây xóa route này.
- Đã bổ sung ICE loopback candidates cho LiveKit local: browser Windows dùng cổng publish, Egress vẫn dùng mạng Docker. Trước thay đổi, publisher tổng hợp không thiết lập được media connection; sau thay đổi đã kết nối được.
- Đã xác minh template không hydrate trong Next dev với cả Turbopack và webpack, kể cả sau khi restart/làm mới cache; bản production vẫn hoạt động. Tắt riêng `experimental.reactDebugChannel` khôi phục hydration và tín hiệu `START_RECORDING`; giữ Turbopack mặc định. Commit `4f75ca59` nâng Next từ 16.2.9 lên 16.4.3 là mốc liên quan, chưa phải kết luận từ git bisect về commit gây lỗi đầu tiên.
- Đã tách readiness, hiển thị trạng thái Starting/Recording/Processing, xử lý capture mất trước hoặc trong Start, nạp lại dispatch checkpoint sau khi claim job và thêm diagnostic log được lọc.
- Đã tách summary orchestration khỏi controller, thêm availability tương thích payload cũ, kiểm tra heartbeat/speech health, giữ owner-triggered summary và sửa disclosure về speech worker local.
- Smoke test thực tế qua LiveKit, Egress, S3 và service/worker với DB: bản production ghi 8 giây, bản Next dev Turbopack ghi 7 giây; đều Completed, file MP4 không rỗng và playback HTTP 206. FFprobe xác nhận H.264 1280×720 + AAC 44.1 kHz; phép đo âm lượng xác nhận có tín hiệu âm thanh tổng hợp.
- Regression test dùng mock cho quyền, readiness, Start/Stop/replay, upload verification, segment merge, UI/capture race, STT checkpoint/retry, model summary và thu hồi quyền. Không gọi model thật hoặc gửi media cuộc họp thật.
- Kết quả: 36 test tập trung pass (23 Communication, 5 AI, 8 frontend); build cả ba ứng dụng và typecheck frontend pass. Compose hợp lệ; Egress healthy, storage initializer exit 0, AI API ready và summary processing available. Communication và Next dev đã được chạy lại với cấu hình mới.
- Host chưa có FFmpeg trên PATH hoặc đường dẫn FFmpeg cấu hình. Ghi một segment đã kiểm chứng thực tế; pause/resume ghép nhiều segment được kiểm bằng mock, cần FFmpeg host để nghiệm thu thực tế chức năng này.
- Bản FAILED cũ được giữ nguyên. Các phòng, bản ghi, object S3, browser profile, script và media kiểm thử tổng hợp được dọn sau nghiệm thu; không reset DB hoặc xóa volume recording.

## 1. Phạm vi đã thống nhất

- Môi trường mục tiêu: local, backend Communication chạy trên host; LiveKit, Egress và AI chạy qua Docker theo cấu hình hiện có.
- Khôi phục luồng Start → Recording → Stop → Processing → Completed, xem và tải bản ghi theo quyền hiện tại.
- Chủ bản ghi chủ động bấm **Summarize with AI** sau khi recording Completed. Không tự tạo summary khi Stop, mở player hoặc tải lại trang.
- Người được chia sẻ chỉ xem summary theo quyền truy cập bản ghi hiện có; không được tự khởi tạo hoặc retry xử lý AI.
- Giữ tab capture của ứng dụng, âm thanh cuộc họp, recording permission request, pause/resume, chia sẻ và owner hiện tại. Không đổi kiến trúc ghi hình.
- UI tiếp tục dùng tiếng Anh, component và theme sẵn có.

## 2. Kết quả điều tra và giới hạn kết luận

### Đã xác minh

- Docker local có LiveKit và speech worker nhưng không có container `wh_livekit_egress`, kể cả container đã dừng.
- DB mà Communication local sử dụng chỉ có một recording ngày 10/11/2026: `FAILED`, `failureCode=START_UNCONFIRMED`, không có `startedAt`, không có Egress ID hoặc segment; job START thất bại sau 13 attempts. Không có recording Completed để tái hiện việc mất nút summary.
- API Start tạo recording ở trạng thái `STARTING` và giao việc cho worker. Kiểm tra `listRecordings()` chỉ xác minh gọi được LiveKit API; không chứng minh có Egress sẵn sàng thực hiện ghi hình.
- Frontend hiện coi mọi recording đang hoạt động là `active`, kể cả `STARTING`; cách trình bày dễ khiến người dùng hiểu đã bắt đầu ghi.
- API trạng thái summary của AI local đang phản hồi; hai khóa Communication ↔ AI trong cấu hình được kiểm tra khớp nhau. Chưa chạy tạo summary thật hoặc xác minh toàn bộ pipeline AI.
- UI summary vẫn được mount trong recording player. UI trả `null` khi `enabled=false`; quyền tạo summary phụ thuộc owner và recording Completed.
- UI hiện nói gửi âm thanh tới Google, trong khi `speech.client.ts` gọi speech worker local; bản transcript sau đó đi qua model tóm tắt đang cấu hình.

### Lịch sử commit liên quan

| Commit | Thay đổi đã đối chiếu | Kết luận |
| --- | --- | --- |
| `64768c84` | Thêm Egress dưới Docker profile `recording`; có logic `START_UNCONFIRMED` | Dependency này đã tồn tại từ lúc xây tính năng, không phải bị xóa ở commit mới nhất |
| `5d1344a9` | Thêm summary do owner khởi tạo cho recording Completed | Giữ hành vi này |
| `affe9179` | Tách khóa `COMMUNICATION_TO_AI_KEY` và `AI_TO_COMMUNICATION_KEY`; chỉnh UI summary | Cấu hình đã kiểm tra khớp; chưa có bằng chứng thay đổi này gây lỗi đang gặp |
| `b04ee78b` | Bổ sung kiểm tra idempotency khi Start và kiểm tra lại quyền playback | Chưa có bằng chứng gây lỗi Stop/finalization |

Thiếu Egress hiện tại phù hợp với bản START chưa được xác nhận, nhưng chưa chứng minh được hạ tầng ngày 10/11. Không gán lỗi cho một commit hoặc rollback khi chưa có ca tái hiện. Người dùng xác nhận chưa thấy recording thành công; việc thiếu nút AI chưa được xác minh độc lập trên bản Completed.

## 3. Thứ tự triển khai

### Bước 1 — Khôi phục và kiểm chứng dependency local

- [ ] Kiểm tra Compose hợp lệ bằng `config --quiet`; không in cấu hình đã expand chứa secrets.
- [ ] Bật profile `recording` để chạy Egress và storage initializer. Giữ nguyên project, volume, Redis, LiveKit và các credential đang dùng; không dùng `down -v`.
- [ ] Xác minh initializer exit 0, Egress healthy, kết nối đúng Redis/LiveKit và credential khớp.
- [ ] Kiểm tra từ đúng runtime: Egress truy cập được recording template trên frontend host và webhook trên Communication host; host truy cập được S3.
- [ ] Kiểm tra FFmpeg trên host cho pause/resume và ghép nhiều segment; phân biệt dependency ghi một segment với dependency ghép nhiều segment.
- [ ] Dùng cuộc họp kiểm thử và dữ liệu tổng hợp để tái hiện Start/Stop. Phân loại lỗi trước/sau khi Egress nhận job, tải template, capture, upload S3, verify và merge; chỉ sửa nhánh đã có bằng chứng lỗi.
- [ ] Cập nhật hướng dẫn local có lệnh bật recording và kiểm tra health. `RECORDING_BACKUP_ROOT` chỉ dùng nếu host thực sự đọc được đường dẫn backup; không gán đường dẫn Docker volume giả cho host.

Lệnh chạy từ repository root:

```powershell
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml --profile recording config --quiet
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml --profile recording up -d livekit livekit-egress
docker compose --env-file backend/docker/.env -f backend/docker/docker-compose.host.yml --profile recording ps -a
```

### Bước 2 — Tách cấu hình, readiness và trạng thái ghi thực tế

- [ ] Giữ `isRecordingConfigured()` cho kiểm tra cấu hình; tách kiểm tra dependency sẵn sàng khỏi kiểm tra biến môi trường.
- [ ] Bổ sung probe health Egress phía backend qua URL cấu hình theo runtime, với timeout và cache ngắn. Local chỉ publish health port trên loopback; production dùng mạng nội bộ. Không cho frontend truy cập Docker socket hoặc tự truyền URL probe.
- [ ] Health chỉ là kiểm tra ban đầu, không bảo đảm còn capacity hoặc request sẽ thành công. Worker vẫn xử lý việc Egress mất kết nối hoặc từ chối nhận job sau preflight.
- [ ] API status và Start dùng cùng kết quả readiness để báo lỗi có mã ổn định, tránh cho phép Start chỉ vì LiveKit API còn sống. Giữ permission check trước khi trả thông tin vận hành chi tiết.
- [ ] UI hiển thị `Starting…` trong lúc chưa xác nhận ghi, `Recording` khi Egress thực sự active, `Processing…` sau Stop; chỉ báo hoàn tất khi backend xác minh output thành công.
- [ ] Khi Start bị từ chối, người dùng hủy picker hoặc không được cấp quyền: dọn capture track và permission tạm, cho phép thử lại.
- [ ] Khi người dùng Stop lúc còn Starting, xử lý như yêu cầu dừng/hủy đang chờ; không giả vờ có file hoặc chuyển sang Completed.
- [ ] Tách thông báo thiếu cấu hình, Egress unavailable, capture mất, upload/merge lỗi và processing timeout. Không đưa secrets, signed URL hoặc lỗi nội bộ thô ra UI.

### Bước 3 — Làm chắc luồng Stop và hoàn tất

- [ ] Đối chiếu state machine của webhook, polling reconciliation, START/STOP job và segment merge; giữ version/lease/idempotency hiện có.
- [ ] START timeout có kết quả chưa rõ phải reconcile trước khi dispatch lại, tránh sinh hai Egress cho một recording/segment.
- [ ] Xử lý Stop lặp, Stop đồng thời, webhook lặp/sai thứ tự, Egress kết thúc trước phản hồi Stop và worker restart bằng cùng state machine.
- [ ] Khi recording kết thúc: kiểm tra object tồn tại, size hợp lệ và segment đủ; một segment dùng nhánh copy hiện có, nhiều segment ghép đúng thứ tự rồi verify trước Completed.
- [ ] Lỗi tạm thời dùng retry có backoff và giới hạn phù hợp; giữ dữ liệu để phục hồi. Lỗi terminal có nguyên nhân rõ và kết thúc trạng thái chờ trên UI.
- [ ] Bổ sung log có recording/job/Egress ID, stage, attempt và mã lỗi được lọc. Không log media, transcript, token, credential hoặc URL có chữ ký.
- [ ] Dọn capture/permission khi kết thúc, lỗi terminal hoặc rời phòng; không dọn sớm trong lúc video vẫn đang được ghi. Giữ hành vi pause/resume.
- [ ] Bản FAILED cũ không tự chuyển Completed hoặc tự ghi lại. Nếu không có video/segment thực tế thì thông báo cần tạo recording mới; chỉ phục hồi khi có output xác minh được.

### Bước 4 — Làm rõ AI summary và giữ kích hoạt thủ công

- [ ] Kiểm tra đủ Communication → AI API → jobs worker/heartbeat → speech worker → model tóm tắt → DB; status API thành công không được coi là pipeline đã được kiểm chứng.
- [ ] Tách trạng thái disabled, dependency unavailable, chưa đủ điều kiện tạo và không có quyền tạo trong response typed. Các trường mới tương thích client cũ; business rule nằm ở service/helper, controller giữ mỏng.
- [ ] Trong player, hiển thị phần **Meeting summary** với thông báo phù hợp khi tính năng tắt hoặc dịch vụ unavailable, thay vì âm thầm mất toàn bộ section. Không che nội dung video khi AI lỗi.
- [ ] Owner + recording Completed hợp lệ: hiện **Summarize with AI**; đang chạy: hiện stage và khóa tạo thêm; thất bại: owner có **Retry summary**; đã hoàn tất: hiện nội dung đã lưu.
- [ ] Người có quyền xem bản ghi có thể đọc summary đã tạo; người bị thu hồi quyền không xem được hoặc tiếp tục xử lý. Người chưa đủ quyền tạo không thấy nút có thể bấm.
- [ ] Chống double click, nhiều tab và request replay bằng cơ chế job/run hiện có; không tạo thêm job/model call khi đang chạy hoặc kết quả cùng revision đã hoàn tất. Retry giữ checkpoint tương thích và kiểm tra lại quyền.
- [ ] Sửa disclosure đúng pipeline: âm thanh được xử lý bởi speech worker local; transcript gửi model AI đã cấu hình để tóm tắt, có thể phát sinh chi phí từ nhà cung cấp model. Không khẳng định gửi audio tới Google.
- [ ] Giữ cảnh báo AI có thể sai, timestamp gần đúng, chưa nhận diện người nói từ mixed audio; giữ nội dung có xuống dòng và khả năng đọc trên màn nhỏ/sáng/tối.

## 4. Kiểm thử và điều kiện nghiệm thu

Thêm regression test có giá trị lâu dài vào cấu trúc test hiện tại; test lỗi phải tái hiện trước khi sửa nhánh tương ứng. Không dựng thêm test framework hoặc script vận hành chỉ phục vụ một lần.

| Nhóm | Ca bắt buộc | Kết quả mong đợi |
| --- | --- | --- |
| Readiness | Thiếu Egress, LiveKit API vẫn sống; health timeout; config thiếu | Start bị chặn hoặc kết thúc với lỗi rõ, không báo đang ghi thành công |
| Happy path | Cuộc họp kiểm thử có tiếng nói và video tổng hợp, Start rồi Stop | Có RECORDING thực tế, file Completed không rỗng, playback có hình/tiếng, download theo quyền |
| Capture | Hủy picker, chọn nhầm tab, quyền bị từ chối, track ended, rời phòng | Không rò track/permission; trạng thái và thao tác tiếp theo đúng |
| Ordering | Stop khi STARTING, Stop lặp/đồng thời, START response timeout, webhook lặp/đảo thứ tự | Không tạo hai job ghi thực tế, không Completed giả, không kẹt vô hạn |
| Recovery | Worker restart khi recording/processing; upload lỗi rồi phục hồi; thiếu segment | Reconcile tiếp tục an toàn; chỉ Completed khi output hợp lệ |
| Pause/resume | Một segment; nhiều segment; FFmpeg thiếu; merge lỗi | Copy/merge đúng, lỗi rõ, không mất segment trước khi có output hợp lệ |
| Summary UI | Owner/non-owner, disabled/unavailable, NOT_CREATED/RUNNING/FAILED/COMPLETED | Nút và thông báo đúng; video vẫn sử dụng được khi AI lỗi |
| Summary job | Double click, nhiều tab, replay, lỗi STT/model, restart giữa checkpoint | Không chạy trùng; retry có kiểm soát; không tự gọi model khi mở trang |
| Access | Thu hồi chia sẻ, user khác, recording chưa Completed, signed URL hết hạn | Giữ quyền phía backend; không lộ media/summary; refresh playback theo quyền |

- [ ] Unit/integration test mock Egress, S3, STT và model cho các nhánh lỗi, permission và race condition.
- [ ] Chạy test tập trung, typecheck/build cho Communication, AI API và frontend theo phần thực sự thay đổi; kiểm tra Compose.
- [ ] Chạy smoke test recording bằng dữ liệu tổng hợp có hình/tiếng. Không ghi cuộc họp thật đang diễn ra để thử nghiệm.
- [ ] Xác minh summary xuyên suốt bằng fixture/mock trước. Chạy model thật chỉ từ thao tác chủ bản ghi trên nội dung kiểm thử, không chạy ngầm lúc mở player.
- [ ] Xóa script, media và file kiểm tra tạm không còn giá trị; giữ regression test và tài liệu vận hành hữu ích. Không xóa dữ liệu người dùng hoặc volume.
- [ ] Báo rõ phần đã kiểm chứng thực tế và phần mới kiểm bằng mock; không ghi nhận end-to-end thành công chỉ từ HTTP status/health.

## 5. File dự kiến và chia commit

Giữ thay đổi tập trung trong các khu vực đang sở hữu tính năng:

- Hạ tầng/tài liệu: `backend/livekit/`, `backend/docker/`, `docs/local-development.md`.
- Recording backend: `backend/communication-service/src/infrastructure/livekit/`, `src/modules/meeting/services/meeting-recording*`, DTO/types/utils liên quan.
- Summary backend: `backend/communication-service/src/modules/meeting/meeting-summary.controller.ts` và service/helper tách theo trách nhiệm; `backend/ai-service/api/src/modules/meeting-summary/`, worker chỉ khi tìm thấy lỗi liên quan.
- Frontend: controls, player, summary trong `frontend/web/features/meeting/components/`; hooks, API và types tương ứng.
- Không mặc định cần migration. Nếu cần lưu diagnostic/delivery state mới, bổ sung migration tương thích và test dữ liệu mẫu trong bước sửa tương ứng; không tự reset DB.

Commit message dự kiến, điều chỉnh theo diff thực tế:

1. `fix(meetings): verify recording readiness and clarify startup state`
2. `fix(meetings): harden recording stop and finalization recovery`
3. `fix(meetings): clarify manual AI summary availability and processing`

Mỗi đợt thay đổi báo lại commit message để người dùng tự commit; không tự commit hoặc push.
