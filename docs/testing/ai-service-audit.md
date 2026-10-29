# Kiểm tra AI Service — 27/10/2026

## Latest native validation - 29/10/2026

628 automated tests passed, including 35/35 RAG/OCR with no skips. Native Kong/JWT, SQL/Redis/Qdrant, embedding/model, @ai, Meeting summary and recovery scenarios passed. Communication production imports fixed; existing lint debt remains. See [final report](./ai-comprehensive/report.md) and [machine-readable evidence](./ai-comprehensive/results.json). Sections below are historical snapshots.

## Audit toàn diện — 29/10/2026

Đã quét toàn bộ 79 file source, kiểm thử HTTP đủ 25 route, tái hiện và sửa hai lỗi P2 về quyền khi tải lại timezone và khóa cache Studio. Kết quả cuối: 350 test tự động đạt, 5 ca OCR skipped vì thiếu Tesseract; năm ca smoke model thật đạt và pipeline FFmpeg/Whisper thật đạt. Chưa xác minh toàn bộ deployment Kong/Redis/PostgreSQL/Qdrant vì các dịch vụ này không chạy. [Báo cáo đầy đủ](./ai-comprehensive/report.md), [kiến trúc](./ai-comprehensive/architecture.md), [bằng chứng tổng hợp](./ai-comprehensive/results.json).

## Dữ liệu kiểm thử bổ sung — 29/10/2026

Đã bổ sung 81 ca JSON có đáp án độc lập, chín biến thể workspace qua HTTP fixture, 18 tình huống đánh giá model có đáp án JSON, ba tài liệu và một transcript giả lập để thử tay. Toàn bộ AI suite mới đạt 292/292 test, gồm 111 test bổ sung cho hành vi service, tính nhất quán dữ liệu và grader. Build, lint và typecheck đạt. Kết quả này không phải kết quả chạy model thật hay 13 ca giao diện mới.

Hướng dẫn và dữ liệu: [evaluation/README.md](../../backend/ai-service/evaluation/README.md). Trạng thái từng lớp kiểm chứng: [validation.json](../../backend/ai-service/evaluation/validation.json).

## Cập nhật bảo trì — 29/10/2026

Đã khôi phục bộ test từ trước commit `16027e7d`, cập nhật import module và cách gọi Work Assistant/Meeting Summary theo cấu trúc service hiện tại. Bộ AI chạy lại đạt 181/181 test với SQL/HTTP/model fixture. Helper gửi SSE được dùng chung tại `src/common/sse.ts`; lint cũng kiểm tra source, test và script.

Từ `backend/ai-service`, chạy `npm ci`, sau đó:

```powershell
npm run lint
npm run typecheck
npm test
```

`npm test` build trước khi chạy test, ghi kết quả vào `docs/testing/ai-performance/tests.json` và log vào `.tmp/ai-performance/tests.log` tính từ workspace. Runner từ chối bộ test rỗng; runner tổng `node backend/scripts/verify-ai-service.mjs` đã nối lại bước `ai-tests` và thêm `ai-lint`. Các kiểm tra fixture này không xác minh deployment hoặc chất lượng câu trả lời từ provider thật.

Đã tái hiện và sửa ba lỗi trong mã hiện có; kiểm tra bản sửa còn phát hiện một trường hợp mất độ chính xác của cursor, cũng đã sửa. Kết quả dưới đây thuộc môi trường SQL cô lập, nguồn/Auth fixture, giao diện demo và worker nhận dạng giọng nói local. Chưa xác minh toàn bộ deployment thật.

## Lỗi và cách xác minh

| Trường hợp | Bằng chứng trước khi sửa | Thay đổi | Kiểm tra sau sửa |
| --- | --- | --- | --- |
| Phân trang hội thoại bị lặp khi có hoạt động mới | Tạo 35 cuộc, lấy trang đầu 30 cuộc, cập nhật cuộc cuối trang rồi tải tiếp: 29 cuộc trùng trang đầu | Cursor giữ ID và mốc thời gian lúc trả trang, thay vì đọc lại mốc có thể thay đổi | Cả Cá nhân và Project còn đúng 5 cuộc ở trang 2, không trùng; cursor khác chủ bị từ chối |
| So sánh 7/30 ngày thiếu một kỳ | Câu “So sánh hiệu suất 7 ngày và 30 ngày qua” chỉ tải 30 ngày | Tải hai cửa sổ song song, giữ metrics/trạng thái nguồn riêng và kiểm tra quyền của cả hai trước khi lưu | Model nhận 5 và 17 task hoàn thành theo đúng fixture; thu hồi quyền của một kỳ chặn lưu; nguồn thiếu giữ null thay vì 0 |
| Cấu hình STT cho phép vượt khả năng worker | Bật summary với concurrency 2 vẫn khởi động, trong khi worker local chỉ nhận một audio đồng thời và từ chối thêm bằng 429 | Kiểm tra cấu hình sớm: khi bật summary, concurrency phải là 1 | Cấu hình không hợp lệ bị từ chối; khi tắt summary không chặn tính năng khác |
| Cursor mất microsecond khi xác minh bản sửa phân trang | 35 cuộc có timestamp cùng mili giây nhưng khác microsecond: trang 2 trả 0 thay vì 5 | Giữ timestamp PostgreSQL đủ sáu chữ số thập phân, không chuyển qua JavaScript Date khi đóng cursor | Hai trang trả đủ 35 ID khác nhau; giữ tương thích cursor UUID cũ |

Ba ca tái hiện đầu tiên đã thất bại trên mã trước sửa. Ca microsecond cũng được chạy thất bại trước khi sửa tiếp. Bộ hồi quy mới hiện có 8 test, gồm thêm kiểm tra cursor sai định dạng, câu so sánh viết tắt/tiếng Anh và nguồn dữ liệu không đầy đủ.

Mã liên quan: [test hồi quy](../../backend/ai-service/test/audit-regression.test.cjs), [cursor](../../backend/ai-service/src/modules/work-assistant/work-cursor.ts), [SQL hội thoại](../../backend/ai-service/src/modules/work-assistant/work-store.ts), [chuẩn bị ngữ cảnh](../../backend/ai-service/src/modules/work-assistant/work-assistant.controller.ts), [agent](../../backend/ai-service/src/modules/work-assistant/work-agent.ts), [cấu hình](../../backend/ai-service/src/config/env.config.ts). Test Python bổ sung WAV rỗng và bị cắt tại [test_app.py](../../backend/speech-worker/test_app.py).

## Kết quả chạy cuối

| Nhóm | Kết quả | Giới hạn |
| --- | --- | --- |
| TypeScript AI | Build đạt | Không thay thế kiểm tra deployment |
| AI Service | 181/181 test đạt | SQL/HTTP/model được cô lập hoặc mô phỏng theo từng test |
| Frontend SSE và lịch sử | 4/4 test đạt | UTF-8/CRLF bị chia nhỏ, kết nối gián đoạn, lỗi SSE, metadata null |
| Nguồn Project/Calendar | 5/5 test đạt | 4 Project, 1 Calendar; không dùng database người dùng thật |
| Worker giọng nói Python | 6/6 test đạt | Audio hợp lệ/sai, giới hạn, khóa, readiness và đang bận |
| Giao diện demo | 6 nhóm kiểm tra đạt, không có page error | UI/API thật, SQL cô lập, Auth/nguồn fixture, không gọi model |
| Video mẫu công khai → FFmpeg → Whisper local | Đạt, có transcript tiếng Việt | Nhận dạng thật; không gọi cloud STT hay model tóm tắt |
| Deployment đầy đủ | Chưa xác minh | AI 8087 và Communication 8083 không phản hồi khi probe |

Tổng cộng 196 test tự động đạt, ngoài sáu nhóm kiểm tra trình duyệt và lần chạy media thật. Đây là số test của runner, không phải khẳng định mọi câu hỏi hoặc mọi hành vi của model đều đã được kiểm chứng. Không còn test thất bại trong lượt chạy cuối.

Bằng chứng: [báo cáo tổng](./ai-service-audit-results.json), [chi tiết AI](./ai-performance/tests.json), [UI](./work-assistant-simulation/conversation-check.json), [transcript và thời gian xử lý](./meeting-local-speech-results.json). Log từng bước nằm trong `E:/KLTN/hoho/.tmp/ai-service-audit/`.

## Chạy lại và phần còn lại

Từ `workspace_hub`:

```powershell
node backend/scripts/verify-ai-service.mjs --browser --media
```

[Runner](../../backend/scripts/verify-ai-service.mjs) ghi PASS/FAIL/BLOCKED cho từng bước. Trình duyệt cần frontend demo 3100 và backend fixture 18110; media cần worker 8090 và MP4 mẫu đã chuẩn bị. Lần chạy này không gọi provider AI bên ngoài, không thay đổi khóa và không sửa task/lịch/database người dùng thật.

[Bảng 51 kịch bản](./ai-service-test-plan.md) ghi thao tác, kết quả mong đợi và lớp kiểm chứng. Ca live AI50 còn cần đăng nhập qua gateway thật, kiểm tra tóm tắt cuộc họp từ đầu đến cuối, quyền chia sẻ/thu hồi và chất lượng câu trả lời với provider đang dùng. Health probe không chứng minh được những luồng này, kể cả khi trả 200.
