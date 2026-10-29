# AI Service audit — 29/10/2026

Đã hoàn tất kiểm tra tự động và các kịch bản tích hợp trên stack QA cô lập. **628 test tự động đạt; 35/35 test RAG/OCR chạy đủ, không skipped.** HTTP harness kiểm tra 25/25 route AI. Các luồng chính chạy thêm qua Kong/JWT, database, queue, embedding và model thật. Kết quả này không chứng nhận AI đúng 100% trong mọi tình huống hoặc toàn bộ hạ tầng production.

## Kết quả đã chạy

| Nhóm | Kết quả | Bằng chứng và phạm vi |
| --- | --- | --- |
| Kiến trúc | 79 file TypeScript, 25 route AI | [Kiến trúc/checklist](architecture.md), [inventory](architecture-inventory.json); chỉ ghi nhận tính năng có trong code. |
| AI Service | 305/305 test đạt | [Kết quả](../ai-performance/tests.json): SQL cô lập, HTTP, agent/tools, auth, quota, SSE, cancellation, checkpoint, shutdown và lỗi upstream. |
| Frontend/Project/Calendar/Speech | 15/15 test đạt | [Runner](../ai-service-audit-results.json); build/lint AI và typecheck liên quan đạt. |
| Communication | 273/273 test, 46/46 suite đạt | [Jest](communication-regression.json); compiled service chạy @ai thực tế. |
| RAG/OCR | 35/35, 0 skipped | [Docker/Tesseract](native-ocr.json); thay thế 30 pass + 5 skipped trên Windows, không cộng trùng. |
| HTTP AI | 25/25 route có ca thành công | [Coverage](http-coverage.json); có cả sai JSON, UUID, owner, gateway key, SSE, cancellation và lỗi upstream trong harness. |
| Native Notebook/Studio/Work | 6/6 kịch bản đạt | [Native flow](native-flow.json): hai tài khoản đăng ký/đăng nhập thật, JWT, chống giả x-user-id, signed upload, ingestion, retrieval, grounded chat, chia sẻ/thu hồi, summary worker và Project Work Assistant. |
| Lịch sử và @ai | 3/3 kịch bản đạt | [Bổ sung](native-additional.json): ẩn câu trả lời đã lưu sau thu hồi quyền; @ai đọc history, gọi model, lưu đúng một reply và outbox PUBLISHED; 100 GET qua gateway. |
| Meeting summary | Đạt | [Native meeting](native-meeting.json): quyền recording, signed media, FFmpeg → Whisper → model → SQL; gọi lại giữ kết quả. Metadata recording là fixture; không kiểm tra LiveKit capture. |
| Native recovery | 4/4 kịch bản đạt | [Recovery](native-recovery.json): khóa PostgreSQL giữa process độc lập, giới hạn 2 active/10 recent, unique active notebook, Redis AOF/job chờ, restart PostgreSQL/Qdrant/API/worker. |
| S3 adapter | Đạt | [S3](native-s3.json): AWS SDK HTTP với Moto local; HEAD/ETag/version, signed GET, đổi revision, object thiếu; không kiểm định AWS cloud. |
| Model chất lượng | 5 ca smoke đạt | Các file live-model*.json: Notebook, Conversation injection/tool, Work metrics, Meeting unknowns và Vision. Một lần bị quota đã được lưu; ca chạy riêng sau đó đạt. |
| Speech chất lượng | WER 1/26 từ ≈ 3,85% | [WER](speech-accuracy.json), chỉ một clip public tiếng Việt. |
| Retrieval evaluation | 50 câu tổng hợp | [Evaluation](retrieval-evaluation.json): BM25/RRF trên candidate fixture; native embedding kiểm tra riêng trên một tài liệu tổng hợp. |

628 = 305 AI + 15 liên quan + 273 Communication + 35 RAG/OCR. Các kịch bản native, model smoke và evaluation báo riêng, không cộng vào số unit/integration test này. [results.json](results.json) chứa bằng chứng tổng hợp.

## Hạ tầng thực sự được dùng

Kong/JWT/plugin hiện tại; User Service Spring Boot; các process Document, Project, Calendar, Communication và AI/worker từ source hiện tại. PostgreSQL 17, Redis AOF/noeviction, Qdrant server, Kafka và RAG Docker chạy riêng với credential/database/volume QA. RAG tải thật multilingual-e5-small từ volume weights chỉ đọc. Grounded chat có evidence Qdrant và citation lưu SQL. S3 dùng Moto local qua SDK/signed HTTP; không sửa .env ứng dụng.

100 GET notebook, concurrency 10: 0 lỗi, p50 9 ms, p95 49 ms trong lượt chạy local. Không suy ra capacity model, p95 production hoặc SLA từ kết quả này.

Recovery dừng worker trước khi enqueue cleanup, xác nhận job waiting, restart Redis và xác nhận job còn; restart PostgreSQL/Qdrant và kiểm tra history/evidence; khởi động worker và xác nhận cleanup completed. Sau restart API, history và artifact hoàn tất vẫn còn. Không chứng nhận mọi crash giữa request model tính phí.

## Lỗi đã xác minh và sửa

- **AI-QA-01 — P2:** giữ HTTP 403 khi tải lại Project context theo timezone sau thu hồi quyền; regression trước sửa thất bại, sau sửa đạt.
- **AI-QA-02 — P2:** cache Studio phân biệt provider, model hiệu lực và output token budget; [regression trước/sau](regression-before.json).
- **AI-QA-03 — P1:** Communication không khởi động từ build production vì JavaScript còn import src/prisma/prisma.service. Chuyển 19 import ở 12 file sang relative path. Đã build lại, chạy process thật, @ai end-to-end và 273 test Communication đạt.

Lint AI đạt. Lint 12 file Communication còn **119 lỗi và 9 cảnh báo có sẵn**; không tuyên bố lint toàn repo sạch. [Baseline](communication-lint-baseline.json) giữ nguyên thay đổi chưa commit và chỉ đảo 19 import để so sánh: 119 lỗi trước và sau, không có diagnostic mới. Không tự format hoặc sửa lan sang business logic có sẵn.

## Giới hạn còn lại

- AWS thật/IAM/KMS/CloudFront, LiveKit capture/egress và topology production chưa được kiểm định bằng lượt chạy này.
- Load/soak dài hạn, đa node, network partition, disk pressure/OOM và crash giữa request model tính phí cần staging chuyên biệt.
- Chất lượng model/STT/embedding cần corpus đại diện được review. Một tài liệu dense retrieval, vài câu trả lời đúng và citation hợp lệ không bảo đảm semantic entailment hay chống mọi injection. Không chứng nhận mọi nhánh Docling/parser từ các fixture đã chạy.
- HTTP harness bao phủ đủ route AI nhưng có upstream fixture; native kiểm tra các luồng chính đã liệt kê, không thay thế mọi tổ hợp tích hợp hoặc mọi cấu hình provider.

## Khôi phục môi trường

Đã dừng process QA, xóa riêng container/network/ba volume dữ liệu QA, giữ nguyên volume model có sẵn và dừng Docker Desktop. .wslconfig được khôi phục đúng từng byte về cấu hình gốc memory=4GB; shutdown WSL bình thường hoàn tất để áp dụng lại. [Bằng chứng cleanup](native-cleanup.json).

## Chạy lại

Từ gốc workspace_hub:

```powershell
node backend/scripts/verify-ai-service.mjs
node backend/scripts/summarize-ai-audit.mjs
node backend/scripts/live-ai-comprehensive.cjs --run
```

Lệnh cuối gọi model thật và có thể tính phí. Native cần stack/weights/Java/Python phù hợp: prepare-native-ai-audit.cjs tạo compose/credential QA; bootstrap-native-ai-audit.cjs khởi tạo DB/process; các test-native-*.cjs chạy từng nhóm. State cũ trong .tmp được giữ làm bằng chứng; script chuẩn bị từ chối ghi đè nên cần state QA mới cho lượt mới.