# Local env examples

Các `.env.example` dưới `backend/` mô tả cấu hình development tại snapshot trước thay đổi security. Chúng được nhóm theo runtime, database, JWT, API nội bộ, endpoint HTTP, Redis/Kafka/outbox, storage, mail/OAuth, meeting, Web Push và AI/worker.

## Cách đối chiếu

Copy từng file của đúng service khi bạn chưa có `.env`; nếu đã có, đối chiếu và cập nhật từng nhóm, không ghi đè credential đang hoạt động. Điền mọi `REPLACE_*` và URL provider thực tế. Mẫu chưa phải môi trường chạy ngay với credential giả. Không commit `.env` thật hoặc backup chứa secrets.

Dòng đang active là baseline được chọn cho mẫu; không có nghĩa mọi dòng đều là startup-required. Dòng comment `# NAME=value` là tùy chọn, tuning hoặc phụ thuộc feature, chỉ bật khi cần. Feature AI/recording được tắt trong mẫu để không bật tích hợp khi chưa cấu hình xong. Một số loader vẫn yêu cầu các biến nền dù feature đang tắt (đặc biệt schema Zod của AI, VAPID startup của Notification).

## Hai contract API key

Source **hiện tại** vẫn đọc `INTERNAL_SERVICE_KEY`, `AI_GATEWAY_KEY`, `AI_DOCUMENT_SERVICE_KEY`, `CALENDAR_DOCUMENT_SERVICE_KEY`, `AI_COMMUNICATION_SERVICE_KEY`, `WORK_ASSISTANT_SERVICE_KEY`, `RAG_SERVICE_KEY`, `MEETING_STT_SERVICE_KEY` và `SPEECH_SERVICE_KEY` tại các vị trí liên quan. Giữ chúng cho tới khi thay đổi caller/receiver/worker/scripts đồng bộ. Các marker legacy giống tên trong các file phải được thay bằng cùng giá trị thực tế; không dùng một key cho mọi mục đích.

Nhóm cuối `API_*` chỉ là contract **kế hoạch** theo yêu cầu người dùng, được comment toàn bộ. `API_INTERNAL_KEY` là key incoming của chính service. `API_PROJECT_SERVICE_KEY` là key outgoing gọi Project và phải bằng `API_INTERNAL_KEY` trong Project. Tương tự với các target khác. Mỗi receiver dùng secret riêng. Key dùng chung theo receiver không xác thực riêng từng caller; không thay JWT/session/permission và không đưa key vào frontend/NEXT_PUBLIC_*.

## Host, database và nguồn nạp env

Các app backend chạy trên host: endpoint nội bộ dùng `127.0.0.1`, PostgreSQL mẫu dùng host port `5433`, Redis `6379`, Kafka `9092`. Chỉnh lại cho khớp môi trường hiện hữu; không đổi hoặc xóa volume để làm theo ví dụ. Database AI dùng marker tên DB thực tế để tránh đoán sai.

`backend/docker/.env.example` chỉ dành cho interpolation của compose infrastructure; `POSTGRES_USER/PASSWORD` không tự tạo/đổi role trong volume đã tồn tại. Giữ role DB hiện tại; chỉ chuyển sang role runtime riêng sau khi đã tạo và kiểm tra quyền.

`backend/livekit/.env.example` dành cho compose LiveKit/Egress. Key pair phải khớp Communication. Với `docker-compose.host.yml`, truyền hai file env cho compose từ repo root theo thứ tự bạn đã kiểm tra (đường dẫn `--env-file` tính theo working directory):

```powershell
docker compose --env-file backend/docker/.env --env-file backend/livekit/.env -f backend/docker/docker-compose.host.yml config --quiet
```

Lệnh trên chỉ validate, không start/update container, không in config chứa secrets. Kong lấy runtime env từ `backend/kong-gateway/.env` qua `env_file` của compose. Kong và Egress trong container gọi host bằng `host.docker.internal`; nó phải resolve được trong môi trường local (Linux có thể cần cấu hình host-gateway, không được đổi URL đó thành loopback của container).

Java/Python không tự nạp `.env` chỉ vì file tồn tại. Inject bằng IDE/launcher hoặc runner hiện tại; Python có thể dùng launcher hỗ trợ `--env-file`. Script `backend/scripts/start-local-speech.mjs` hiện đọc `MEETING_STT_SERVICE_KEY` trong AI `.env` rồi truyền thành `SPEECH_SERVICE_KEY` cho worker, không tự đọc `.env` của Speech. Communication development nạp `.env.local` với override nên cần kiểm tra file đó khi đối chiếu.

Host port RAG `8088` và STT `8090` trong mẫu phải khớp launcher/compose đang chạy; đây là endpoint ví dụ, không phải biến PORT mà Python app tự đọc. Không thêm biến PORT vào worker khi launcher không dùng nó. Các biến do SDK/launcher cung cấp ngầm (AWS credential chain, Java properties, process env chuẩn) không được liệt kê như custom runtime variables của app.

## Key generation và provider credentials

Sinh một API secret local bằng Node.js:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

32 byte random xuất thành 64 ký tự hex. Dùng một secret riêng mỗi receiver cho contract tương lai. AWS/Google/LLM/embedding lấy credential từ provider; VAPID phải sinh cặp VAPID đúng chuẩn; LiveKit key pair phải khớp server. Không dùng chuỗi random API key để thay tất cả các loại credential.

## Phạm vi và kiểm chứng

Chỉ thêm env examples và tài liệu; chưa sửa logic xác thực, outbox, migration, compose hay production. Các biến hiện tại được đối chiếu với `process.env`, Java `@Value`/application YAML, Python `os.environ`/`getenv`, Prisma datasource, Kong renderer và Compose interpolation. Không xem `${JSON...}`, `${UPLOAD_POLICY...}` và các template expression trong TypeScript là env.

Danh sách ở `env-example-inventory.json` ghi các biến hiện được đọc và nơi tham chiếu; `API_*` kế hoạch được ghi riêng. Tất cả biến trong inventory đều có mặt một lần ở file mẫu tương ứng, active hoặc commented. Không thể xác nhận env thật của bạn đúng hoặc integration hoạt động chỉ từ file mẫu; bước đó cần validator/runtime tests sau khi bạn cập nhật giá trị local.
