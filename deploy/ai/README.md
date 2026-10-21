# Notebook AI — MVP phát triển

Mã mới, không phục hồi Python AI service cũ. Frontend `/ai` → notebook → ba vùng Nguồn / Hỏi đáp / Studio. Không có flashcard/quiz. Chỉ có notebook cá nhân và một dòng lịch sử hỏi đáp/notebook ở MVP.

## Thành phần

- NestJS API `backend/ai-service`: danh tính do Kong xác thực/chuyển tiếp, notebook CRUD, quyền nguồn, SSE chat, notes, summary cache.
- BullMQ worker riêng: lập chỉ mục, cleanup, tóm tắt có checkpoint; không đưa chat vào hàng đợi parse.
- `backend/rag-worker`: Docling cho PDF/DOCX, LlamaIndex SentenceSplitter, embedding đa ngôn ngữ, Qdrant dense + lexical fusion. Qdrant chỉ tìm trong notebook và các source ID do API xác minh.
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

Mặc định dùng `intfloat/multilingual-e5-small` CPU để có baseline nhẹ hơn BGE-M3. Model tải lần đầu và cache tại volume `notebook-models`; không giả lập vector trong production. Muốn dùng BGE-M3: đổi `EMBEDDING_MODEL=BAAI/bge-m3`, đo RAM/tốc độ/chất lượng, rồi lập lại chỉ mục. Chưa triển khai sparse multi-vector riêng của BGE-M3; hybrid hiện dùng dense + lexical fusion.

Có thể dùng API embedding bằng `EMBEDDING_PROVIDER=api`, `EMBEDDING_BASE_URL`, `EMBEDDING_API_KEY`, `EMBEDDING_MODEL`. Base URL phải có endpoint `/embeddings`. **Không mặc định coi VIBI chat endpoint có embedding.** Với API cần kiểm tra giới hạn batch/quota thực tế trước khi dùng.

Collection gắn với provider/model/chunker/`INDEX_PIPELINE_VERSION`, không trộn vector từ các model khác nhau. Sau khi đổi pipeline, bấm **Lập lại chỉ mục** từng nguồn (hoặc bỏ/thêm lại). Không tự drop collection cũ; cleanup collection hết dùng là công việc vận hành sau khi backup và kiểm tra tham chiếu.

PDF chỉ nhận văn bản, không mã hóa, ≤100 trang. OCR tắt ở MVP. DOCX có giới hạn kích thước giải nén; TXT/MD phải là UTF-8. Không có URL ingestion hoặc parser tải nội dung từ URL người dùng nhập. PDF/DOCX thật và việc tải model Docling vẫn cần smoke test trên Docker trước khi bật dùng rộng rãi.

## Giới hạn, thời gian chờ và tính đúng đắn

- 5 nguồn/notebook, 20 MiB/file, 50 MiB/notebook; 40.000 token sau parse/file, tối đa 2.000 chunk/file. Giới hạn token đo bằng tokenizer của LlamaIndex; không suy từ kích thước byte file.
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

## Kiểm thử

Kiểm tra bảo mật gồm HTTP guard AI (giả mạo context bị 401), chạy mã Lua plugin trong WASM với Kong PDK giả lập, tách khóa/rotation, kiểm quyền Document, batch Calendar và script setup idempotent. Đây là kiểm chứng local/fixture, **không phải E2E qua Kong thật** hay đánh giá model thật. Docker Desktop chưa chạy nên chưa build image/chạy E2E; không coi việc YAML hợp lệ là stack đã hoạt động.

```powershell
# backend/ai-service
npm.cmd ci
npm.cmd test

# backend/document-service
npm.cmd run build
node --test test/notebook-bridge.test.cjs test/internal-access.test.cjs

# backend/calendar-service
npm.cmd test -- --runInBand resource-access.service.spec.ts

# frontend/web
node --test scripts/notebook-stream.test.mjs
npx.cmd tsc --noEmit --incremental false
npx.cmd eslint features/ai "app/(workspace)/ai" components/layout/workspace-shell.tsx

# backend/rag-worker (sau pip install -r requirements.txt)
python -m unittest discover -s tests -v
```

AI tests dùng PostgreSQL WASM/PGlite trong bộ nhớ, Python dùng Qdrant in-memory và embedding fixture ghi rõ trong test. Không gửi tài liệu thật, không dùng key/model thật và không chạm DB cũ. Cần chạy thêm Docker build, server Qdrant (full-text index không hoạt động như server ở in-memory), PDF/DOCX thật, E2E hai user, revoke/version/delete khi đang stream, benchmark 1/2/5 file, crash recovery và backup/restore. Chưa có CI/production rollout cho stack mới. Không tick nghiệm thu các hạng mục này chỉ vì unit test đã qua.

## Rollback an toàn

Tắt `AI_ENABLED`, restart API/jobs hoặc `docker compose stop notebook-api notebook-jobs rag-worker`. Frontend/Document Service ngoài AI tiếp tục hoạt động. Giữ nguyên các volume để bảo toàn notebook/checkpoint; không drop database/collection và không xóa file Document Service khi rollback.

Không đưa `.env`, key hoặc presigned URL vào Git/log/chat. Các key đã từng dán vào hội thoại cần được thu hồi và cấp mới trước khi sử dụng.
