# Đo và tối ưu AI Service — 27/10/2026

Lượt kiểm tra tiếp theo đạt 181 test AI và bổ sung kiểm tra nguồn, frontend, Python, UI và media. Xem [báo cáo kiểm tra mới nhất](../ai-service-audit.md). Các số đo trước/sau và kết quả 173 test dưới đây thuộc lượt tối ưu trước; `tests.json` được runner cập nhật theo lượt chạy gần nhất.

Đã tối ưu các điểm tốn CPU, truy vấn và lượt model; giữ nguyên model, hạn mức, dữ liệu thống kê và kiểm tra quyền. Đây là kết quả từ PGlite cô lập và I/O mô phỏng, không phải đo tải production hay tốc độ nhà cung cấp AI.

## Kết quả trước/sau

| Phép đo | Trước | Sau | Ý nghĩa |
| --- | ---: | ---: | --- |
| Đóng gói 100 ngữ cảnh task, median | 43,91 ms | 6,84 ms | Khoảng 6,4 lần nhanh hơn cho bước đóng gói |
| Ảnh: 30 ứng viên, chỉ 2 ảnh cuối còn cache | 30 truy vấn / 12,35 ms | 1 truy vấn / 1,08 ms | Giữ đúng thứ tự, loại trùng và phiên bản cũ |
| Lịch sử SQL cho một câu hỏi | 20 tin / 67.291 byte | 4 tin / 13.459 byte | Giảm khoảng 80% dữ liệu đọc ở fixture; model vốn chỉ dùng 4 tin |
| Chuẩn bị nguồn, I/O mô phỏng | 77,19 ms | 46,87 ms | Đọc lịch sử và ngữ cảnh độc lập cùng lúc |
| Chờ quota hết sau 58 giây, thời gian ảo | 30 lần kiểm tra | 2 lần kiểm tra | Thời gian chờ vẫn là 58 giây; không gọi lại provider |
| Tiêu đề đọc để trả trang 31 hội thoại | 125 | 31 | Giới hạn trang trước khi đọc tiêu đề; dùng index phù hợp |

Median toàn truy vấn danh sách ở dataset nhỏ là 1,63 ms trước và 1,70 ms sau; không coi đây là cải thiện độ trễ. Cải thiện được chứng minh ở số dòng/tiêu đề phải đọc và query plan. Kết quả có thể khác dưới tải thật.

Các mã băm đầu ra của đóng gói ngữ cảnh, tin nhắn gần nhất, danh sách hội thoại và ảnh đều khớp giữa hai lượt. Kiểm thử bổ sung bao phủ biên UTF-8, dấu escape JSON, quyền bị thu hồi và phân trang.

## Thay đổi

- Tính kích thước JSON từng task một lần, thay vì serialize lại toàn bộ danh sách sau mỗi task.
- Giới hạn SQL lấy 4 tin dùng cho model; API xem lại lịch sử vẫn phân trang đầy đủ.
- Đọc các nguồn độc lập song song; tiếp tục xác minh quyền trước khi lưu câu trả lời và hủy các tác vụ còn chờ khi kết thúc.
- Câu hỏi rõ về hôm nay/7 ngày dùng dữ liệu đã tải với một lượt model. Các trường hợp cần đổi cửa sổ vẫn có tool; không chấp nhận tool trái lựa chọn đã gửi.
- Lấy ảnh bằng một truy vấn theo đúng nguồn/phiên bản, giữ hai ảnh hợp lệ đầu tiên.
- Lọc phạm vi hội thoại bằng điều kiện dùng được index; lấy trang trước, rồi mới đọc tiêu đề. Migration 005 thêm index cho câu hỏi đầu tiên.
- Quota trả thời điểm có lượt cũ hết hạn; chat/tóm tắt chờ thời điểm đó thay vì kiểm tra mỗi 2 giây hoặc chờ cứng 60 giây. Giữ giới hạn theo phút ngay cả qua 00:00 UTC.
- Ghi số đo history/context/model/persist trong log, không ghi câu hỏi hoặc dữ liệu task.
- Giới hạn concurrency bộ test ở 2 để tránh cạn RAM do nhiều PGlite chạy cùng lúc.
- Khôi phục script cấu hình khóa AI bị thiếu. Script chỉ được thử trên .env giả lập; không chạy trên cấu hình thật. Test redirect video mô phỏng dung lượng ổ đĩa để không phụ thuộc dung lượng ổ C.

## Kiểm chứng

- TypeScript build: đạt.
- Toàn bộ AI Service: **173/173 test đạt**.
- Test mới xác nhận quota qua 00:00 UTC, không phát sinh provider call khi chỉ chờ quota, quyền khi đọc song song, thứ tự ảnh, lịch sử 4 tin và câu hỏi rõ chỉ gọi model một lần.
- Báo cáo: [trước](./before.json), [sau](./after.json), [toàn bộ test](./tests.json).
- Kiểm tra giao diện demo: [danh sách/tạo hội thoại](../work-assistant-simulation/conversation-check.json).

## Chạy lại

Từ thư mục `workspace_hub`:

```powershell
cd backend/ai-service
npm.cmd run build
node scripts/benchmark-performance.cjs after
cd ../..
node backend/scripts/test-ai-service.mjs
```

`before.json` được đo trước khi sửa mã. Chế độ `before` của benchmark chỉ có ý nghĩa khi chạy phiên bản mã trước tối ưu; không ghi đè baseline bằng mã mới.

## Áp dụng

Migration mới: `backend/ai-service/migrations/005_ai_performance.sql`, đã chạy trên SQL demo. Khi ứng dụng thật hoạt động, cần chạy migration AI rồi khởi động lại API/job worker. Docker vẫn không phản hồi ổn định và các service thật chưa sẵn sàng, nên chưa xác nhận dưới tải deployment thật. Không đổi model hoặc tăng hạn mức để tạo kết quả đo tốt hơn.
