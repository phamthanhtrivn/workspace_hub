# Kiểm tra AI Service — 27/10/2026

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
