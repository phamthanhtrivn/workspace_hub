# Rà soát lỗi @ai — 24/10/2026

| Lỗi/điều kiện | Nguyên nhân | Sửa và xác minh |
|---|---|---|
| Lịch sử có tin chỉ đính kèm | content nullable được truyền vào Buffer.byteLength | Lọc null/rỗng trong SQL; test PGlite tái hiện lỗi trước sửa |
| Bỏ sót tin rất gần mốc yêu cầu | JS Date mất phần microsecond của PostgreSQL | So sánh với mốc ngay trong DB; test bản ghi cách nhau 0.1 ms |
| Agent gọi tiếp sau thu hồi quyền | Chỉ xác minh lúc claim/lấy lịch sử | Validate trước từng lượt model và mỗi 5 giây; test tái hiện và test abort |
| Trả lời dựa trên câu hỏi đã sửa | Không lưu snapshot câu hỏi | Hash câu hỏi khi đăng ký/claim; reject khi nội dung thay đổi |
| Mất kết quả khi gửi về chat lỗi | Retry job chỉ claim lại, không giữ kết quả đã tạo | Lưu answer/token vào job trước delivery; test retry không gọi lại model |
| Hơn 20 yêu cầu chờ không tiến đều | Mỗi sweep chọn lại cùng nhóm QUEUED | Đặt lịch dispatch và atomic reservation SKIP LOCKED; test 25 yêu cầu |
| Client giả danh bot/hệ thống | Chấp nhận type AI/SYSTEM từ đầu vào client | Chặn ở send entry points; UI kiểm tra sender ID của bot |
| Thread trỏ sang channel khác | createMessage chưa kiểm tra channel của parent | Kiểm tra scope và trạng thái parent trước khi ghi |
| Câu phủ định vẫn đọc lịch sử | Regex tìm chuỗi tóm tắt ở bất kỳ vị trí nào | Chỉ bắt buộc đọc với lệnh rõ ràng; còn lại model quyết định tool |
| Token sai cấu trúc vẫn qua validation | Regex cho phép chuỗi gồm 36 dấu gạch ngang | Validate đúng cấu trúc UUIDv4; HTTP test 401/400/thành công |

Kiểm chứng: test toàn bộ hai backend, SQL qua PGlite (channel/direct/thread,
transaction rollback, lease/outbox, retry, snapshot, null text và timestamp),
HTTP nội bộ và module wiring. Không gửi hội thoại thật để kiểm thử.

Giới hạn: chưa kiểm chứng UI và toàn stack local khi database thực chưa sẵn sàng.
Thu hồi quyền không thể rút lại dữ liệu đã gửi tới provider trước đó. Crash trước
checkpoint vẫn được coi là kết quả model chưa xác định và không tự gọi lại.


C?p nh?t ki?m th? m? r?ng: xem [b?o c?o m?i](CONVERSATION_AI_TEST_REPORT.md).
Tr?ng th?i PostgreSQL v? Docker trong ph?n gi?i h?n ban ??u ? tr?n l? ghi nh?n
c?a ??t r? so?t tr??c; k?t qu? m?i tr??ng v? ki?m th? m?i nh?t n?m trong b?o c?o m?i.
