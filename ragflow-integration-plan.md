# Kế hoạch tích hợp RAGFlow vào WorkSpaceHub

## Mục tiêu và lựa chọn ban đầu

Dùng RAGFlow tự host cho phân tích tài liệu, lập chỉ mục và hỏi đáp có trích dẫn; WorkSpaceHub giữ đăng nhập, phân quyền, tài liệu gốc và giao diện. Không khôi phục Python AI service vừa xóa. Tạo module NestJS `ragflow` trong Document Service làm lớp tích hợp mỏng, với worker đồng bộ riêng khi cần. Không fork lõi RAGFlow trong MVP.

Luồng: Next.js → Kong → Document Service (xác thực, kiểm tra quyền) → RAGFlow API → LLM/embedding. File gốc vẫn ở S3; backend tải đúng phiên bản đã được cấp quyền và upload bytes tới RAGFlow. Không đưa API key hoặc API quản trị RAGFlow ra trình duyệt. RAGFlow có bản sao để lập chỉ mục, cần quản lý vòng đời và chi phí lưu trữ riêng.

## Phạm vi MVP

Chọn tài liệu có sẵn, lập chỉ mục bất đồng bộ có tiến độ, hỏi đáp tiếng Việt với trích dẫn về file gốc, lịch sử hội thoại riêng, streaming và hủy ở phía ứng dụng. Bắt đầu với tối đa 5 file/hội thoại, PDF văn bản, DOCX, TXT, MD. PDF scan/OCR kiểm thử riêng trước khi hỗ trợ chính thức. Flashcard, agent dùng công cụ, GraphRAG và tìm kiếm toàn bộ workspace để sau.

Hỏi đáp truy xuất và tóm tắt toàn văn là hai chức năng khác nhau: không dùng top-k kết quả rồi tuyên bố đã tóm tắt cả file. Tóm tắt toàn văn chỉ bật sau benchmark và kiểm tra độ phủ; cache theo phiên bản tài liệu, model, prompt, ngôn ngữ và mức chi tiết. Cache vẫn phải kiểm tra quyền trước khi trả.

## Các bước thực hiện

- [ ] **1. Khảo sát và chốt bản chạy:** đo RAM/CPU/disk khả dụng, đọc release notes, chọn một release/tag và image digest; dùng API/docs cùng phiên bản, tránh `main`/`nightly`. README hiện khuyến nghị 4 CPU, 16 GB RAM, 50 GB trống cho điểm khởi đầu, chưa gồm tải WorkSpaceHub. **Đạt khi:** Compose độc lập chạy khỏe, không xung đột cổng/volume, restart giữ dữ liệu.
- [ ] **2. PoC model và API:** cấu hình VIBI/DeepSeek bằng OpenAI-compatible nếu bản đã chọn hỗ trợ; xác minh chat, streaming, embeddings và reranker riêng. Không giả định VIBI cung cấp embeddings; thử provider embedding phù hợp hoặc model đa ngôn ngữ local tùy RAM. **Đạt khi:** bộ tài liệu mẫu tiếng Việt parse và hỏi đáp được, có nguồn, đo TTFT và tổng thời gian. VIBI chậm thì thử model/provider khác trước khi triển khai rộng.
- [ ] **3. Chốt ranh giới dữ liệu và quyền:** ánh xạ user/workspace → dataset do backend quản lý; không dùng chung dataset toàn hệ thống trong MVP. Kiểm tra hỗ trợ lọc `document_ids` trên API đúng phiên bản và test file ngoài phạm vi không vào prompt/citation. Quyền Document Service là nguồn sự thật; kiểm tra trước truy xuất, trước gửi model và trước trả nguồn/lịch sử. **Đạt khi:** user A không đọc được dữ liệu B, kể cả qua ID giả, cache, lịch sử và share bị thu hồi. Nếu API chat không bảo đảm phạm vi, dùng retrieval API có allowlist rồi generate từ kết quả đã xác thực, hoặc dataset cô lập theo phạm vi quyền.
- [ ] **4. Đồng bộ tài liệu:** thêm mapping documentId/versionId/contentHash → datasetId/documentId của RAGFlow; trạng thái QUEUED/UPLOADING/PARSING/READY/FAILED/STALE/DELETING. Dùng job/outbox bền vững với idempotency, backoff, giới hạn đồng thời, reconciliation và thao tác retry. Phiên bản mới phải được lập chỉ mục trước khi chuyển active; xóa/archive/thu hồi quyền chặn truy vấn ngay, dọn bản sao sau với retry. **Đạt khi:** upload trùng không tạo bản sao, restart tiếp tục được, bản cũ không bị truy xuất nhầm.
- [ ] **5. API tích hợp và hội thoại:** thêm module `backend/document-service/src/modules/ragflow/`, mapping Prisma và migration; đề xuất `/api/documents/rag/indexes`, `/conversations`, `/conversations/:id/messages` và `/requests/:id/cancel` dưới prefix này. RAGFlow adapter chuẩn hóa lỗi và citation → document/version/page/chunk; lịch sử thuộc user. Stream bằng POST + fetch/ReadableStream qua Kong, AbortController ngắt kết nối và giải phóng slot; chỉ hứa hủy remote nếu upstream có API tương ứng. **Đạt khi:** timeout có thông báo, cancel không chặn request mới, không retry mù khi kết quả chưa rõ, không rò key/prompt qua log.
- [ ] **6. Giao diện và hiệu năng:** tạo lại `features/ai` và route `/ai` khi backend contract đã đạt; chọn nguồn, tiến độ lập chỉ mục, token stream, trích dẫn, retry/hủy và thời gian chờ rõ ràng. Không tự vector hóa lại khi hỏi. Tóm tắt dài chạy job nền có checkpoint; giới hạn output và concurrency theo benchmark, không ép JSON lớn cho mọi câu trả lời. **Đạt khi:** Q&A sau index trên bộ test 2/5 file có TTFT p95 mục tiêu ≤10 giây, tổng p95 ≤45 giây; hủy giải phóng slot local ≤2 giây. Đây là mục tiêu nghiệm thu, không phải cam kết tốc độ RAGFlow/VIBI.
- [ ] **7. Đóng gói vận hành:** quản lý cấu hình trong `deploy/ragflow/` với override và `.env.example`; volume/network riêng, chỉ mở API nội bộ, giao diện quản trị chỉ localhost/VPN, secrets server-side, backup/restore và nâng cấp có rollback. Chọn Elasticsearch/Infinity và metadata/object storage theo release đã chốt, không ghép tùy ý với PostgreSQL app. **Đạt khi:** health-check tách khỏi health app, RAGFlow lỗi không làm chức năng tài liệu ngừng hoạt động; CI kiểm tra adapter/Compose bằng dữ liệu giả.
- [ ] **8. Nghiệm thu trước bật mặc định:** chạy unit/contract/E2E, ma trận quyền và vòng đời file; 20–30 câu hỏi tiếng Việt gồm thiếu dữ kiện, mâu thuẫn, prompt injection, nhiều file; đo cold/warm, TTFT/p50/p95, lỗi, token và chi phí so với baseline cũ. **Đạt khi:** nguồn đều thuộc allowlist phiên bản được chọn, không rò dữ liệu, không treo sau hủy, backup restore đạt, hiệu năng đáp ứng ngưỡng hoặc ghi rõ quyết định đổi provider. Bật feature flag cho nhóm thử rồi mở rộng; rollback bằng tắt flag, giữ file gốc.

## Thứ tự và điều kiện quyết định

1 → 2 → 3 là cổng quyết định đầu tư. Chỉ sau PoC tài nguyên, model và cách ly dữ liệu đạt mới làm 4–8. Ước lượng ban đầu 6–10 ngày công cho MVP; OCR khó, quyền chia sẻ linh hoạt và hạ tầng thiếu tài nguyên có thể tăng đáng kể. Kế hoạch này chưa cài RAGFlow, chạy migration hoặc gửi tài liệu người dùng ra provider.

## Tài liệu đối chiếu

- Repository, license Apache-2.0 và yêu cầu triển khai: https://github.com/infiniflow/ragflow
- Releases để pin bản triển khai: https://github.com/infiniflow/ragflow/releases
- HTTP API (đối chiếu lại sau khi chọn release): https://ragflow.io/docs/v1.0.0-rc1/http_api_reference
- OpenAI-compatible provider: https://ragflow.io/docs/v1.0.0-rc1/faq

RAGFlow thay thế pipeline RAG tự xây; không tự giải quyết độ trễ của nhà cung cấp LLM. Kết quả PoC phải quyết định có tiếp tục dùng VIBI hay đổi model/provider.
