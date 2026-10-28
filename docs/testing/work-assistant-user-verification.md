## Dọn ESLint Communication — 28/10/2026

Đã xử lý các lỗi lint trong nhóm file Communication được nêu ở lượt dọn trước: bỏ ép kiểu `any` không cần thiết, dùng kiểu Prisma cho transaction/bộ lọc, giữ kiểu media khi thêm URL và dùng `unknown` kèm kiểm tra cấu trúc tại ranh giới phản hồi API. Đồng bộ project-space chỉ trả ba ID công khai, giữ metadata thành viên ở phía server.

Đã thêm import `ChannelAccessModule` trực tiếp trong `SocketModule` để kiểm thử module độc lập khởi tạo được phụ thuộc; AppModule vốn đã nạp module toàn cục này. Hai test ranh giới kênh chat đã được cập nhật đúng thứ tự constructor hiện tại. Có thêm 24 ca kiểm tra cấu trúc phản hồi và retry xung đột project-space.

Kết quả cuối: **11 file ESLint đạt, 0 lỗi/0 cảnh báo** theo cấu hình đầy đủ hiện có; kiểm tra kiểu Communication với `noUnusedLocals`/`noUnusedParameters` đạt; **46/46 bộ test, 273/273 test Communication đạt**. Đây là phạm vi 11 file đã chỉnh và bộ test của service, không phải kết quả lint toàn repository. Log và báo cáo máy nằm trong `E:/KLTN/hoho/.tmp/communication-cleanup/`.

Demo frontend ở `http://localhost:3100` đã được khởi động lại cùng cấu hình API fixture để giải phóng bộ nhớ tích lũy trước khi kiểm tra.

## Dọn mã và chuẩn hóa kiểm thử — 28/10/2026

Đã gộp runner trợ lý vào `backend/scripts/verify-ai-service.mjs`, xóa runner/báo cáo cũ và cập nhật hướng dẫn. Đã thu hẹp sáu export AI về phạm vi file, bỏ import thừa ở Project/Communication, bỏ một hàm private không có chỗ gọi và đánh dấu các tham số bắt buộc nhưng không dùng. Build AI hiện kiểm tra biến/tham số thừa.

Lượt xác minh cuối bằng `node backend/scripts/verify-ai-service.mjs --serial` đạt **196/196 test**: AI 181, frontend 4, Project 4, Calendar 1, Python 6. Kiểm tra kiểu frontend/AI/Project/Calendar và kiểm tra kiểu nghiêm ngặt Communication đều đạt. Tùy chọn `--serial` chạy từng file test AI khi máy thiếu bộ nhớ; lượt chạy cuối không áp giới hạn heap thấp cho frontend.

ESLint kiểm tra cú pháp/import thừa trên năm file Communication đã dọn đạt; kiểm tra ESLint đầy đủ vẫn báo các lỗi có sẵn về `any`, truy cập không an toàn và định dạng. Kết quả UI/video bên dưới thuộc lượt kiểm tra trước. Báo cáo tự động mới nhất: [ai-service-audit-results.json](./ai-service-audit-results.json).

## Kiểm tra hồi quy AI Service — 27/10/2026

Đã sửa lỗi lặp hội thoại khi tải thêm, thiếu dữ liệu khi so sánh 7/30 ngày và cấu hình STT không phù hợp worker local. Đã kiểm tra thêm độ chính xác microsecond của cursor để tránh bỏ sót hội thoại. Lượt cuối đạt **181 test AI + 4 frontend + 5 nguồn Project/Calendar + 6 Python**, sáu nhóm kiểm tra UI demo và luồng video → FFmpeg → Whisper local. Chưa xác minh deployment đầy đủ vì AI/Communication thật không phản hồi.

Xem [bảng 51 kịch bản](./ai-service-test-plan.md), [lỗi và kết quả kiểm tra](./ai-service-audit.md), [báo cáo tự động](./ai-service-audit-results.json). Các báo cáo phía dưới là kết quả của những lượt kiểm tra trước.

## Tối ưu AI Service — 27/10/2026

Đã tối ưu đóng gói ngữ cảnh, lịch sử SQL, truy vấn ảnh, danh sách hội thoại, đọc nguồn song song và chờ quota. Toàn bộ **173/173 test AI Service đạt**. Xem [báo cáo đo trước/sau](./ai-performance/README.md) để biết số liệu, phạm vi môi trường và cách chạy lại. Các kết quả UI/dữ liệu cũ dưới đây được giữ để đối chiếu.

## Cập nhật gợi ý từ Calendar — 27/10/2026

Đã bỏ nút Thiết lập giờ làm việc, form nhập ngày/giờ/nghỉ và API preferences. Trợ lý lấy khoảng chưa có sự kiện trực tiếp từ Calendar cho 7 ngày tới; dữ liệu lịch thiếu hoặc lỗi thì không xác nhận giờ trống. Khoảng chưa có lịch không được coi là giờ làm hay thời gian rảnh đã xác nhận.

Đã kiểm tra: Calendar thay đổi, lịch cả ngày, lịch chồng nhau/qua ngày, dữ liệu thiếu/lỗi, không gọi API preferences, desktop/mobile. Model thật trên dữ liệu giả lập đề xuất **09:00–09:25** ngày 28/10, tránh lịch bận 10:00–11:00 và 14:00–15:00, không yêu cầu thiết lập thủ công.

Bằng chứng: [kết quả và câu trả lời](./work-assistant-simulation/calendar-scheduling-check.json), [desktop](./work-assistant-simulation/calendar-scheduling-desktop.png), [mobile](./work-assistant-simulation/calendar-scheduling-mobile.png). Chạy lại bằng `node backend/scripts/work-assistant-sim/calendar-scheduling.cjs` (có một lượt gọi model với dữ liệu fixture).

## Cập nhật hội thoại — 27/10/2026

Đã bỏ nút thùng rác và API xóa lịch sử. Thay bằng **Danh sách cuộc trò chuyện** và **Tạo cuộc trò chuyện mới**. Danh sách theo phạm vi Cá nhân/project; tiêu đề lấy từ câu hỏi đầu tiên. Cuộc mới không xóa cuộc cũ và không dùng lịch sử của cuộc khác làm ngữ cảnh.

Đã chạy 6 nhóm kiểm tra UI/API trên demo: nút xóa biến mất; tạo mới giữ lịch sử; mở lại đúng cuộc; chặn tài khoản khác; desktop/mobile; phạm vi project. Không có page error. Test HTTP/SQL còn kiểm tra 34 cuộc/phân trang, tiêu đề khi mất quyền, ngữ cảnh độc lập và migration chạy lặp.

Bằng chứng: [kết quả](./work-assistant-simulation/conversation-check.json), [ảnh desktop](./work-assistant-simulation/conversations-desktop.png), [ảnh mobile](./work-assistant-simulation/conversations-mobile.png). Migration mới: `004_work_assistant_conversations.sql`; đã áp dụng trên SQL demo, cần chạy migration AI khi cập nhật deployment thật. Các kết quả phía dưới là báo cáo của lượt kiểm tra trước thay đổi này.

# Báo cáo thử trợ lý như người dùng — 27/10/2026

## Kết quả

| Nhóm | Kết quả | Môi trường |
| --- | --- | --- |
| 29 kịch bản WA01–WA29 | 28 PASS, 1 BLOCKED | API/UI thật của trợ lý, SQL hội thoại cô lập, Auth/Project/Calendar fixture |
| Test tự động sau sửa lỗi | 18/18 PASS | AI 9, Project 4, Calendar 1, frontend 4 |
| Câu trả lời model lưu để đối chiếu | 8 câu trả lời + 1 kiểm tra diễn đạt bổ sung | Model thật `gpt-6.1-sol`, cấu hình hiện có |
| Ba trang và liên kết task | PASS, không có page error | Dashboard, Projects, Calendar, bấm mở task |
| Toàn bộ stack thật | BLOCKED | Lỗi User Service và Docker timeout |

Trong JSON, WA05–WA06 được gộp thành một entry: 27 entry PASS tương ứng 28 kịch bản. Một số entry chứa nhiều phép kiểm tra (7 body thiết lập sai, quyền send/delete, replay/concurrency). Không coi số entry là số mọi trường hợp đầu vào có thể tồn tại.

Bằng chứng ở [thư mục mô phỏng](./work-assistant-simulation/README.md). Các ca đã PASS được giữ qua các lượt sửa; ca lỗi được chạy lại. Đây không phải khẳng định mọi cách diễn đạt của model đều đã được kiểm tra.

## Đã tạo và thao tác

- Bộ fixture có 4 tài khoản, 3 project và 88 task, dữ liệu deadline, task chặn nhau, checklist, task cá nhân và focus.
- Đăng nhập bằng form, mở bong bóng, đổi trang, tải lại lịch sử, kiểm tra mobile/focus/Escape và bấm liên kết task.
- Đối chiếu số liệu 7/30 ngày; đúng hạn 75% và ≈66,7%; focus chỉ của người hỏi.
- Thử tài khoản rỗng, nguồn lỗi, project riêng, giả userId, gửi lặp, hai yêu cầu đồng thời, hủy, lịch sử trên 30 tin và mất quyền.
- Thử mô tả task có chỉ thị giả/HTML. Model không làm theo marker; UI không thực thi HTML/ảnh.
- So sánh dữ liệu trước/sau yêu cầu “đổi deadline, tạo checklist”: task không bị thay đổi.

## Lỗi tìm thấy và đã sửa

1. **Hỏi 30 ngày có thể timeout khi chờ quota giữa hai lượt model.** Lấy đúng dữ liệu 30 ngày ngay từ đầu, tránh lượt tool dư; quota không đủ trả 429 sớm. Phân biệt hết thời gian với người dùng chủ động dừng.
2. **Ngữ cảnh nhiều task vượt mức 10.000 token thực tế.** Tính cả system prompt, lịch sử và JSON lồng, giảm chi tiết cho vừa ngân sách; giữ aggregate đầy đủ và báo một phần. Task tham khảo khớp dữ liệu thực sự gửi model.
3. **Bảng thống kê Markdown hiển thị thành văn bản thô.** Bật định dạng bảng GFM.
4. **Thông báo mất quyền bị lặp.** Chỉ hiển thị lỗi quyền một lần ở panel.
5. **Câu trả lời lộ tên trường kỹ thuật.** Thêm quy tắc diễn đạt cho người dùng; đã kiểm tra thêm bằng model thật, không còn freeSlots/blockedBy/get_work_context trong câu trả lời kiểm tra.

Hai lỗi trong lượt fixture đầu (mô tả dài quá hợp đồng nguồn và locator Playwright trùng tên) đã được sửa trong dữ liệu/script thử, không ghi nhận nhầm là lỗi sản phẩm.

## Vì sao chưa PASS toàn bộ stack thật

Đã thử tạo database tách riêng và đăng ký tài khoản qua User Service. Hệ thống hiện có trả HTTP 500 với nguyên nhân cột `account_settings.allow_search_by_email` còn bắt buộc. Đã dựng User Service/database sạch riêng, nhưng Docker sau đó bị timeout, cả gateway và database test ngừng phản hồi trong khi service Node trên host vẫn lên.

Không sửa/xóa cột trong database người dùng hiện có. Những database/container thử riêng có tiền tố `wa_20261027134553_`; thông tin kết nối private chỉ nằm trong `../.tmp/work-assistant-live/`, không sao chép vào báo cáo.

Vì vậy, mô phỏng đã xác nhận luồng trợ lý và hành vi model, **chưa xác nhận đồng bộ/đăng nhập/ủy quyền end-to-end của toàn bộ deployment thật**. WA29 channel/DM thật được giữ BLOCKED; test hồi quy hiện có vẫn tách riêng.

## Chạy lại

```powershell
node backend/scripts/verify-ai-service.mjs
```

[Xem cách mở demo và chạy bộ mô phỏng](./work-assistant-simulation/README.md). Chỉ áp dụng migration cho database ứng dụng thật sau khi hạ tầng và cấu hình kết nối đúng đã sẵn sàng.
