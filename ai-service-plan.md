# Kế hoạch xây dựng RAG cho WorkSpaceHub

## Quyết định và phạm vi

### Trạng thái hiện thực MVP (21/10/2026)

Cập nhật xác thực cho AI và Calendar → Document: Kong kiểm tra JWT, xóa header danh tính/proof từ client rồi gán context và `AI_GATEWAY_KEY`; AI không giữ JWT secret và từ chối gọi thẳng chỉ có `x-user-*`. Mỗi luồng dùng khóa riêng ≥32 ký tự: `AI_DOCUMENT_SERVICE_KEY`, `RAG_SERVICE_KEY`, `CALENDAR_DOCUMENT_SERVICE_KEY`; không còn fallback công khai kể cả local. Bridge vẫn kiểm tra quyền từng tài liệu và phiên bản; Calendar gửi actor và nhóm tối đa 50 ID/lần tới endpoint nội bộ của Document Service, không cache quyền. Khóa local đã được tạo/đồng bộ bằng script; phải restart các service để nạp. Không đổi khóa legacy của các luồng khác và chưa chuẩn hóa bảo mật toàn bộ service cũ.

Đã bổ sung mã mới trong `backend/ai-service` (NestJS + BullMQ), `backend/rag-worker` (Docling/LlamaIndex/Qdrant), bridge phân quyền của Document Service và frontend `/ai` với notebook, nguồn, chat streaming/trích dẫn/hủy, ghi chú và Studio. Hướng dẫn cấu hình/chạy/rollback và các giới hạn thực tế: `deploy/ai/README.md`.

Đã có kiểm thử PostgreSQL in-process, Qdrant in-memory, quyền truy cập, snapshot/cache, trích dẫn, streaming và hủy. Đây **chưa phải nghiệm thu toàn bộ kế hoạch**: Docker Desktop chưa chạy, chưa build image/chạy E2E với tài liệu và provider thật, chưa benchmark, CI hay kiểm chứng backup/crash recovery trên hạ tầng thật. Không đánh dấu hoàn tất các bước bên dưới trước khi đạt tiêu chí của từng bước.

Sai khác MVP được ghi rõ: embedding mặc định multilingual-e5-small CPU (có thể cấu hình BGE-M3/API); tóm tắt theo phần có checkpoint nhưng chưa reduce cuối; câu hỏi độc lập chưa rewrite theo lịch sử; notebook cá nhân có một dòng chat. Không flashcard/quiz. Chưa tự sao chép key cũ hay chạy migration vào `ai_db` cũ.

Thay thế phương án RAGFlow trong `ragflow-integration-plan.md` bằng pipeline tự xây: Next.js 16, NestJS/TypeScript, BullMQ/Redis, Python Docling + LlamaIndex, Qdrant, embedding đa ngôn ngữ, PostgreSQL và S3 hiện có. Không khôi phục mã AI service cũ. Chưa chạy cài đặt, migration hay chuyển tài liệu khi lập kế hoạch này.

Định hướng sản phẩm: trải nghiệm tương tự NotebookLM, tổ chức công việc theo notebook có tập nguồn riêng, chat có trích dẫn và khu vực Studio lưu kết quả. Đây là định hướng chức năng/luồng sử dụng, không sao chép nhận diện hoặc cam kết đầy đủ tính năng của NotebookLM.

MVP: tạo/đổi tên/xóa notebook, thêm nguồn từ Document Service hoặc upload, lập chỉ mục có tiến độ, chọn nguồn khi hỏi, hỏi đáp tiếng Việt theo 1–5 nguồn với trích dẫn, lịch sử riêng theo notebook, streaming, hủy, tổng quan nguồn, câu hỏi gợi ý và ghi chú lưu lại. Tóm tắt toàn văn là tác vụ riêng có cache và kiểm tra độ phủ; không dùng kết quả top-k để tuyên bố đã đọc hết tài liệu. Không triển khai flashcard hoặc quiz. Hướng dẫn học, Audio Overview, video, sơ đồ tư duy, agent dùng công cụ và GraphRAG nằm ngoài MVP.

## Trải nghiệm notebook và Studio

- Trang `/ai` là danh sách notebook; `/ai/notebooks/:id` là không gian làm việc. Notebook có tên/chủ đề, tập nguồn, lịch sử chat và ghi chú riêng. MVP notebook thuộc cá nhân; chia sẻ notebook/cộng tác để giai đoạn sau, không kế thừa quyền đọc file cho người khác chỉ bằng việc chia sẻ notebook.
- Bố cục desktop gồm ba vùng: nguồn bên trái, chat ở giữa và Studio bên phải; màn hình nhỏ chuyển thành tab. Người dùng thấy ngay nguồn đang xử lý/sẵn sàng/lỗi/mất quyền/đã có phiên bản mới. Mỗi tin nhắn lưu snapshot các nguồn thực sự được chọn; không thay đổi phạm vi câu hỏi cũ khi đổi checkbox.
- Nguồn có thể được thêm từ file người dùng được phép đọc trong Document Service, hoặc upload qua luồng Document Service/S3 hiện có. Notebook chỉ lưu tham chiếu tới phiên bản, không tự tạo kho file độc lập. Thêm nguồn không tự sinh bản tóm tắt dài tốn phí; người dùng chủ động tạo tổng quan hoặc hệ thống chạy job ngắn, có deduplication và giới hạn ngân sách đã cấu hình.
- Tổng quan gồm mô tả ngắn của các nguồn đã sẵn sàng và câu hỏi gợi ý. Gắn revision/tập nguồn đã dùng và báo chưa đầy đủ khi một số nguồn chưa sẵn sàng. Nguồn đổi làm tổng quan cũ trở thành STALE; không âm thầm khẳng định tổng quan cũ vẫn cập nhật.
- Chat ưu tiên bằng chứng trong các nguồn đang chọn. Khi không đủ dữ kiện, trả lời rõ giới hạn. Citation bấm được để mở preview đúng phiên bản/trang/đoạn bằng cơ chế Document Service, sau khi kiểm tra quyền. Không có nguồn hợp lệ thì vô hiệu nút gửi và hướng dẫn thêm/chọn nguồn.
- Studio MVP gồm tạo bản tóm tắt và danh sách ghi chú: lưu câu trả lời thành ghi chú hoặc viết/sửa ghi chú thủ công, giữ provenance/citation cho phần AI sinh. Phân biệt ghi chú người dùng với đầu ra AI; ghi chú thủ công không tự thành nguồn RAG. Đầu ra có trạng thái đang tạo/hoàn tất/lỗi/STALE, có hủy/retry và không mất kết quả đã hoàn thành.
- Các mở rộng như hướng dẫn học, audio/multimedia và chia sẻ notebook chỉ được đánh giá khi có yêu cầu riêng sau MVP. Flashcard và quiz không thuộc phạm vi kế hoạch.
- Khi file mất quyền, chặn sử dụng nguồn ngay và ẩn excerpt/citation liên quan. Với lịch sử, ghi chú AI, tổng quan và cache có nội dung suy ra từ nguồn đó: MVP ẩn toàn bộ artifact chịu ảnh hưởng cho tới khi xác minh lại hoặc tạo lại từ nguồn còn hợp lệ; chỉ ẩn đường link là chưa đủ. Xóa nguồn khỏi notebook làm các artifact phụ thuộc trở thành STALE; không xóa file gốc trong Document Service. Xóa notebook chỉ xóa dữ liệu notebook và lên lịch dọn bản sao chỉ mục khi không còn tham chiếu hợp lệ.

## Kiến trúc áp dụng

| Thành phần | Công nghệ và trách nhiệm |
| --- | --- |
| Giao diện | Next.js hiện có; `/ai` danh sách notebook, không gian ba vùng nguồn/chat/Studio, tiến độ và streaming |
| API | NestJS: tạo mới `backend/ai-service`, quản lý hội thoại, job, quota và quyền; đi qua Kong |
| Nguồn tài liệu | Document Service tiếp tục quản lý file, phiên bản, chia sẻ, thùng rác và quyền; S3 giữ file gốc |
| Hàng đợi | BullMQ trong Node worker; Redis dùng prefix riêng, cấu hình persistence và giới hạn đồng thời |
| Xử lý nội dung | Tạo `backend/rag-worker` bằng Python: Docling phân tích; LlamaIndex chia đoạn, điều phối embedding và retrieval |
| Vector | Qdrant với payload documentId/versionId/scopeId/indexGeneration; lọc phạm vi ở server |
| Metadata | PostgreSQL `ai_db`: mapping, job, hội thoại, tin nhắn, citation và cache; migration mới có kiểm soát |
| Model | Embedding BGE-M3 hoặc model đa ngôn ngữ được benchmark; LLM adapter cấu hình được, thử VIBI trước |

Luồng nhập: frontend → Document Service/S3 → AI API kiểm tra quyền → BullMQ → Node worker gọi Python nội bộ → Docling → LlamaIndex → embedding → Qdrant → cập nhật READY.

Luồng hỏi: frontend → Kong → AI API kiểm tra quyền và phiên bản → Python retrieval với allowlist → kiểm chứng nguồn → gọi LLM → stream về frontend. Không xếp tác vụ chat vào sau hàng đợi parse dài. Chỉ server giữ khóa model/Qdrant và thông tin truy cập nội bộ. UI không truy cập Qdrant/Python trực tiếp.

Node giữ quyền sở hữu job BullMQ; Python không tự thao tác định dạng queue Redis. Job dài gọi theo từng bước có checkpoint, deadline và mã job; Node renew lock trong lúc xử lý. Không tạo process Python mới cho mỗi file.

## Các bước thực hiện và nghiệm thu

- [ ] **1. PoC tài nguyên và model:** đo CPU/RAM/disk thực tế; chọn và pin phiên bản Docling/LlamaIndex/Qdrant/BullMQ. Thử PDF văn bản, DOCX, TXT, MD tiếng Việt bằng dữ liệu mẫu; PDF scan/OCR là nhánh riêng. So sánh embedding API với BGE-M3 local trước khi chọn; không giả định máy đủ RAM/GPU hoặc VIBI cung cấp embedding. **Đạt khi:** đo được thời gian parse, embedding, retrieval, TTFT và tổng thời gian LLM; model đáp ứng chất lượng và tài nguyên. Không chọn stack cuối chỉ dựa trên tên thư viện.
- [ ] **2. Nền tảng và contract:** tạo skeleton NestJS/Python, health/readiness, Docker Compose phát triển và `.env.example` không có key; cấu hình Kong, Redis prefix, Qdrant collection và PostgreSQL migration. Dùng lại cơ chế JWT/internal credential của dự án, không tin header user do client tự đặt. **Đạt khi:** start/restart được, không xung đột stack hiện tại; Python/Qdrant không public; chưa bật AI cho người dùng.
- [ ] **3. Dữ liệu và phân quyền:** định nghĩa Notebook(owner/title), NotebookSource(pinned revision), SourceRevision(document/version/hash), IndexGeneration(parser/chunker/embedding version), Job, Conversation, Message/SourceSnapshot/Citation, Note và StudioArtifact/ArtifactSourceDependency cùng SummaryCache. Ghi chú có loại MANUAL hoặc SAVED_AI; artifact ghi model/prompt version, ngôn ngữ, tập nguồn và revision để kiểm tra quyền/invalidation. Document Service cung cấp API nội bộ resolve đúng phiên bản và kiểm tra quyền; AI kiểm tra trước truy xuất, trước gửi LLM và trước trả citation/lịch sử/ghi chú/artifact/cache. Scope riêng theo user hoặc workspace; metadata không tự thay thế ACL. **Đạt khi:** user A không truy xuất notebook/dữ liệu B qua ID giả, vector filter, cache hoặc hội thoại cũ; thu hồi quyền chặn cả nội dung AI suy ra, kể cả khi cleanup chưa xong. Gặp lỗi xác minh quyền phải từ chối truy cập.
- [ ] **4. Pipeline lập chỉ mục:** upload bytes từ S3 đã xác thực, kiểm MIME/kích thước/hash, Docling parse, chuẩn hóa locator, LlamaIndex chunk, embedding batch, Qdrant upsert idempotent; trạng thái QUEUED/PARSING/EMBEDDING/READY/FAILED/STALE. Dùng outbox/job bền vững, checkpoint, backoff và reconciliation; retry không nhân đôi chunk. Phiên bản mới tạo generation mới rồi chuyển active sau khi hoàn tất; archive/delete/đổi quyền vô hiệu truy vấn ngay và dọn bản sao với retry. **Đạt khi:** restart tiếp tục được, file trùng không vector hóa lại, không lẫn vector khác model/kích thước, không gửi toàn bộ thư viện sang model khi hỏi.
- [ ] **5. Hỏi đáp và trích dẫn:** bắt đầu dense retrieval với lọc allowlist và giới hạn token; hybrid chỉ bật sau benchmark (BGE-M3 dense không tự tạo sparse search, cần pipeline sparse/fusion riêng). Reranker tùy chọn khi đo được lợi ích. LLM adapter nhận evidence đã kiểm tra, prompt coi nội dung là dữ liệu không đáng tin, có từ chối khi thiếu nguồn; citation ánh xạ chunk → phiên bản file/trang/đoạn. **Đạt khi:** trả lời có nguồn hợp lệ, không bịa citation, không lấy đoạn ngoài file đã chọn; có test prompt injection, câu hỏi thiếu dữ kiện và tài liệu mâu thuẫn.
- [ ] **6. Notebook, streaming và giao diện:** tạo `frontend/web/features/ai` với danh sách notebook và không gian nguồn/chat/Studio. API đề xuất dưới `/api/ai`: `/notebooks`, `/notebooks/:id/sources`, `/notebooks/:id/conversations`, `/conversations/:id/messages`, `/notebooks/:id/notes`, `/notebooks/:id/artifacts`, `/jobs` và `/requests/:id/cancel`; nguồn, hội thoại, note và job phải được kiểm tra thuộc đúng notebook/owner. Streaming dùng fetch + ReadableStream, UI hiện ngay trạng thái parse/retrieve/generate, lỗi và số phần hoàn tất. Abort đóng request upstream và giải phóng slot; remote có thể vẫn xử lý nếu không hỗ trợ cancel. Timeout tổng có cấu hình, lỗi chưa rõ kết quả không tự replay. **Đạt khi:** tạo notebook → thêm nguồn Document Service → chọn subset → chat/citation → lưu/sửa ghi chú hoạt động; mobile dùng tab được; hủy giải phóng slot local ≤2 giây, chat mới không bị tác vụ đã hủy chặn; disconnect không âm thầm chạy lại hoặc tạo hai câu trả lời.
- [ ] **7. Tổng quan, Studio và cache:** tạo tổng quan ngắn/câu hỏi gợi ý theo tập nguồn READY; job không được tự kích hoạt lặp lại khi refresh trang. Tách tóm tắt nhanh theo phần trích dẫn khỏi tóm tắt toàn văn có độ phủ. Toàn văn dùng job riêng, map/reduce ngắn, concurrency ban đầu 2 chỉ khi quota cho phép; lưu kết quả từng phần và tiến độ, cho phép tiếp tục. Cache theo user/scope, revision hash, model, prompt, ngôn ngữ và mức chi tiết; kiểm quyền khi cache hit. Giới hạn output thật ở provider, không chỉ nhắc số từ trong prompt; cắt token phải được nhận diện. **Đạt khi:** tổng quan, câu hỏi gợi ý, bản tóm tắt và ghi chú được lưu đúng notebook; file không đổi tái sử dụng được kết quả, không mất phần đã xong sau quota, không tuyên bố hoàn tất khi thiếu phần; đổi/xóa/thu hồi quyền nguồn cập nhật STALE hoặc ẩn artifact theo quy tắc trên và không chặn luồng chat.
- [ ] **8. Kiểm thử và triển khai:** unit/contract với provider giả; E2E upload → index → chat → citation → cancel → version/delete/revoke; benchmark 20–30 câu hỏi tiếng Việt trên 1/2/5 file, cold/warm và đồng thời 2 người. Mục tiêu ban đầu sau index: TTFT p95 ≤10 giây, tổng Q&A p95 ≤45 giây; đo chi phí/token/RAM và ghi rõ khi provider không đạt. Test độ phủ và chất lượng tóm tắt riêng, không hứa thời gian cố định cho mọi file. Bổ sung CI, backup/restore PostgreSQL/Qdrant và Redis job recovery; rollout feature flag, có rollback. **Đạt khi:** không rò dữ liệu, không treo sau hủy, test đạt, số đo được công bố và vận hành không ảnh hưởng Document Service khi AI tắt.

## Mặc định và giới hạn đề xuất

Ban đầu giữ tối đa 5 file/hội thoại, 20 MiB/file và 50 MiB/lượt; thêm trần token sau parse, timeout OCR và giới hạn số trang theo PoC. Kích thước file không thay thế giới hạn token. Rate limit theo user và provider, có retry-after; giới hạn parse/embedding/chat riêng. Model/provider timeout phải được đo rồi cấu hình, tránh đổi sự chờ lâu thành chuỗi timeout lặp lại.

Ưu tiên PDF văn bản/DOCX/TXT/MD; bật OCR sau kiểm thử. Giữ S3, không thêm MinIO nếu chưa có nhu cầu local storage riêng. Redis hiện có chỉ tái sử dụng khi chính sách eviction/durability phù hợp BullMQ; nếu không, dùng instance queue riêng. Database AI cũ đang còn trên máy: xác minh và backup trước khi dùng `ai_db`; không chạy migration mới đè schema cũ hoặc tự xóa dữ liệu.

## Thứ tự và đầu ra bàn giao

Thực hiện 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Chốt PoC tài nguyên/model và quyền trước khi đầu tư giao diện. Ước lượng sơ bộ 10–15 ngày công cho MVP có phân quyền và vận hành; OCR khó hoặc local model thiếu tài nguyên làm tăng thời gian. Mỗi bước có mã, test và hướng dẫn chạy; chỉ bật mặc định sau nghiệm thu. Không phục hồi các file đã xóa từ commit cũ làm nền mới.
