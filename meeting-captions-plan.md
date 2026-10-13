# Phụ đề trực tiếp bằng WhisperLiveKit

Phụ đề tiếng Việt có tên người nói trong phòng LiveKit. Mỗi người bật/tắt CC trên giao diện. Dịch vụ tự host nhận audio track phía server; chỉ thành viên đã vào phòng được yêu cầu khởi động. Không thêm API nhận dạng trả phí.

- [x] Xác minh API PCM của WhisperLiveKit và ghim phiên bản; thêm dịch vụ Python cùng Docker/healthcheck.
- [x] Thêm API meeting đã xác thực để khởi động worker theo phòng, nhận diện worker và dọn khi phòng kết thúc.
- [x] Thêm hook nhận caption và nút CC/khung phụ đề theo giao diện hiện có; ẩn worker khỏi danh sách camera.
- [x] Chạy nhận dạng tiếng Việt thật: hai người nói, bật/tắt, mute/unmute, reload/rejoin, quyền truy cập và phòng kết thúc. Các dạng reconnect mạng khác chưa kiểm chứng.
- [x] Chạy kiểm thử, lint, TypeScript và ghi hướng dẫn vận hành/kết quả thực tế trong meeting-captions-verification.md.

Phạm vi lần này: phụ đề trực tiếp. Phụ đề VTT cho video đã ghi và dịch sang ngôn ngữ khác là phần mở rộng riêng. Chất lượng/độ trễ phải đo bằng audio thật trên phần cứng hiện tại.
