# Notebook AI — MVP phát triển

Mã mới, không phục hồi Python AI service cũ. Frontend `/ai` → notebook → ba vùng Nguồn / Hỏi đáp / Studio. Không có flashcard/quiz. Chỉ có notebook cá nhân và một dòng lịch sử hỏi đáp/notebook ở MVP.

Cấu trúc mã Node.js theo feature module và ranh giới hạ tầng/jobs: [kiến trúc hệ thống và AI](../../docs/architecture.md). Entry point/lệnh Docker, env và endpoint không đổi sau refactor.

## Thành phần

- NestJS API `backend/ai-service`: danh tính do Kong xác thực/chuyển tiếp, notebook CRUD, quyền nguồn, SSE chat, notes, summary cache.
- BullMQ trong process jobs: hai queue/consumer riêng cho index+cleanup và tóm tắt có checkpoint; không đưa chat vào hàng đợi parse.
- `backend/rag-worker`: pypdf cho PDF văn bản, Docling cho DOCX, LlamaIndex SentenceSplitter, embedding đa ngôn ngữ, Qdrant dense + lexical fusion. Qdrant chỉ tìm trong notebook và các source ID do API xác minh.
- PostgreSQL riêng `notebook_db`, schema `notebook_ai`. Không đụng `ai_db`/volume cũ. Redis riêng AOF/noeviction. File gốc vẫn thuộc Document Service/S3; xóa notebook không xóa file gốc.

## Khởi động local

1. Bật Docker Desktop, khởi động hạ tầng WorkSpaceHub hiện có để có network `wh_network`. Document Service và User Service phải đang chạy. Dùng bộ nhớ Docker đủ cho parser và embedding; chưa có số đo RAM thực tế để cam kết cấu hình tối thiểu. Image Python và lần tải model đầu có thể tốn vài phút, khác với thời gian trả lời sau khi index.
2. Sao chép `.env.example` trong thư mục này thành `.env` (file đã được ignore). Không dùng nguyên `.env` Python cũ.
3. Điền các biến:
   - `POSTGRES_PASSWORD`: mật khẩu riêng cho DB notebook. Thay `CHANGE_ME` trong `DATABASE_URL` bằng cùng mật khẩu, URL-encode nếu chứa ký tự đặc biệt.
   - AI **không cần `JWT_SECRET_KEY` hay `JWT_ISSUER`**. User Service phát token, Kong kiểm tra JWT và plugin `jwt-user-context` xóa header danh tính từ client rồi gán lại `x-user-id`, `x-user-email`, `x-user-role`. AI chỉ chấp nhận danh tính hợp lệ từ gateway, không tự decode token làm fallback.
   - Dùng khóa **khác nhau cho từng luồng**, ≥32 ký tự, không còn fallback `local-internal-key` kể cả local. `AI_GATEWAY_KEY` khớp giữa Kong/AI; `AI_DOCUMENT_SERVICE_KEY` khớp giữa AI/Document Service; `RAG_SERVICE_KEY` khớp giữa AI/RAG worker. `CALENDAR_DOCUMENT_SERVICE_KEY` khớp giữa Calendar/Document Service. Không thay `INTERNAL_SERVICE_KEY` legacy của các luồng khác.
   - Sau `npm.cmd ci` trong `backend/ai-service`, từ **gốc repo** chạy `node backend/scripts/configure-ai-security.mjs --apply`, rồi `node backend/scripts/configure-ai-security.mjs --check`. Script yêu cầu 5 file `.env` hiện hữu: AI, `deploy/ai`, Kong, Document, Calendar; chỉ thêm/đồng bộ khóa mới còn thiếu, giữ nguyên khóa/LLM/DB cũ, từ chối nếu khóa đang có không khớp, không in giá trị. Không copy `.env.example` đè `.env` đã cấu hình sau bước này. File `security.env.example` trong từng service mô tả khóa cần nhận. Production provision bằng secret manager hoặc env vận hành, không tự sao chép khóa local lên EC2.
   - `BIND_HOST=127.0.0.1` khi chạy API trên host; cấu hình Docker dùng `0.0.0.0` bên trong container nhưng chỉ publish `127.0.0.1:8087`. AI kiểm tra proof riêng từ Kong **trước** khi nhận `x-user-*`, nên gọi thẳng với header danh tính giả trả 401. Vẫn không mở trực tiếp service ra mạng không tin cậy.
   - `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`: endpoint tương thích OpenAI chat/completions có hỗ trợ SSE. VIBI chỉ là cấu hình mẫu, chưa xác nhận chất lượng/độ trễ/quota của tài khoản.
   - `AI_ENABLED=true` sau khi cấu hình đầy đủ. Cờ mặc định `false`; guard sẽ từ chối các API nghiệp vụ khi tắt.
   - `DOCUMENT_SERVICE_URL=http://host.docker.internal:8085` nếu service chạy host. Nếu chạy cùng Docker network, dùng `http://document-service:8085`.
4. Rebuild/restart Document Service và Calendar sau khi đồng bộ env. `/internal/notebook-documents/resolve` chỉ nhận khóa AI, body `userId`, `userEmail`, `refs`, `download`; `/internal/document-access/resolve` chỉ nhận khóa Calendar, body `userId`, `userEmail`, `documentIds`. Các endpoint này không được mở qua Kong. Document Service vẫn kiểm tra quyền từng file; Calendar dùng nhóm tối đa 50 ID, không cache kết quả quyền, không retry tự động. Thiếu/sai khóa hoặc dependency lỗi trả lỗi an toàn, không chuyển sang gọi external API bằng header giả. Không đưa khóa lên frontend.
5. Từ `deploy/ai`:

```powershell
docker compose --env-file .env config --quiet
docker compose --env-file .env up -d --build
docker compose --env-file .env ps
docker compose --env-file .env logs --tail 50 notebook-api notebook-jobs rag-worker
```

Migration chạy một lần trước API/worker, chỉ tạo schema/bảng/index mới. Mật khẩu DB đã khởi tạo được lưu trong volume: đổi biến env sau đó không tự đổi mật khẩu tài khoản PostgreSQL.

6. Rebuild/restart Kong dùng template vừa cập nhật. Cả hai template đều phải nạp **hai** plugin `jwt` và `jwt-user-context` cho `notebook-ai-routes`; thiếu plugin chuyển tiếp danh tính thì AI trả 401. `kong.host.yml` trỏ `host.docker.internal:8087`; `kong.docker.yml` trỏ `notebook-api:8087` qua `wh_network`. Route SSE không buffer và **không retry** ở gateway. Khi chạy Node trên host Linux, cấu hình địa chỉ bind riêng mà gateway truy cập được và firewall chỉ cho gateway; không mở `0.0.0.0` công khai. Không chạy `docker compose down -v` trên hạ tầng cũ.
7. Chạy frontend như hiện tại, mở `http://localhost:3000/ai`. `NEXT_PUBLIC_API_URL` vẫn trỏ Kong. API mới có `/health` và `/ready` tại `http://localhost:8087`; RAG worker/Redis/Qdrant/DB không publish port host.

`.env.example` của `backend/ai-service` phục vụ cách chạy Node trên host (thay URL DB/Redis bằng địa chỉ thực tương ứng); compose dùng `.env` trong **thư mục này**, không tự đọc file env đang mở trong IDE.

## Embedding và parser

### Tóm tắt và giới hạn câu trả lời

Chat nhận yêu cầu tóm tắt toàn bộ file/tài liệu sẽ tạo tác vụ `SUMMARY` cho đúng các nguồn đang chọn. Tin nhắn được liên kết với tác vụ, tự cập nhật thành bản tóm tắt và trích dẫn ngay trong cuộc trò chuyện khi hoàn tất; không cần chuyển sang Studio. Không cho lưu tin nhắn đang chờ thành ghi chú. Tác vụ tách từng file, xử lý toàn bộ đoạn chỉ mục, lưu checkpoint và chờ khi chạm hạn mức model theo phút trước khi gửi request. Kết quả viết tự nhiên theo nội dung/tên file, không hiển thị số phần xử lý hoặc số đoạn chỉ mục. Không tự phát lại lời gọi đã nhận nội dung hoặc không rõ kết quả; hạn mức ngày vẫn trả lỗi để người dùng kiểm tra.

Mặc định `LLM_MAX_TOKENS=4096`, `LLM_TIMEOUT_MS=90000`; Docker đọc `deploy/ai/.env`, host đọc `backend/ai-service/.env`. Đây là giới hạn đầu ra của từng lời gọi, không phải cam kết model hỗ trợ mọi mức token. Gateway chờ đọc 120 giây, frontend chờ tối đa 150 giây. Nếu provider kết thúc vì `length`, chat giữ phần đã hiển thị với nhãn chưa hoàn tất, không lưu như câu trả lời thành công. Log `ai_model` ghi model, giới hạn, finish reason, số ký tự nội dung/lập luận và thời gian; không ghi nội dung hay khóa.

PDF có lớp văn bản dùng pypdf theo từng trang, không nạp model bố cục/bảng Docling để giảm RAM; đổi lại không cam kết giữ cấu trúc bảng/cột phức tạp. Trang chỉ có ảnh bị chặn vì OCR chưa bật. DOCX vẫn dùng Docling. Pipeline `text-pdf-v2` tách collection mới; nguồn cũ cần lập lại chỉ mục, không tự xóa collection cũ. Mỗi consumer chạy một job/lần; Python vẫn tuần tự hóa index và chỉ tải một model embedding. Docker chỉ cấp ~3,83 GiB đã ghi nhận OOM khi dùng Docling PDF; `mem_limit: 6g` không thể tăng RAM VM Docker. Cần tăng RAM Docker nếu dùng parser bố cục nặng.

Image CPU ghim cặp `torch==2.14.1+cpu` / `torchvision==0.29.1+cpu` từ PyTorch CPU index, theo [hướng dẫn cài đặt PyTorch](https://pytorch.org/get-started/locally/). Không trộn Torch CPU với TorchVision lấy ngẫu nhiên từ PyPI: có thể import lỗi `torchvision::nms`. Build chạy `pip check`, import Docling/SentenceTransformers và gọi NMS thật để phát hiện sớm lỗi native dependency. RAG `/ready` kiểm tra Qdrant mỗi lần và warm-up bằng embedding thật một lần/process; warm-up lỗi trả 503, không tải nhiều bản model đồng thời. API/jobs chờ RAG healthy khi khởi động. Điều này chưa kiểm chứng parser/LLM/quota trên mọi tài liệu; sau đổi image vẫn phải smoke test nguồn thật.

## Bảo vệ vận hành

### Tối ưu ingestion và đo thời gian

- Giữ nguyên giới hạn và kiểm tra trước upload. RAG tái sử dụng **parse/chunk**, không tái sử dụng quyền hay kết quả tìm kiếm: cache trong RAM theo notebook + SHA-256 bytes + đuôi file + pipeline collection, 16 mục/ngân sách dữ liệu 8 MiB/TTL5 phút. Hai bước kiểm tra rồi index có thể chỉ parse/chunk một lần. Nội dung thay đổi, notebook/pipeline/định dạng khác hoặc hết TTL phải parse lại. Không lưu cache plaintext ra disk; cleanup nguồn/notebook xóa cache của notebook. Index thay thế vectors nội bộ không tự xóa cache vừa kiểm tra. Sau restart cache mất; embedding thật và quyền nguồn vẫn kiểm tra như trước.
- API/worker **vẫn tải lại bytes từ Document Service/S3 để xác minh**, không tin token/cache do trình duyệt gửi. Cache không loại bỏ chi phí mạng tải file. Duplicate add một nguồn READY không enqueue embedding lại; thao tác “Lập lại chỉ mục” vẫn là yêu cầu chủ động tái tạo vector.
- Job index/cleanup giữ queue `notebook-jobs`, summary mới dùng `notebook-summary-jobs`, cùng Redis và cùng process jobs. Mỗi lane concurrency1, không nhân thêm model Python. Nhờ vậy summary chờ LLM không giữ slot index mới. Vẫn có cạnh tranh CPU/model lock/Qdrant giữa retrieval và index; đây không phải cách ly tài nguyên tuyệt đối. Summary legacy còn active/waiting/delayed ở queue cũ được để chạy xong, không sao chép/replay sang queue mới. Khi nâng cấp phải restart API **và** jobs cùng phiên bản; rollback về worker cũ chỉ sau khi summary queue mới đã drain, không xóa Redis/DB để rollback.
- API `/ready` kiểm cả hai queue và heartbeat `ready:split-v1` của cả hai consumer; không nhận heartbeat `ready` của worker phiên bản cũ. Recovery tìm cả job legacy và queue summary mới. Shutdown hai consumer/queue; lặp tín hiệu shutdown không đóng DB hai lần. Lỗi startup dọn kết nối và đặt exit code lỗi.
- Log JSON `event=ai_pipeline`: index có `authorize_ms`, `download_ms`, `encode_ms`, `rag_ms`, `finalize_ms`; job có `processing_ms`, `job_age_ms`, `attempt`. `queue_wait_ms` chỉ có ở lần chạy đầu, không gán nhầm tổng tuổi job/retry/backoff thành thời gian chờ thuần. Preflight ghi encode/RAG RPC.
- Log JSON `event=rag_pipeline`: `parse_ms`, `chunk_ms`, `embedding_ms`, `qdrant_ms`, `decode_hash_ms`, `index_lock_ms`, `prepare_cache_hit`, `chunk_count`, `embedding_chunks_per_sec`, `total_ms`, `status`. Warm-up embedding có operation riêng. Giá trị stage không chạy do cache hit là0; không cộng các duration lồng nhau để suy tổng. Metrics không chứa tên/nội dung file, URL, hash nội dung, user/notebook ID hay key. Log rotation hiện có tiếp tục giới hạn dung lượng log.

- API `/health` chỉ là liveness. `/ready` kiểm tra SQL, Redis, RAG đã warm-up, heartbeat worker (TTL45s, cập nhật 10s) và endpoint nội bộ Document Service bằng khóa AI; Document chết/sai khóa trả 503. Probe dùng body rỗng hợp lệ về transport, kỳ vọng validation400, không truy xuất tài liệu. Chưa kiểm tra LLM trên health để tránh sinh chi phí/quota.
- Quét recovery30s: nguồn INDEXING quá6 phút hoặc summary RUNNING quá10 phút **và** BullMQ job đã failed/completed/missing được chuyển FAILED có mã lỗi. Không giành job active/waiting/delayed; BullMQ xử lý stalled lock. Không tự replay LLM, giữ checkpoint cho người dùng chủ động tiếp tục.
- Giới hạn RAG mặc định2GiB (`RAG_MEMORY_LIMIT`), một job/lần, log API/jobs/RAG tối đa3 file×10MiB/container. Giới hạn này bảo vệ máy nhưng DOCX lớn/model embedding khác có thể cần thêm RAM và đo lại; không bảo đảm mọi file20MiB đều xử lý được trong2GiB.
- Lỗi nguồn hợp lệ hóa trả422 `INVALID_SOURCE`; lỗi model/Qdrant trả503 `RAG_DEPENDENCY_FAILED`, MemoryError trả `RAG_MEMORY_PRESSURE`. OS OOM kill không thể bắt bằng Python; Docker restart count/OOM events mới là bằng chứng. Log chỉ operation/loại exception, không ghi exception message chứa nội dung/key/URL.
- `restart: unless-stopped` tự khởi động lại container khi process chết, **không** tự restart khi chỉ unhealthy. Document/User đang chạy host phải được giữ chạy bằng IDE/process manager; Docker health không quản lý chúng. Khi có503: kiểm tra Document, heartbeat, RAG health, Docker memory/restarts trước khi thử lại. Không tăng retry LLM mù quáng hoặc xóa volume để chữa lỗi.

Mặc định dùng `intfloat/multilingual-e5-small` CPU để có baseline nhẹ hơn BGE-M3. Model tải lần đầu và cache tại volume `notebook-models`; không giả lập vector trong production. Muốn dùng BGE-M3: đổi `EMBEDDING_MODEL=BAAI/bge-m3`, đo RAM/tốc độ/chất lượng, rồi lập lại chỉ mục. Chưa triển khai sparse multi-vector riêng của BGE-M3; hybrid hiện dùng dense + lexical fusion.

Có thể dùng API embedding bằng `EMBEDDING_PROVIDER=api`, `EMBEDDING_BASE_URL`, `EMBEDDING_API_KEY`, `EMBEDDING_MODEL`. Base URL phải có endpoint `/embeddings`. **Không mặc định coi VIBI chat endpoint có embedding.** Với API cần kiểm tra giới hạn batch/quota thực tế trước khi dùng.

Collection gắn với provider/model/chunker/`INDEX_PIPELINE_VERSION`, không trộn vector từ các model khác nhau. Sau khi đổi pipeline, bấm **Lập lại chỉ mục** từng nguồn (hoặc bỏ/thêm lại). Không tự drop collection cũ; cleanup collection hết dùng là công việc vận hành sau khi backup và kiểm tra tham chiếu.

PDF chỉ nhận văn bản, không mã hóa, ≤100 trang. OCR tắt ở MVP. DOCX có giới hạn kích thước giải nén; TXT/MD phải là UTF-8. Không có URL ingestion hoặc parser tải nội dung từ URL người dùng nhập. PDF/DOCX thật và việc tải model Docling vẫn cần smoke test trên Docker trước khi bật dùng rộng rãi.

## Giới hạn, thời gian chờ và tính đúng đắn

- Tối ưu nội bộ: nguồn còn hợp lệ kiểm quyền theo batch1–5 file/lần, chỉ tách kiểm từng file sau403 để xác định nguồn mất quyền; không cache quyền và không fan-out sau lỗi503. Lịch sử/notes/artifacts đọc song song sau kiểm quyền. Index không embedding lại chunk đầu. Query vector cache128 mục/120s trong RAM, khóa băm; cache **không** giữ kết quả tìm kiếm, nội dung nguồn hoặc quyết định quyền. Mỗi lần vẫn query Qdrant theo notebook/source và kiểm quyền ở API.

- 5 nguồn/notebook, 20 MiB/file, 50 MiB/notebook; 40.000 token sau parse/file, tối đa 2.000 chunk/file. Giới hạn token đo bằng tokenizer của LlamaIndex; không suy từ kích thước byte file.
- Luồng tải file AI kiểm tra toàn bộ lô trước khi lưu vào Document Service/S3: trình duyệt kiểm tra tên/định dạng, file rỗng, 20 MiB/file, số nguồn và tổng 50 MiB (bao gồm nguồn đã có). `POST /api/ai/notebooks/:id/upload-checks?name=...` nhận bytes `application/octet-stream` tạm thời, header `X-File-Size`, `X-Upload-Count`, `X-Upload-Bytes`; kiểm quyền notebook trước khi đọc, giới hạn đọc 20 MiB/30s rồi gọi RAG `/validate` (45s). Đây là truyền dữ liệu tạm để kiểm tra, **không phải lưu vào thư viện hoặc embedding**. PDF scan/mã hóa/>100 trang, >40.000 token, file hỏng bị từ chối trước upload lưu trữ. Nếu một file không hợp lệ, cả lô chưa bắt đầu lưu file. Giao diện hiển thị “Đang kiểm tra file…” riêng với bước tải/lưu.
- Thêm file có sẵn từ thư viện và thao tác thử lại cũng kiểm tra bytes thật trước khi tạo nguồn/đưa job vào queue. Không tin kết quả do client tự khai. Kiểm tra quota cuối vẫn nằm trong khóa SQL notebook để chống thêm đồng thời. Giữ kiểm tra trong worker làm lớp phòng vệ; file hợp lệ vẫn có thể gặp sự cố mạng/model ở bước xử lý, không coi kiểm tra sớm là bảo đảm dịch vụ luôn thành công. Quá trình kiểm tra chỉ nhận 1 lượt/API process, bận trả429; RAG đang index trả503 `RAG_BUSY`, không xếp thêm công việc parse nặng.
- Cần triển khai lại API, RAG và **render/restart Kong từ template mới** để có CORS cho 3 header trên và override payload 20 MiB riêng AI route (global các route khác vẫn 10 MiB). Giữ JSON API ở64 KiB. Khi có race quota hoặc lỗi mạng sau bước kiểm tra, file đã lưu vẫn nằm trong Tài liệu để chọn thêm lại; không tự xóa file gốc của người dùng.
- Chat: chỉ READY sources, top-8 với ngân sách 16.000 byte đoạn trích; retrieval timeout 20s, LLM mặc định 45s, client deadline 75s. Một chat đang chạy/notebook, tối đa 2 chat đồng thời/user, 10 yêu cầu bắt đầu/phút/user. Quota provider toàn cục bảo vệ nhiều tab/user cùng sử dụng.
- Rate budget provider là ước lượng bảo thủ theo byte + output cap, **không phải** hóa đơn/tokenizer chính xác của provider. Điều chỉnh quota theo tài khoản thực.
- Stream hiển thị là **chưa hoàn tất** tới khi provider trả `finish_reason=stop` và trích dẫn được kiểm tra. Không ghi câu trả lời lỗi/cắt dở như kết quả hoàn chỉnh, không tự gửi lại khi không biết provider đã nhận/chạy hay chưa.
- Hủy chat ghi trạng thái DB, poll local 500ms và abort kết nối. Unit/in-process test đo được giải phóng slot <2s; không bảo đảm provider ngừng tính phí sau client abort. UI cho phép hỏi lại; nếu yêu cầu cũ chưa giải phóng sẽ báo bận, không xếp ngầm thêm một lần sinh.
- Index là thao tác idempotent, retry tối đa 3 với backoff; deadline mỗi lần 240s. File không hợp lệ/quá giới hạn không tự retry. Retry có thể tốn thêm thời gian; cold model cần cache sẵn trước đo hiệu năng.
- Tổng quan là **theo đoạn trích**, không tự tạo khi tải trang. Tóm tắt toàn văn kiểm tra đủ số chunk của mỗi nguồn và xử lý mọi chunk theo nhóm, lưu checkpoint. Bản MVP ghép các tóm tắt phần, **chưa có bước reduce/chắt lọc cuối**. Độ phủ chunk không đảm bảo giữ mọi ý; vẫn cần bộ đánh giá chất lượng. Có giới hạn tối đa 60 nhóm; giảm nguồn nếu vượt.
- Job summary không tự replay gọi LLM sau lỗi mạng/quota; nút “Tiếp tục phần chưa xong” là yêu cầu chủ động. Cache theo notebook/snapshot/model/prompt/ngôn ngữ. Chi phí có thể phát sinh lại cho phần chưa kịp checkpoint, không thể bảo đảm exactly-once với provider không hỗ trợ idempotency.
- Bản MVP trả lời câu hỏi độc lập theo nguồn; **chưa rewrite đại từ/câu hỏi nối tiếp dựa trên lịch sử**. Các câu như “giải thích ý thứ hai ở trên” cần viết lại rõ nội dung.

## Quyền truy cập và thu hồi

Document Service xác minh owner hoặc share trực tiếp theo user ID/email; public-link access không đủ để ingest. Các luồng nội bộ dùng header `x-internal-service-key` với khóa riêng từng endpoint/caller, không còn delegation JWT riêng cho AI. Khóa chứng minh bên gọi, **không thay thế quyền của người dùng**; actor vẫn phải qua kiểm tra tài nguyên. RAG container chỉ nhận khóa RAG/cấu hình embedding, không nhận khóa gateway/Document/LLM/DB. Khóa cho phép caller khai actor nên phải giữ kín, dùng mạng nội bộ và TLS khi đi qua mạng không tin cậy. Chưa triển khai mTLS/OIDC service identity cho toàn hệ thống; các endpoint legacy vẫn giữ cơ chế cũ. URL gốc TTL60s; URL đã ký có thể còn dùng được tới hết TTL sau khi thu hồi quyền.

Kong chỉ thêm proof khi request đã có credential được xác thực qua [Kong PDK](https://developer.konghq.com/gateway/pdk/reference/kong.client/#kongclientget_credential), không chỉ dựa vào decode payload. Cả hai template AI luôn bật plugin JWT trước plugin context. Admin API của Kong không được public; cấu hình plugin chứa khóa phải coi là secret.

Xoay khóa không gián đoạn: triển khai receiver với khóa mới trong biến chính và khóa cũ trong `<KEY>_PREVIOUS`, sau đó cập nhật/restart caller với khóa mới, cuối cùng xóa/restart biến previous sau cửa sổ chuyển tiếp đã định. Receiver hỗ trợ previous: AI gateway, Document AI/Calendar và RAG. Script setup không tự xoay khóa đang có. Production App yêu cầu thêm `CALENDAR_DOCUMENT_SERVICE_KEY` khi nâng phiên bản Calendar/Document; AI production chưa được tích hợp vào pipeline release hiện có.

Kiểm quyền khi add, xử lý nền, hỏi, finalize, preview và đọc lịch sử/cache/ghi chú. Nguồn bị xóa/archived/đổi phiên bản/mất share sẽ làm ẩn nội dung phụ thuộc nguồn; note tự nhập không có dependency nên vẫn giữ. Sửa note lưu từ AI không làm mất dependency. Không cấp quyền notebook cho người khác ở MVP. Tên file trong danh sách nguồn là metadata đã lưu từ lúc add; nội dung/citations bị ẩn khi nguồn không còn hợp lệ.

Các kiểm tra này là fail-closed khi Document Service không sẵn sàng. Poll UI3s và permission check khi stream có cửa sổ trễ; không thể thu hồi dữ liệu đã được người dùng hợp lệ đọc/lưu trước đó. Cần test thu hồi thực tế với hai tài khoản trước rollout.

## Kiểm tra cấu hình và build

Trong `backend/ai-service`, dùng `npm run typecheck` và `npm run build`. Trong frontend dùng `npm run typecheck`, `npm run lint` và `npm run build`. Kiểm readiness của API, jobs và RAG sau khi khởi động.

Test suites/runner cũ đã được gỡ. Báo cáo kiểm thử lịch sử được lưu local, không thay thế xác minh provider, quyền truy cập và dữ liệu thật khi triển khai.

## OCR và đọc hình

`VISUAL_ENABLED=true` bật ảnh PNG/JPEG/WebP, OCR cục bộ bằng Tesseract Việt–Anh, và Vision cho trang/hình cần phân tích. Bật flag chỉ sau khi chủ triển khai chấp thuận gửi ảnh tài liệu tới `https://vibi.top/v1/chat/completions`; cấu hình hiện tại giới hạn đích này. RAG worker không có LLM key; chỉ AI API/jobs gọi nhà cung cấp. `VISION_MAX_TOKENS=2048` là ngân sách đầu ra mỗi lần đọc hình, dùng chung sổ hạn mức với chat/tóm tắt.

Preflight chỉ kiểm tra cấu trúc/kích thước; OCR/Vision chạy nền. Giới hạn: 20 triệu pixel/ảnh gốc, ảnh gửi tối đa 1 MiB, 24 hình/trang cần Vision và 16 MiB dữ liệu ảnh đã mã hóa/file, OCR tối đa 180 giây/file. Vượt giới hạn được báo rõ, không âm thầm bỏ phần. PDF scan thuần chữ có thể chỉ cần OCR. Các trang có hình/sơ đồ vector được render từng trang, tối đa cạnh 2.000 pixel. Hình DOCX được giữ cùng nội dung OCR; chưa nhận PPTX/video.

Ảnh, kết quả trích xuất và checkpoint Vision được lưu trong PostgreSQL theo nguồn/phiên bản. Cache mô tả còn phụ thuộc hash ảnh, ngữ cảnh, model và phiên bản prompt. Xóa nguồn/notebook xóa dữ liệu phát sinh bằng foreign-key cascade. Đọc ảnh trong trích dẫn xác minh lại quyền và phiên bản; phản hồi đặt `Cache-Control: no-store`. Câu hỏi có yêu cầu xem hình chỉ đính kèm tối đa 2 ảnh từ các đoạn trích thuộc nguồn đang chọn; câu hỏi thông thường dùng chỉ mục đã có.

Sau khi đổi flag, build/restart RAG worker và AI API/jobs, chạy migration hiện có. Nguồn READY cũ vẫn đọc được; dùng **Lập lại chỉ mục** để bổ sung OCR/hình. Các bản tóm tắt đã tạo là checkpoint cũ, cần tạo lại sau khi thêm nội dung hình.


## Rollback an toàn

Tắt `AI_ENABLED`, restart API/jobs hoặc `docker compose stop notebook-api notebook-jobs rag-worker`. Frontend/Document Service ngoài AI tiếp tục hoạt động. Giữ nguyên các volume để bảo toàn notebook/checkpoint; không drop database/collection và không xóa file Document Service khi rollback.

Không đưa `.env`, key hoặc presigned URL vào Git/log/chat. Các key đã từng dán vào hội thoại cần được thu hồi và cấp mới trước khi sử dụng.

## Cập nhật worker mà vẫn giữ phản hồi đang xử lý

`notebook-jobs` đặt `stop_grace_period: 4m` để SIGTERM có thời gian chờ các job
đang chạy kết thúc và lưu checkpoint. Không dùng stop timeout ngắn hoặc kill -9
cho cập nhật bình thường. Khi cần dừng thủ công, dùng
`docker stop --timeout 240 wh-notebook-notebook-jobs-1` trước khi thay container.

Conversation worker lưu token nhận việc vào Redis trước khi gọi model. Job
khởi động lại có token nhưng chưa có câu trả lời sẽ gửi thông báo gián đoạn;
job đã có câu trả lời chỉ gửi lại kết quả đó. Không gọi lại model khi kết quả
lần gọi trước chưa xác định. Xem [kiến trúc](../../docs/architecture.md) và theo dõi
trạng thái job/checkpoint trước khi khởi chạy lại tác vụ có provider side effect.
