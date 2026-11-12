# AI Service

Source của AI được đặt chung tại đây; mỗi thành phần vẫn chạy trong process riêng:

| Thư mục | Thành phần |
| --- | --- |
| `api` | NestJS API và BullMQ jobs, dùng chung package Node |
| `rag-worker` | Parse tài liệu, embedding, retrieval và OCR |
| `speech-worker` | Nhận dạng âm thanh cho tóm tắt họp |

Notebook chỉ trả lời trong phạm vi các tài liệu đang chọn và thông tin dự án có
trong những nguồn đó. Câu hỏi cá nhân không liên quan được từ chối; câu hỏi nối
tiếp vẫn phải tuân theo cùng phạm vi. Notebook không có quyền mua hàng, tạo lịch
hoặc đọc task Project bên ngoài nguồn tài liệu. Trợ lý công việc là luồng riêng.

Trợ lý công việc chọn kỳ 7/30 ngày trước khi gọi model; câu hỏi nối tiếp dùng kỳ
trong lịch sử còn quyền xem nếu chưa chỉ định kỳ mới. Mỗi câu trả lời dùng một
lượt streaming từ dữ liệu đã lấy. Bot hội thoại truyền lịch sử dưới dạng dữ liệu,
không dựng tool call để đọc lại context đã có.

Tổng hợp tóm tắt gửi mỗi ghi chú một lần và giữ nhãn trích dẫn nguồn gốc. Các
luồng dùng ChatOpenAI chỉ lưu phản hồi kết thúc bằng `stop`, không có tool call
ngoài dự kiến và nằm trong giới hạn nội dung.

Kết nối LLM dùng HTTP agent riêng và giữ lại kết nối để giảm số lần mở TCP mới.
Mỗi lần kết nối chờ tối đa 10 giây, tối đa 3 lần trong cùng deadline LLM hiện có.
Chỉ `UND_ERR_CONNECT_TIMEOUT` hoặc `ETIMEDOUT` tại syscall `connect`, trước khi
gửi được HTTP request, mới được thử lại với JSON body có thể gửi lại. Không tự replay lỗi HTTP, lỗi socket
không rõ kết quả hoặc stream đã bắt đầu; checkpoint tóm tắt vẫn chờ người dùng
chọn tiếp tục khi cần.

Notebook gửi heartbeat mỗi 15 giây sau khi xác thực nguồn để giữ kết nối trong
lúc chờ model. Parser SSE hỗ trợ dữ liệu chia nhỏ, UTF-8, CRLF và frame cuối
thiếu newline. Lỗi kết nối, quota, trích dẫn, định dạng, phiên bản nguồn và phản
hồi bị ngắt có thông báo riêng. Retry question chỉ gửi lại khi người dùng bấm;
lỗi refresh sau khi lưu thành công không được gửi lại model.

Log `notebook_generation_failed` và `notebook_summary_failed` có trường `stage`
để phân biệt retrieval, model, kiểm tra quyền và lưu kết quả; log không chứa câu
hỏi, tài liệu, nội dung phản hồi hoặc thông tin xác thực. `/ready` xác nhận dịch
vụ nội bộ sẵn sàng, không bảo đảm provider bên ngoài luôn truy cập được.

## Chuẩn bị

### Gemini embedding và tài liệu chạy song song

`VISION_CONCURRENCY=3` cho phép đọc tối đa 3 ảnh cùng lúc trên toàn process worker,
không phải 3 ảnh cho mỗi tài liệu. Mỗi ảnh vẫn được kiểm tra quyền và lưu mô tả
riêng; kết quả trả về giữ thứ tự ảnh, tiến độ không lùi khi ảnh hoàn tất lệch thứ
tự. Nếu một ảnh lỗi, chờ các ảnh đang chạy lưu xong trước khi báo lỗi; lần Retry
dùng lại mô tả đã lưu. Ảnh trùng nội dung và ngữ cảnh trong cùng lượt xử lý chia
sẻ một yêu cầu Vision. Giới hạn RPM/TPM/ngày vẫn được áp dụng trước mỗi lần gọi.

`EMBEDDING_LOCAL_ENABLED=true` thêm `intfloat/multilingual-e5-small` làm model
thứ ba bên cạnh hai Gemini. Local dùng cache model có sẵn, khóa CPU riêng và
collection 384 chiều; hai Gemini tiếp tục dùng collection 768 chiều riêng biệt.
Tìm kiếm chạy trên mọi model, gộp thứ hạng và loại kết quả trùng. Dùng nhiều model
tăng lượng công việc, không bảo đảm nhanh hơn. Khuyến nghị giới hạn RAM RAG 3 GiB.
Trước khi bật, đồng bộ chunk vào local bằng
`node backend/scripts/migrate-gemini-embeddings.cjs --apply --model=intfloat/multilingual-e5-small`.

Thêm `EMBEDDING_SECONDARY_MODEL=gemini-embedding-2` để dùng cả Embedding 1 và 2.
Mỗi model có collection riêng. Nội dung chỉ parse một lần rồi embedding đồng
thời cho hai model; tìm kiếm chạy cả hai, gộp theo thứ hạng và loại đoạn trùng.
Summary chỉ đọc một bộ nội dung để không nhân đôi trích dẫn. Embedding 2 dùng
prefix truy vấn/tài liệu, không gửi `taskType`; từng chunk là một request trong
batch để không bị gộp thành một vector. Việc chạy hai model tăng số request/token.

Trước khi bật model thứ hai, tạo vector bằng
`node backend/scripts/migrate-gemini-embeddings.cjs --apply --model=gemini-embedding-2`.
Script giữ nguyên model đang chạy, kiểm tra quyền/snapshot và bỏ qua chunk đã
chuyển thành công. Nếu một model lỗi khi tìm kiếm, model còn lại vẫn trả kết quả;
lỗi quota của truy vấn không được chờ/thử lại khiến cả luồng bị treo.

Ở chế độ `ensemble`, `/ready` yêu cầu model chính sẵn sàng vì model này còn
phục vụ parse và đọc toàn bộ chunk. Model phụ lỗi warm-up không làm dịch vụ
mất readiness; `embeddingAvailableModels` chỉ liệt kê các model đã kiểm tra
thành công trong lần probe đó. Chế độ `shard` vẫn yêu cầu đủ shard cần thiết
hoặc local fallback khi hết quota.

`EMBEDDING_PROVIDER=gemini` dùng `gemini-embedding-001`, vector 768 chiều,
`RETRIEVAL_DOCUMENT` cho nội dung và `RETRIEVAL_QUERY` cho câu hỏi. Key nằm trong
`deploy/ai/.env`, không dùng chung key chat và không ghi vào log. Xem mẫu tại
[`embedding-gemini.env.example`](../../deploy/ai/embedding-gemini.env.example).

Worker hỗ trợ `NOTEBOOK_INDEX_CONCURRENCY=5`: tối đa 5 tài liệu cùng embedding,
khớp giới hạn 5 tài liệu mỗi Notebook. Parser CPU được khóa riêng; thời gian chờ
API không giữ khóa parser. HTTP pool có chỗ riêng cho câu hỏi và kiểm tra vector
đầy đủ, đúng thứ tự, đúng số chiều trước khi lưu. Lỗi 429 được chờ và thử lại có
giới hạn; lỗi mạng không rõ kết quả không được tự gửi lại tại lớp embedding.

Khi đổi model/provider/số chiều, phải tạo vector mới trong collection riêng trước
khi chuyển retrieval. Giữ collection local cũ để có thể quay lại; không trộn hai
không gian vector. `NOTEBOOK_INDEX_TIMEOUT_MS=900000` cho phép job chờ quota trong
quá trình xử lý tài liệu; giá trị mặc định khi chưa bật API vẫn là 240000.

Chạy các lệnh bên dưới từ **repository root**. Docker Desktop và hạ tầng
WorkspaceHub phải đang chạy, có network `wh_network`, PostgreSQL `wh_postgres`,
Redis `wh_redis` và database `notebook_db`. AI tiếp tục dùng PostgreSQL/Redis chung.

Giữ User, Document, Project, Calendar và Communication hoạt động để sử dụng các
tích hợp tương ứng. Frontend và Kong chạy theo hướng dẫn
[local development](../../docs/local-development.md).

Docker đọc `deploy/ai/.env`. Node chạy trực tiếp trên host đọc `api/.env` khi
terminal đang ở `backend/ai-service/api`. Các file `.env` trong hai worker được
giữ riêng cho cách chạy host; Compose truyền cho worker các biến được khai báo
trong `deploy/ai/compose.yml`. Sửa env chỉ có hiệu lực sau khi restart process
hoặc recreate container tương ứng.

Để sử dụng đủ các tính năng hiện có, kiểm tra các cờ sau:

| File | Cờ cần bật |
| --- | --- |
| `deploy/ai/.env` | `AI_ENABLED=true`, `CONVERSATION_AI_ENABLED=true`, `WORK_ASSISTANT_ENABLED=true`, `MEETING_SUMMARY_ENABLED=true` |
| `deploy/ai/.env` | `VISUAL_ENABLED=true` nếu dùng ảnh hoặc PDF scan |
| `backend/communication-service/.env` | `CONVERSATION_AI_ENABLED=true`, `MEETING_SUMMARY_ENABLED=true` cho bot chat và tóm tắt họp |

Nếu Communication đang tắt hai cờ tích hợp này, bật chúng và restart
Communication khi muốn sử dụng. Việc chuyển folder giữ nguyên giá trị env.
Credential theo từng chiều giữa các service phải khớp; xem
[env contract](../../docs/local-env.md).

Vision dùng model/provider trong `LLM_MODEL` và `LLM_BASE_URL`; model phải hỗ trợ
nhận ảnh. OCR local có thể trích chữ nhưng không thay thế khả năng hiểu hình ảnh.
Việc chuyển folder không kiểm chứng khả năng Vision hoặc thay model/fallback.
Tóm tắt họp cần recording đã có; ghi cuộc họp mới còn cần LiveKit/Egress và
cấu hình recording của Communication.

## Khởi động toàn bộ AI bằng Docker

```powershell
docker compose --env-file deploy/ai/.env -f deploy/ai/compose.yml --profile meeting-summary config --quiet
docker compose --env-file deploy/ai/.env -f deploy/ai/compose.yml --profile meeting-summary up -d --build
docker compose --env-file deploy/ai/.env -f deploy/ai/compose.yml ps
```

Lệnh này chạy Qdrant, RAG, speech, migration AI, API và jobs. Container migration
hoàn tất trước API/jobs. Profile `meeting-summary` cần có để chạy speech worker.
Lần build đầu có thể tải dependency và model public; những lần sau dùng cache
hiện có. Project Compose vẫn là `wh-notebook` với cùng tên service và volume.

```powershell
docker compose --env-file deploy/ai/.env -f deploy/ai/compose.yml logs -f notebook-api notebook-jobs rag-worker speech-worker
Invoke-RestMethod http://127.0.0.1:8087/ready
```

`/health` chỉ kiểm tra process; `/ready` còn kiểm tra DB, Redis, heartbeat jobs,
RAG, Document và speech khi tóm tắt họp được bật. Sau khi sẵn sàng, mở
`http://localhost:3000/ai` qua frontend/Kong. Bot chat, trợ lý công việc và tóm tắt
họp được dùng trong các màn hình nghiệp vụ tương ứng.

API publish cổng `127.0.0.1:8087`; RAG, speech và Qdrant giao tiếp trong Docker.
Đảm bảo API chạy host không chiếm cổng 8087 khi khởi động stack Docker.

## Dừng

```powershell
docker compose --env-file deploy/ai/.env -f deploy/ai/compose.yml --profile meeting-summary stop
```

Lệnh `stop` giữ container và volume để lần sau tiếp tục sử dụng dữ liệu/model
cache. Không dùng `down -v` để dừng môi trường đang có dữ liệu.

Chi tiết cấu hình và production nằm trong
[AI deployment guide](../../deploy/ai/README.md).
