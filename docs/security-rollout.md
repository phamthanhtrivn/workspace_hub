# Security rollout và checklist tự kiểm tra

Thay đổi này yêu cầu triển khai User, Project, Communication, Document, Calendar, Notification, AI, Kong và web cùng phiên bản. Không có fallback cho access token cũ thiếu `sid` hoặc email đã xác minh. Không tự đánh dấu email của tài khoản cũ là đã xác minh.

## Chuẩn bị

1. Chạy migration User Service mới `V5__session_authorization_index.sql` bằng migration runner hiện có. Không xóa volume hoặc chạy lại schema từ đầu. Với local, dùng các lệnh sau từ repository root:

   ```powershell
   docker cp deploy/shared/sql-migrations/migrate.sh wh_postgres:/tmp/workspacehub-migrate.sh
   docker cp backend/user-service/src/main/resources/db/migration/. wh_postgres:/migrations
   docker exec -e PGUSER=postgres -e PGDATABASE=user_db wh_postgres sh /tmp/workspacehub-migrate.sh
   ```

2. Local services use the 16 directional caller keys in backend/scripts/local-security/contract.mjs; run node backend/scripts/validate-local-env.mjs to check placement and required configuration. Local runtime database credentials are currently shared by request; this does not provide per-service database isolation. The production/CI credential contract still needs a separate rollout. Never put signing or service keys in NEXT_PUBLIC_* variables.
3. Project, Communication và Notification cần `REDIS_URL`, cùng Redis để đồng bộ room và thu hồi phiên giữa các node. Chat và Document cần `PROJECT_SERVICE_URL`. Production compose đã khai báo các endpoint này; local chỉ được bổ sung endpoint còn thiếu, không xoay credential cũ.
4. `WEB_PUSH_ALLOWED_HOSTS` là danh sách hostname chính xác, phân cách bằng dấu phẩy, lấy từ các push provider mà ứng dụng triển khai hỗ trợ. Không dùng wildcard, địa chỉ IP hoặc tên nội bộ. Thiếu cấu hình thì Web Push không gửi, thông báo trong ứng dụng vẫn hoạt động. DNS phải trỏ toàn bộ tới địa chỉ public; kết nối được ghim vào địa chỉ đã kiểm tra. Không cần đưa VAPID private key ra frontend.
5. Cấu hình `TRUSTED_PROXY_CIDRS` theo các proxy thực sự đứng trước User Service nếu muốn giới hạn theo IP người dùng. Không tin trực tiếp X-Forwarded-For từ nguồn ngoài danh sách này.
6. Avatar dùng staging riêng và xác nhận bytes trước khi gắn profile: JPEG/PNG/WebP, tối đa 2 MiB và 4096 × 4096. Local dùng `avatars/staging/` và `avatars/users/` trong S3 private; xem [local S3](local-s3.md). Cho service quyền đọc, ghi, copy và xóa object ở prefix liên quan. Decoder WebP dùng [TwelveMonkeys ImageIO](https://github.com/haraldk/TwelveMonkeys), phiên bản ghim trong Maven.
7. Chặn truy cập S3/CloudFront công khai tới prefix document riêng tư. Backend streaming là đường tải dành cho trình duyệt; không có redirect sang S3 presign. Đây là cấu hình storage cần đối chiếu trên môi trường triển khai, không tự thay IAM/bucket/CDN production.
8. Restart các service, Kong và web sau khi migration/configuration hoàn tất. Xác minh email hoặc dùng identity Google đã được xác minh để đăng nhập lại. Kiểm tra cấu hình mail trước khi thử flow OTP.

## Contract thay đổi

- `POST /api/auth/verification/send`: `{ email }`; phản hồi chung, mã có hạn 10 phút, có giới hạn gửi và số lần thử.
- `POST /api/auth/verification/confirm`: `{ email, otp }`; xác minh xong đăng nhập lại. OTP xác minh email tách purpose khỏi password reset.
- Access JWT bắt buộc có `sid` của refresh-token family, `email_verified=true`, purpose access và thời hạn hợp lệ. API kiểm tra trạng thái phiên hiện tại; lỗi dependency không được bỏ qua kiểm tra.
- `POST /api/users/internal/sessions/authorize` và `POST /internal/project-access/authorize` chỉ phục vụ service nội bộ, bị chặn qua Kong.
- Avatar presign yêu cầu thêm `sizeBytes`, trả `uploadId`. Sau PUT gọi `POST /api/users/me/profile/avatar/confirm` với `{ uploadId }`. Chỉ URL đã xác nhận cho đúng user mới được lưu vào profile.
- API preview/download vẫn trả `{ url }`, nhưng URL trình duyệt trỏ tới backend `/api/documents/public/content?ticket=...`. Ticket có hạn 10 phút, gắn với session/quyền hiện tại và thế hệ link chia sẻ; không phải access JWT dùng cho API khác. URL tương đối được API client web chuẩn hóa theo gateway.
- Link EDITOR cũ chỉ còn cho phép xem. Owner hoặc editor đích danh đã đăng nhập và xác minh email mới sửa và xem lịch sử. Guest/viewer chỉ xem bản hiện tại.
- Public profile không trả phoneNumber, dob hoặc hasPassword; self-profile vẫn có dữ liệu cần cho trang Settings.

## Local regression verification

Cookie-based refresh/logout require the configured frontend origin. Set
`FRONTEND_URL` in the User JVM environment as described in
[local environment configuration](local-env.md). A browser request from another
origin is rejected before its refresh cookie can rotate or revoke a session.

Kafka readiness tracks failed handlers by topic and partition. A successful
record on another partition does not clear an outstanding failure; recovery or
durable quarantine clears the corresponding partition. Rebalancing/shutdown
clears revoked assignments and reports not-ready until the consumer rejoins.
Invalid task-sync payloads use durable quarantine just like profile events.
Transient Notification failures remain retriable and do not expose provider
exception bodies through the framework logger. Document/Chat S3 failures also
log operation names without raw provider exceptions or object keys.

The RAG worker authenticates before decoding JSON; Speech rejects missing or
weak key configuration at both startup and its protected request boundary.
Frontend storage downloads/open actions only accept HTTP(S) URLs without
embedded credentials, or a validated private storage reference.

The reusable [security integration suite](../backend/security-tests/README.md) runs
the real User HTTP API, receiver credential checks, permission services, Kong,
Socket.IO and Kafka failure/recovery tests against isolated infrastructure. Its
source inventory reports HTTP/Kafka/socket declarations and the 16 caller edges.
The README distinguishes real dependencies, stubs and untested flows. Passing
these tests does not mark the browser checklist below as completed or certify
every route, consumer or production environment.

## Checklist trình duyệt

- [ ] Đăng ký mới → gửi OTP → xác nhận → đăng nhập. Sai/hết hạn/dùng lại OTP bị chặn; chưa xác minh không login/refresh được. Tài khoản cũ chưa xác minh vẫn có flow xác minh/khôi phục.
- [ ] Đăng nhập A và B ở hai browser profile. A không đọc/sửa tài nguyên riêng B bằng cách đổi ID/header; guest không gọi được API protected.
- [ ] Tạo, đổi tên, archive project; thêm/xóa thành viên và accept invitation: Calendar cập nhật danh sách project. Task/comment/checklist không kích hoạt query chuẩn bị Documents hoặc detail project khác.
- [ ] Tạo task trong channel → View Detail, mở Documents/picker/channel/thread và retry sync. Để mở ít nhất 60 giây, không có chuỗi request tự lặp tới 429; tab thứ hai vẫn nhận cập nhật.
- [ ] B mở nhiều tab Chat, A kick B hoặc B leave: B không nhận message mới hoặc gọi được API phòng. Với project-space, dừng job sync để xác nhận quyền cũ không tiếp tục cấp quyền Chat/Document.
- [ ] Logout/revoke phiên B: HTTP và socket của phiên B bị từ chối; phiên A còn hợp lệ. Đổi/reset mật khẩu thu hồi các phiên theo flow; token cũ hoặc thiếu claim không dùng được.
- [ ] B star file được chia sẻ, A thu hồi share: file và metadata không còn trong Starred/shared/search; URL xem/tải cũ bị chặn cho request mới.
- [ ] Guest xem/tải khi link bật, không rename/upload/tạo version hoặc xem lịch sử. Viewer đã login cũng không có lịch sử. Owner/editor đích danh vẫn thao tác bình thường.
- [ ] Tắt link, thử URL đã cấp trước đó bằng GET/HEAD/Range. Bật lại link, URL thuộc thế hệ cũ vẫn bị chặn; lấy URL mới thì dùng được. Kiểm tra ZIP không chứa file đã archive.
- [ ] Avatar ảnh hợp lệ thành công; HTML/SVG, giả MIME, bytes hỏng, quá dung lượng/kích thước và uploadId/URL của user khác đều bị chặn.
- [ ] Web Push ngoài allowlist, private address, port khác 443 hoặc keys sai bị chặn; delivery không làm treo thông báo trong ứng dụng. User khác không thay subscription nếu không chứng minh được quyền sở hữu key của subscription.
- [ ] Profile B nhìn từ A không có phoneNumber/dob/hasPassword; Settings của B vẫn hoạt động. Đổi tài khoản không hiển thị cache tài khoản trước.
- [ ] Log Kong không chứa Authorization/Cookie/Set-Cookie, query token, service key hoặc chữ ký URL. Kiểm tra log lỗi provider mà không sao chép credential ra báo cáo.

## Giới hạn chuyển đổi

URL S3 đã cấp trước khi triển khai có thể còn sống tới TTL cũ (mặc định tối đa một giờ ở luồng document trình duyệt). Chỉ xác nhận thu hồi tức thời sau khi hết cửa sổ đó hoặc đã xử lý bằng storage policy phù hợp. Không thể thu hồi file/bytes đã tải trước khi thu hồi quyền.

Log cũ và credential từng xuất hiện trong log cần được xử lý theo quy trình vận hành riêng. Thay đổi source này không xóa log, xoay key hoặc deploy production.

Kong dùng JSON file-log đã loại bỏ headers/query và giữ request ID, status, latency. Raw Nginx proxy access/error log được tắt vì chúng có thể in nguyên request URI chứa ticket; lỗi ứng dụng và startup vẫn kiểm tra qua log service tương ứng. Cần rebuild/recreate gateway để cấu hình image/environment này có hiệu lực, chỉ restart gateway cũ không cập nhật image.

## Commit message gợi ý

```text
fix(auth): enforce verified identities and revoke sessions across services
fix(documents): enforce scoped sharing and revocable content downloads
fix(security): harden uploads logging push delivery and realtime caches
```
