# Đánh giá nâng model cho conversation @ai

Mục tiêu: chọn ứng viên mạnh hơn bằng thử nghiệm có giới hạn trên provider hiện tại;
chưa thay đổi model production hoặc thiết kế memory/streaming.

- [x] Đọc model catalog và bảng giá provider; đối chiếu tài liệu chính thức.
- [x] Tạo ba tình huống QA tiếng Việt và tiêu chí đánh giá công khai.
- [x] Chạy cùng agent LangChain với DeepSeek hiện tại, GPT-6.1 Sol và Astra.
- [x] Kiểm tra tương thích tool, độ trễ, usage và giới hạn model.
- [x] Viết báo cáo đề xuất, chi phí tham khảo và giới hạn của mẫu thử.

Chỉ gửi nội dung giả đến https://vibi.top; giữ quota admitModel và không retry
provider tự động. Ba case/model mỗi vòng. Sau khi tìm được lỗi protocol, chạy
thêm một vòng để xác minh bản sửa. Đã lưu cả dữ liệu trước và sau sửa.

Kết quả giai đoạn đánh giá ban đầu: xem backend/ai-service/MODEL_EVALUATION.md. Sửa protocol prefetch,
89 test AI qua và đã nạp bản sửa vào Docker API/worker. Sol là ứng viên nâng
cấp thử; giai đoạn này chưa đổi model phục vụ. Quyết định tiếp theo nằm dưới.

## Kích hoạt model gọn cho @ai — 24/10/2026

Theo lựa chọn tiếp theo của người dùng: dùng model thông minh và tiết kiệm token.

- [x] Tách CONVERSATION_AI_MODEL và CONVERSATION_AI_MAX_TOKENS, giữ fallback cũ.
- [x] Quota admission ghi nhận model thực; Notebook giữ nguyên model và budget.
- [x] Chọn gpt-6.1-sol, trần 2048 token; prompt ưu tiên trả lời gọn.
- [x] Toàn bộ AI Service 94/94 test qua; Docker API/worker đã nạp cấu hình mới.
- [x] Đo lại ba ca QA ở budget mới và kiểm thử luồng chat thật.
- [x] Ghi kết quả, phạm vi và giới hạn vào báo cáo.


Kết quả cấu hình mới: 3/3 QA, 318 completion token; 5/5 live API và Chromium
mention/reply qua; replay không trùng, rate-limit rollback qua. 94/94 test AI
qua. Lưu usage tại evaluation-results/gpt-6.1-sol-efficient.json. Không đổi
model Notebook, key, giá trị quota hoặc dữ liệu người dùng.
