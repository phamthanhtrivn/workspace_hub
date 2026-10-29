# Kịch bản kiểm thử AI Service — 27/10/2026

Phạm vi: chat tài liệu, @ai hội thoại, trợ lý công việc, quota, hàng đợi và tóm tắt bản ghi bằng FFmpeg/Whisper local. Mục tiêu là tìm lỗi có thể tái hiện và xác nhận bản sửa; không khẳng định bao phủ mọi lỗi hoặc mọi cách diễn đạt của model.

## Chạy tự động

Từ thư mục `workspace_hub`:

```powershell
node backend/scripts/verify-ai-service.mjs --browser --media
```

Runner build AI, kiểm tra TypeScript frontend/Project/Calendar, chạy toàn bộ test AI (concurrency 2), test SSE/lịch sử frontend, Jest nguồn Project/Calendar, test Python, kiểm tra trình duyệt demo và video mẫu công khai qua local Whisper. Không gọi model bên ngoài hay xử lý bản ghi người dùng.

- Báo cáo tổng: [ai-service-audit-results.json](./ai-service-audit-results.json).
- Chi tiết lỗi tìm thấy/bản sửa: [ai-service-audit.md](./ai-service-audit.md).
- Log từng bước: `E:/KLTN/hoho/.tmp/ai-service-audit/`.
- Nếu thiếu bộ nhớ khi chạy test song song, thêm `--serial` để chạy từng file test AI; các ca kiểm tra vẫn giữ nguyên.
- Nếu chưa chạy demo frontend 3100, backend fixture 18110, worker speech 8090 hoặc chưa chuẩn bị MP4 công khai, bước tương ứng được ghi **BLOCKED**, không ghi PASS.

Chạy riêng ca hồi quy mới:

```powershell
cd backend/ai-service
npm.cmd run build
node --test --test-concurrency=1 test/audit-regression.test.cjs
```

## Dữ liệu

- SQL cô lập; tài khoản A/B; một project chung và một project B riêng.
- Trợ lý: task quá hạn, đến hạn hôm nay, không deadline, bị chặn, mô tả chứa chỉ thị giả, task Calendar cá nhân và hơn 60 task mở.
- Phân trang: 35 hội thoại trong từng phạm vi Cá nhân/Project; thời gian hoạt động xác định trước; cập nhật hội thoại cuối trang trước khi lấy trang tiếp.
- So sánh: audit fixture có 5 task hoàn thành/7 ngày và 17/30 ngày. Demo UI là bộ riêng: P1 có 5/7 task hoàn thành, tỷ lệ 75%/66,7%; không dùng lẫn số liệu.
- Video: audio tiếng Việt công khai được ghép vào MP4 nhỏ; WAV rỗng, bị cắt, sai sample rate, quá dài/quá kích thước được tạo trong test.
- Không chỉnh task, lịch, khóa hay database người dùng thật trong các bước tự động.

## Ma trận kịch bản

“Tự động” là lớp kiểm chứng bằng test/fixture; không đồng nghĩa đã chạy trên deployment thật.

| ID | Thao tác / điều kiện | Kết quả mong đợi | Lớp |
| --- | --- | --- | --- |
| AI01 | Thiếu/sai gateway proof, giả identity header | Chặn trước khi đọc dữ liệu | Tự động |
| AI02 | Role đặt lại mật khẩu hoặc identity sai định dạng | Không được dùng như phiên người dùng | Tự động |
| AI03 | B mở notebook/session của A | 404 hoặc từ chối quyền; không lộ nội dung | Tự động |
| AI04 | Mất quyền tài liệu/project giữa lúc xử lý | Hủy/ẩn dữ liệu; không lưu câu trả lời chứa dữ liệu mất quyền | Tự động |
| AI05 | @ai trong nhóm hỏi danh sách task thực | Không khôi phục công cụ tra task cũ; không bịa phân công | Tự động |
| AI06 | Yêu cầu đổi deadline/tạo task/checklist | Chỉ tư vấn, không ghi dữ liệu công việc | Tự động |
| AI07 | Cá nhân có task Project và Calendar | Đọc đúng task của người hỏi, không cộng bản sao Project | Tự động nguồn |
| AI08 | Project: Việc của tôi / Toàn project | Đúng phạm vi; không chứa project B riêng | Tự động nguồn |
| AI09 | Hỏi hiệu suất 7 ngày | Đúng cửa sổ và aggregate đầy đủ | Tự động |
| AI10 | Hỏi hiệu suất 30 ngày | Lấy snapshot 30 ngày mới, tránh tool trùng | Tự động |
| AI11 | “So sánh hiệu suất 7 ngày và 30 ngày” | Model nhận cả hai kỳ, lần lượt 5 và 17 trong audit fixture | Tự động, lỗi đã sửa |
| AI12 | “7 và 30 ngày”, “7 and 30 days”, “bảy/ba mươi ngày” | Nhận đúng hai cửa sổ; “30 task” không bị hiểu thành 30 ngày | Tự động |
| AI13 | Một kỳ mất nguồn dữ liệu | Giữ null/unavailable riêng, không coi là 0 và không cộng hai kỳ chồng nhau | Tự động |
| AI14 | Quyền project của một kỳ bị thu hồi trước khi lưu | Chặn lưu cả câu trả lời so sánh | Tự động |
| AI15 | Tài khoản không có dữ liệu | Trả empty/0 đúng nghĩa, không bịa task | Tự động |
| AI16 | Project/Calendar trả lỗi hoặc dữ liệu không hợp lệ | Phân biệt unavailable với empty | Tự động |
| AI17 | Hơn 60 task và mô tả dài | Giữ aggregate; báo giới hạn chi tiết; không vượt ngân sách prompt | Tự động |
| AI18 | Chỉ thị giả/HTML/link lạ trong task/tài liệu | Không thay quyền; không thực thi HTML hoặc mở URL model tự tạo | Tự động/fixture |
| AI19 | Task quá hạn, hôm nay và bị chặn | Dữ liệu ưu tiên/blocker đúng; lý do model cần đối chiếu thêm ở live | Tự động dữ liệu |
| AI20 | Calendar: lịch chồng nhau, qua ngày, cả ngày và DST | Khoảng trống tránh lịch bận và thời gian đã qua | Tự động |
| AI21 | Calendar thiếu dữ liệu hoặc lỗi | Không xác nhận thời gian trống; không yêu cầu form giờ làm đã bỏ | Tự động |
| AI22 | Tạo hội thoại mới | ID mới, nội dung trống, giữ nguyên các cuộc cũ | Tự động + UI |
| AI23 | Mở lại cuộc cũ và tải tin cũ hơn | Đúng tin, đúng thứ tự, không mất/lặp tin | Tự động + UI |
| AI24 | Gửi câu hỏi trong cuộc có hơn 30 tin | SQL chỉ lấy 4 tin cho model; UI vẫn xem đủ lịch sử | Tự động |
| AI25 | Cá nhân: hội thoại cuối trang nhận tin mới trước khi tải tiếp | Không lặp cuộc đã hiển thị; vẫn còn đúng 5 cuộc ở trang 2 | Tự động, lỗi đã sửa |
| AI26 | Project: thao tác tương tự AI25 | Cùng kết quả, giữ đúng project | Tự động, lỗi đã sửa |
| AI27 | Cursor sai JSON, timestamp, encoding hoặc quá dài | 400, không gây lỗi SQL/500 | Tự động |
| AI28 | Dùng cursor của A bằng B hoặc sai phạm vi | 404; cursor UUID cũ vẫn được nhận để tương thích | Tự động |
| AI29 | Lịch sử/tiêu đề tham chiếu project mất quyền | Nội dung và nguồn bị ẩn; không lộ tiêu đề cũ | Tự động |
| AI30 | SSE bị cắt giữa dòng UTF-8/CRLF hoặc không có done | Không coi kết nối dở là câu trả lời thành công | Tự động |
| AI31 | Gửi cùng requestId hoặc hai câu đồng thời | Chặn replay/yêu cầu trùng; không gọi provider lặp | Tự động |
| AI32 | Hết RPM/token theo phút | 429 trước provider; không tăng hạn mức để vượt kiểm tra | Tự động |
| AI33 | Hết quota ngày hoặc database lỗi | Không chờ/retry provider tự động | Tự động |
| AI34 | Các lượt gọi vắt qua 00:00 UTC | Quota phút vẫn tính đủ; quota ngày đúng ngày mới | Tự động |
| AI35 | Hạn mức còn 58 giây mới hết | Chờ thời điểm hết hạn, không truy vấn lại mỗi 2 giây | Tự động thời gian ảo |
| AI36 | Dừng, đóng chat hoặc mất quyền trong lúc chờ quota | Kết thúc chờ, không phát sinh provider call tiếp | Tự động |
| AI37 | Tool gửi userId/projectId giả hoặc tool ngoài lựa chọn none | Từ chối, không đọc ngữ cảnh ngoài yêu cầu | Tự động |
| AI38 | Model trả kết quả bị cắt/thiếu trích dẫn/JSON sai | Báo lỗi; không lưu như hoàn tất | Tự động |
| AI39 | WAV rỗng, hỏng, bị cắt hoặc sai sample rate | 422 trước khi model nhận dạng | Tự động Python |
| AI40 | WAV trên 46 giây/2 MiB hoặc sai content-type | Từ chối đúng giới hạn | Tự động Python |
| AI41 | Sai khóa, model chưa nạp, worker đang bận | 401/503/429 phù hợp; không lộ audio hay chẩn đoán riêng tư | Tự động Python |
| AI42 | Bật summary với STT_CONCURRENCY=2 | Từ chối cấu hình sớm; tắt summary không chặn feature khác | Tự động, lỗi đã sửa |
| AI43 | Media host giả, credentials trong URL, file:// hoặc redirect | Không tải từ đích ngoài allowlist | Tự động |
| AI44 | Không có lời nói hoặc STT lỗi | Không tạo tóm tắt giả; thông báo thất bại có thể thử lại | Tự động |
| AI45 | Một đoạn STT/model lỗi, bấm thử lại | Giữ checkpoint thành công; chỉ chạy phần thiếu | Tự động |
| AI46 | Job giao trùng hoặc revision bản ghi thay đổi | Không gọi provider lặp; revision khác không dùng checkpoint cũ | Tự động |
| AI47 | Worker gián đoạn, recovery và shutdown | Không cướp job đang chạy; đóng tài nguyên có hạn chờ | Tự động |
| AI48 | Desktop/mobile: lịch sử, tạo mới, scope, Escape/focus | Nút dùng được; không có thùng rác/form giờ làm; không page error | Trình duyệt fixture |
| AI49 | MP4 mẫu → FFmpeg → Whisper local | Có transcript tiếng Việt thực, không gọi cloud STT/model tóm tắt | Chạy local thực |
| AI50 | Đăng nhập A/B qua gateway thật, ghi cuộc họp thử, tóm tắt và thu hồi chia sẻ | Owner được tạo; viewer đúng quyền; kết quả không lộ sau thu hồi | Live riêng, chưa xác minh |
| AI51 | 35 hội thoại có timestamp cùng mili giây, khác microsecond | Hai trang đủ 35 ID khác nhau, không mất 5 cuộc ở trang sau | Tự động, biên bản sửa đã kiểm tra |

## Kiểm tra live bổ sung

Sau khi hạ tầng thật hoạt động, dùng một cuộc họp thử không chứa dữ liệu riêng: kiểm tra nút tóm tắt trên recording player, trạng thái worker, xem bằng tài khoản được chia sẻ, thu hồi quyền và thử lại. Cần đối chiếu cách diễn đạt/số liệu model với dữ liệu nguồn và quota nhà cung cấp thực tế.

Ghi từng ca: ID, người kiểm tra, thời gian/múi giờ, môi trường, dữ liệu chuẩn bị, thao tác, kết quả thực, bằng chứng và PASS/FAIL/BLOCKED. Không dùng kết quả fixture để đánh dấu PASS cho AI50.
