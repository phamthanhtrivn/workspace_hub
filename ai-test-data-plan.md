# Dữ liệu kiểm thử AI service

- [x] Tạo fixture JSON giả lập, không chứa dữ liệu hay khóa thật, có ID ổn định và đáp án độc lập.
- [x] Bổ sung ca tiếng Việt/Anh, quyền truy cập, phiên bản nguồn, trích dẫn, múi giờ và dữ liệu thiếu vào test tự động.
- [x] Tạo tình huống model có đáp án JSON chuẩn; bổ sung chọn ca khi chạy evaluator theo yêu cầu.
- [x] Viết hướng dẫn thử tay và phân biệt kết quả fixture với đánh giá model thật.
- [x] Chạy build, lint, toàn bộ test AI và kiểm tra tính nhất quán của fixture.

Hoàn tất khi dữ liệu mới được test runner thực thi, đáp án sai bị grader từ chối và báo cáo ghi đúng giới hạn kiểm chứng.

Kết quả: 292/292 test AI đạt, gồm 111 test mới; build, lint và typecheck đạt. Model live và 13 ca UI chưa chạy. Chi tiết: `backend/ai-service/evaluation/README.md`.
