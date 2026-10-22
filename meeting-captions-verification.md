# Phụ đề trực tiếp WhisperLiveKit — 12/10/2026

Đã tích hợp WhisperLiveKit 0.2.26 vào phòng LiveKit hiện tại. Người dùng bật/tắt hiển thị bằng nút CC. Dịch vụ Python tự host nhận audio từng micro, hiển thị tên người nói; banner thông báo khi nhận dạng đang hoạt động. Không dùng API nhận dạng trả phí và không gửi audio cuộc họp đến dịch vụ STT bên ngoài.

## Kiểm chứng thực tế

Chromium headless sử dụng hai mẫu giọng tiếng Việt công khai, phát qua micro giả và WebRTC thật. LiveKit, WhisperLiveKit, model Whisper small, CUDA và meeting API đều chạy thật. Lượt cuối từ container mới đã warmup pipeline nhận được phụ đề của cả hai người sau **5,7 giây tính từ lần bấm CC**. Con số này gồm khởi động room worker và chờ câu nói; không phải benchmark độ trễ từng từ hoặc cam kết cho mọi máy.

| Luồng | Kết quả |
|---|---|
| Thiếu bearer token | 401 |
| Người ngoài / chưa vào phòng | 403 |
| Host và member bật CC | Dùng chung worker; nhận hai dòng phụ đề đúng tên người nói |
| Host tắt CC, member vẫn bật | Chỉ ẩn tại host; worker vẫn hoạt động |
| Bật CC lại | Nhận phụ đề tiếp |
| Tắt cả hai micro sau khi đã có chữ | Worker nhận sự kiện mute, dừng xử lý track và xóa dòng phụ đề |
| Bật micro lại | Tạo stream mới, nhận phụ đề tiếp, không bị sequence cũ chặn |
| Reload và vào lại phòng | Bật CC lại và nhận người đang nói |
| Người xem cuối tắt CC | Worker rời phòng |
| Kết thúc meeting khi CC đang bật | Worker ngắt cùng phòng |
| Camera/count | Worker không xuất hiện như người tham gia trên stage hoặc recording template |
| Browser pageerror | Không có |

Đã dọn các tài khoản, snapshot và phòng fixture; giữ screenshot/kết quả JSON trong workspace. Hai audio thử lấy từ [mẫu công khai của VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS/tree/main/examples/audio_ref), không sử dụng audio người dùng. Warmup dùng mẫu công khai mà WhisperLiveKit tải sẵn và chạy toàn bộ PCM/VAD/streaming trước khi báo ready.

## Kiểm thử và kiểm tra mã

- Backend captions: **11 kiểm thử** về auth/membership, live connection, cấu hình, capacity/outage, quyền release, cleanup sau meeting end và response qua global interceptor.
- Python: **11 kiểm thử** về tiếng Việt/giới hạn caption, chia sẻ worker, token, capacity, viewer lease, lỗi kết nối và đúng thứ tự sự kiện mute/unmute của LiveKit SDK.
- Frontend captions: **7 kiểm thử** về packet validation, nhiều người nói, dữ liệu sai thứ tự, stream mới sau unmute và loại worker khỏi participant tiles.
- Recording/screen-share frontend: **12 + 7 kiểm thử** vẫn đạt.
- ESLint, TypeScript, Ruff và `git diff --check` đạt. Backend và image Docker đã build/chạy; không chạy production build frontend.

## Cấu hình đang chạy

- Model `small`, tiếng Việt `vi`; GPU NVIDIA RTX 3050 Laptop 4 GB, precision `int8_float16`.
- CPU có cấu hình INT8/4 threads; chưa chứng minh throughput live nhiều người trên CPU. Bộ streaming của WLK vẫn được giữ, dùng adapter để cấu hình hardware của backend faster-whisper bị cố định trong phiên bản 0.2.26.
- Hai room worker, bốn micro mỗi room là giới hạn cấu hình; chưa load-test tám người nói đồng thời.
- Lease theo người dùng, gia hạn mỗi 20 giây, hết hạn sau 90 giây; không còn người thật thì worker dừng. Nhiều tab cùng tài khoản dùng chung lease hiện tại.
- Micro bị mute được xử lý ngay theo sự kiện SDK. Hàng đợi audio và chiều dài caption có giới hạn; lỗi nhận dạng ngắt worker để lượt gia hạn có thể khởi tạo lại.
- Dịch vụ control chỉ mở trong mạng Docker; cần token nội bộ. Browser chỉ gọi API meeting đã xác thực. Caption packets chỉ nhận từ identity worker của đúng meeting.

## Giới hạn chất lượng và phạm vi

Đây là bản đầu của phụ đề live. Model small vẫn nghe sai một số từ tiếng Việt: câu tham chiếu `ví dụ 2, tính trung bình của dãy số` có lần được nhận thành `Cái dụ 2 kính trung bình của dạy số`. Câu của người nói thứ hai được nhận đúng trong screenshot cuối. Đã lọc kết quả confidence thấp/repetition và giới hạn decoder; vẫn cần đánh giá bằng micro thật, các giọng địa phương, âm thanh nhiễu và từ chuyên ngành. Không khẳng định độ chính xác tương đương Zoom.

Chưa thử thiết bị mobile thật, nhiều room tải cao, mất mạng kéo dài hoặc chạy liên tục nhiều giờ. Reload/rejoin được kiểm chứng; chưa mô phỏng đầy đủ mọi dạng reconnect mạng. Chưa tạo/lưu transcript, VTT/SRT cho recording, dịch phụ đề hoặc ghi chữ trực tiếp vào MP4. Caption live là trạng thái trong bộ nhớ.

[Hướng dẫn cấu hình CPU/GPU](backend/caption-service/README.md) · [Screenshot phụ đề](/E:/KLTN/hoho/.runtime/recording-tests/captions/live-captions.png) · [Kết quả E2E](/E:/KLTN/hoho/.runtime/recording-tests/captions/results.json)

## Cài thư viện Python cục bộ — 13/10/2026

Đã tạo môi trường riêng `.runtime/caption-venv` trong workspace, dùng Python 3.13.2. Đã cài `whisperlivekit==0.2.26`, `livekit==1.1.20`, `livekit-api==1.2.1` theo requirements của dự án, cùng PyTorch/torchaudio bản CPU và phụ thuộc runtime.

`pip check` không có yêu cầu bị xung đột. Import Torch, torchaudio, LiveKit API/RTC, WhisperLiveKit và faster-whisper thành công. Chạy lại toàn bộ 11 kiểm thử Python caption đã qua, bao gồm session, auth, capacity, lease và mute/unmute; lỗi thiếu module `livekit` đã được giải quyết trong môi trường này.

Lượt này không chạy Docker và không khởi động lại nhận dạng live/model warmup. Dùng executable của môi trường riêng để chạy kiểm thử, như hướng dẫn trong README; Python hệ thống không tự chuyển sang môi trường này.
